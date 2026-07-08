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

// ---------------------------------------------------------------------------
// Rechnungsscan: liest neue Gmail-Mails, laesst Claude (Anthropic API) Betrag,
// Lieferant, Rechnungsnr. etc. extrahieren und legt daraus Rechnungen an.
// Benoetigt zusaetzlich ANTHROPIC_API_KEY als Umgebungsvariable. Wird sowohl vom
// manuellen "Aktualisieren"-Button (POST /scan-invoices) als auch von einem
// stuendlichen Hintergrund-Timer in index.js aufgerufen.
// ---------------------------------------------------------------------------

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
// Bewusst OHNE "has:attachment": Erloes-/Auszahlungsberichte (z.B. Wolt/Lieferando/Uber Eats
// Payout-Reports) kommen oft als reiner HTML-Mailtext ohne PDF-Anhang. extractInvoiceWithAI
// liest in diesem Fall den Mailtext (emailText) statt eines PDFs - siehe scanInvoicesForAccount.
const INVOICE_QUERY =
  "(rechnung OR invoice OR quittung OR beleg OR auszahlung OR payout OR abrechnung OR gutschrift OR provisionsabrechnung) newer_than:90d";

function anthropicReady() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Erneuert den Access-Token ueber den gespeicherten Refresh-Token, falls er
// abgelaufen ist oder in den naechsten 2 Minuten ablaeuft.
async function refreshAccessToken(account) {
  const expiry = account.token_expiry ? new Date(account.token_expiry).getTime() : 0;
  const stillValid = expiry - Date.now() > 2 * 60 * 1000;
  if (stillValid) return account.access_token;
  if (!account.refresh_token) {
    throw new Error("Kein Refresh-Token vorhanden - bitte Google-Konto neu verbinden.");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error("Google-Token konnte nicht erneuert werden - bitte Konto neu verbinden.");
  }
  const newExpiry = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;
  await pool.query("UPDATE google_accounts SET access_token = $1, token_expiry = $2 WHERE id = $3", [
    data.access_token,
    newExpiry,
    account.id,
  ]);
  return data.access_token;
}

function base64UrlToBuffer(data) {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function findParts(payload, predicate, found = []) {
  if (!payload) return found;
  if (predicate(payload)) found.push(payload);
  if (payload.parts) {
    for (const part of payload.parts) findParts(part, predicate, found);
  }
  return found;
}

function headerValue(headers, name) {
  const h = (headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value || null;
}

// Ruft Claude mit dem Mailtext (und PDF-Anhang, falls vorhanden) auf und laesst
// strukturierte Rechnungsdaten als JSON extrahieren.
async function extractInvoiceWithAI({ pdfBase64, emailText, subject, from, dateHeader }) {
  const contentBlocks = [];
  if (pdfBase64) {
    contentBlocks.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
    });
  }
  contentBlocks.push({
    type: "text",
    text: `Betreff: ${subject || "-"}\nVon: ${from || "-"}\nDatum: ${dateHeader || "-"}\n\nE-Mail-Text:\n${(
      emailText || ""
    ).slice(0, 6000)}\n\nPruefe, ob dies eines der folgenden ist: (a) eine Kosten-Rechnung/Quittung/Beleg an uns, (b) eine eigene Erloes-Rechnung, oder (c) ein Auszahlungs-/Provisions-/Abrechnungsbericht einer Lieferplattform oder eines Zahlungsdienstleisters (z.B. Wolt, Lieferando, Uber Eats, Stripe, SumUp - diese zaehlen als Erloes/Einnahme). Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt (kein Markdown, kein Codefence) mit exakt diesen Feldern:\n{"is_invoice": boolean, "direction": "in"|"out", "partner": string|null, "category": string|null, "invoice_number": string|null, "invoice_date": "YYYY-MM-DD"|null, "due_date": "YYYY-MM-DD"|null, "amount_gross": number|null, "amount_net": number|null, "vat_rate": number|null, "note": string|null}\ndirection ist "in" wenn es eine Kosten-Rechnung an uns ist, "out" wenn es sich um eigene Erloese handelt (eigene Rechnung ODER Auszahlungs-/Payout-Bericht einer Plattform). Bei Auszahlungsberichten: amount_gross/amount_net = der ausgezahlte bzw. abgerechnete Betrag, category = "Erloes Lieferplattform" o.ae. Wenn du dir bei einem Feld nicht sicher bist, setze null. Wenn dies klar KEINE Rechnung/Kein Beleg/Kein Auszahlungsbericht ist (z.B. Newsletter, Werbung, Terminbestaetigung ohne Betrag), setze is_invoice auf false.`,
  });

  const res = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: contentBlocks }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Anthropic-API-Fehler");
  }
  const text = (data.content || []).map((b) => b.text || "").join("");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Keine JSON-Antwort von der KI erhalten.");
  return JSON.parse(jsonMatch[0]);
}

