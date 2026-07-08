import { Router } from "express";
import bcrypt from "bcrypt";
import { pool } from "../db/pool.js";

const router = Router();

// Einstellungen > Profil & Sicherheit. account_profile ist bewusst eine Singleton-Zeile
// (ein Inhaber-Konto), bis echtes Multi-User-Login existiert - TODO Phase 0 (Rest):
// sobald Login-UI da ist, hier auf req.session.userId umstellen.

async function ensureAccount() {
  const { rows } = await pool.query("SELECT * FROM account_profile ORDER BY id ASC LIMIT 1");
  if (rows[0]) return rows[0];
  const inserted = await pool.query(
    "INSERT INTO account_profile (full_name, email) VALUES ('Geschäftsleitung', 'inhaber@zentoralo.com') RETURNING *"
  );
  return inserted.rows[0];
}

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const acc = await ensureAccount();
  delete acc.password_hash;
  res.json(acc);
});

router.put("/profile", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const acc = await ensureAccount();
  const { full_name, email, phone } = req.body;
  if (email !== undefined && !email.includes("@")) {
    return res.status(400).json({ error: "Bitte eine gültige E-Mail-Adresse angeben." });
  }
  const { rows } = await pool.query(
    `UPDATE account_profile SET
       full_name = COALESCE($1, full_name),
       email = COALESCE($2, email),
       phone = COALESCE($3, phone),
       updated_at = now()
     WHERE id = $4 RETURNING *`,
    [full_name, email, phone, acc.id]
  );
  const updated = rows[0];
  delete updated.password_hash;
  res.json(updated);
});

router.put("/password", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const acc = await ensureAccount();
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "Neues Passwort muss mindestens 8 Zeichen haben." });
  }
  if (acc.password_hash) {
    const ok = currentPassword && (await bcrypt.compare(currentPassword, acc.password_hash));
    if (!ok) {
      return res.status(401).json({ error: "Aktuelles Passwort ist falsch." });
    }
  }
  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    "UPDATE account_profile SET password_hash = $1, updated_at = now() WHERE id = $2",
    [newHash, acc.id]
  );
  res.json({ ok: true });
});

router.put("/security", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const acc = await ensureAccount();
  const { two_factor_enabled } = req.body;
  const { rows } = await pool.query(
    "UPDATE account_profile SET two_factor_enabled = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [!!two_factor_enabled, acc.id]
  );
  const updated = rows[0];
  delete updated.password_hash;
  res.json(updated);
});

export default router;
