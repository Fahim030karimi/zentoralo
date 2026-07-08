import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Einstellungen > Konten - Google-Konto verknuepfen (Gmail-Scan fuer Rechnungen, Phase 1).
// Reiner OAuth2-Flow per fetch gegen Googles REST-Endpunkte, bewusst ohne zusaetzliche
// npm-Dependency (googleapis), um das Backend schlank zu halten.
//
// Benoetigte Render-Umgebungsvariablen (Backend-Service):
//   GOOGLE_CLIENT_ID      - aus der Google Cloud Console (OAuth-Client, Typ "Webanwendung")
//   GOOGLE_CLIENT_SECRET  - dito
//   GOOGLE_REDIRECT_URI   - muss exakt als "Autorisierte Weiterleitungs-URI" im OAuth-Client
//                           hinterlegt sein, z.B. https://zentoralo-backend.onrender.com/api/google/callback
// Ohne diese drei Variablen gibt /connect einen klaren 503-Fehler zurueck statt zu crashen.

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

function googleEnvReady() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI
  );
}

function frontendBaseUrl() {
  const first = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",")[0].trim();
  return first || "http://localhost:5173";
}

async function ensureGoogleAccount() {
  const { rows } = await pool.query("SELECT * FROM google_accounts ORDER BY id DESC LIMIT 1");
  return rows[0] || null;
}

router.get("/status", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const acc = await ensureGoogleAccount();
  if (!acc) return res.json({ connected: false });
  res.json({ connected: true, email: acc.email, connectedAt: acc.connected_at });
});

// GET /api/google/connect - vollstaendiger Browser-Redirect (kein fetch!) zum Google
// Consent-Screen. access_type=offline + prompt=consent erzwingen einen refresh_token,
// auch wenn der Nutzer die App schon einmal autorisiert hatte.
router.get("/connect", (_req, res) => {
  if (!googleEnvReady()) {
    return res
      .status(503)
      .send(
        "Google-Verbindung ist noch nicht konfiguriert. GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET und GOOGLE_REDIRECT_URI fehlen als Umgebungsvariablen im Backend."
      );
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/google/callback - Google leitet den Browser hierher zurueck mit ?code=...
router.get("/callback", async (req, res) => {
  const frontend = frontendBaseUrl();
  if (!pool) return res.redirect(`${frontend}/einstellungen/konten?google=error&reason=no-db`);
  if (!googleEnvReady()) {
    return res.redirect(`${frontend}/einstellungen/konten?google=error&reason=not-configured`);
  }
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`${frontend}/einstellungen/konten?google=error&reason=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(`${frontend}/einstellungen/konten?google=error&reason=missing-code`);
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google Token-Austausch fehlgeschlagen:", tokenData);
      return res.redirect(`${frontend}/einstellungen/konten?google=error&reason=token-exchange`);
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    const expiry = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Vorheriges verknuepftes Konto ersetzen (Singleton) - additiv im Sinne von "nie
    // Kundendaten verlieren" ist hier nicht relevant, da es sich um eigene OAuth-Tokens
    // handelt, keine Geschaeftsdaten.
    await pool.query("DELETE FROM google_accounts");
    await pool.query(
      `INSERT INTO google_accounts (email, access_token, refresh_token, scope, token_expiry)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userData.email || "unbekannt",
        tokenData.access_token,
        tokenData.refresh_token || null,
        tokenData.scope || null,
        expiry,
      ]
    );

    res.redirect(`${frontend}/einstellungen/konten?google=connected`);
  } catch (err) {
    console.error("Google OAuth Callback Fehler:", err);
    res.redirect(`${frontend}/einstellungen/konten?google=error&reason=unexpected`);
  }
});

router.post("/disconnect", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  await pool.query("DELETE FROM google_accounts");
  res.status(204).end();
});

export default router;