// Kernfunktion: durchsucht Gmail nach neuen Rechnungs-Mails, extrahiert sie per
// KI und legt sie als Rechnungen an. Wird von der Route weiter unten UND vom
// stuendlichen Timer in index.js aufgerufen - deshalb exportiert, kein direkter
// Zugriff auf req/res.
export async function scanInvoicesForAccount() {
  if (!pool) return { connected: false, error: "Datenbank ist noch nicht verbunden." };
  const account = await ensureGoogleAccount();
  if (!account) return { connected: false, scanned: 0, imported: 0, skipped: 0 };
  if (!googleEnvReady()) {
    return {
      connected: true,
      error: "Google-Verbindung ist im Backend noch nicht konfiguriert.",
      scanned: 0,
      imported: 0,
      skipped: 0,
    };
  }
  if (!anthropicReady()) {
    return {
      connected: true,
      error: "ANTHROPIC_API_KEY fehlt im Backend - KI-Auswertung ist nicht moeglich.",
      scanned: 0,
      imported: 0,
      skipped: 0,
    };
  }

  let accessToken;
  try {
    accessToken = await refreshAccessToken(account);
  } catch (err) {
    return { connected: true, error: err.message, scanned: 0, imported: 0, skipped: 0 };
  }

  const listRes = await fetch(`${GMAIL_API}/messages?q=${encodeURIComponent(INVOICE_QUERY)}&maxResults=25`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const listData = await listRes.json();
  if (!listRes.ok) {
    return {
      connected: true,
      error: listData?.error?.message || "Gmail-Suche fehlgeschlagen.",
      scanned: 0,
      imported: 0,
      skipped: 0,
    };
  }
  const messages = listData.messages || [];
  if (messages.length === 0) {
    return { connected: true, scanned: 0, imported: 0, skipped: 0 };
  }

  // Bereits importierte Mails vorab herausfiltern, damit keine unnoetigen (kostenpflichtigen)
  // KI-Aufrufe fuer schon bekannte Nachrichten gemacht werden.
  const ids = messages.map((m) => m.id);
  const { rows: already } = await pool.query(
    "SELECT source_message_id FROM invoices WHERE source_message_id = ANY($1)",
    [ids]
  );
  const alreadyImported = new Set(already.map((r) => r.source_message_id));

  let imported = 0;
  let scanned = 0;
  let skipped = 0;

  for (const msg of messages) {
    if (alreadyImported.has(msg.id)) continue;
    scanned++;
    try {
      const msgRes = await fetch(`${GMAIL_API}/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const msgData = await msgRes.json();
      if (!msgRes.ok) {
        skipped++;
        continue;
      }

      const headers = msgData.payload?.headers || [];
      const subject = headerValue(headers, "Subject");
      const from = headerValue(headers, "From");
      const dateHeader = headerValue(headers, "Date");

      const pdfParts = findParts(
        msgData.payload,
        (p) => p.mimeType === "application/pdf" && p.body?.attachmentId
      );
      let pdfBase64 = null;
      if (pdfParts.length > 0) {
        const attRes = await fetch(
          `${GMAIL_API}/messages/${msg.id}/attachments/${pdfParts[0].body.attachmentId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const attData = await attRes.json();
        if (attRes.ok && attData.data) {
          pdfBase64 = attData.data.replace(/-/g, "+").replace(/_/g, "/");
        }
      }

      let emailText = "";
      const textParts = findParts(msgData.payload, (p) => p.mimeType === "text/plain" && p.body?.data);
      if (textParts.length > 0) {
        emailText = base64UrlToBuffer(textParts[0].body.data).toString("utf-8");
      } else if (!pdfBase64 && msgData.snippet) {
        emailText = msgData.snippet;
      }

      const extracted = await extractInvoiceWithAI({ pdfBase64, emailText, subject, from, dateHeader });
      if (!extracted.is_invoice) {
        skipped++;
        continue;
      }

      const fallbackDate = msgData.internalDate
        ? new Date(Number(msgData.internalDate)).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      const { rows } = await pool.query(
        `INSERT INTO invoices
           (direction, partner, category, invoice_number, invoice_date, due_date,
            amount_gross, amount_net, vat_rate, status, note, source, source_message_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'offen',$10,'gmail-scan',$11)
         ON CONFLICT (source_message_id) DO NOTHING
         RETURNING id`,
        [
          extracted.direction === "out" ? "out" : "in",
          extracted.partner || from || "Unbekannt",
          extracted.category || null,
          extracted.invoice_number || null,
          extracted.invoice_date || fallbackDate,
          extracted.due_date || null,
          extracted.amount_gross ?? 0,
          extracted.amount_net ?? extracted.amount_gross ?? 0,
          extracted.vat_rate ?? 19,
          extracted.note || `Automatisch aus Gmail importiert: "${subject || "(ohne Betreff)"}"`,
          msg.id,
        ]
      );
      if (rows[0]) imported++;
      else skipped++;
    } catch (err) {
      console.error(`Fehler beim Scannen von Mail ${msg.id}:`, err.message);
      skipped++;
    }
  }

  return { connected: true, scanned, imported, skipped: skipped + alreadyImported.size };
}

router.post("/scan-invoices", async (_req, res) => {
  const result = await scanInvoicesForAccount();
  if (result.error) return res.status(503).json(result);
  res.json(result);
});

export default router;
