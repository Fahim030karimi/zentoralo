import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Finanzen > 5. Cashflow & Liquidität - angebundene Geschäftskonten + Prognose-Buchungen.

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { rows } = await pool.query("SELECT * FROM bank_accounts ORDER BY id ASC");
  res.json(rows);
});

router.post("/", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { name, iban, purpose, balance } = req.body;
  if (!name) return res.status(400).json({ error: "Name ist erforderlich." });
  const { rows } = await pool.query(
    "INSERT INTO bank_accounts (name, iban, purpose, balance) VALUES ($1,$2,$3,$4) RETURNING *",
    [name, iban || null, purpose || null, balance || 0]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { name, iban, purpose, balance } = req.body;
  const { rows } = await pool.query(
    `UPDATE bank_accounts SET
       name = COALESCE($1, name),
       iban = COALESCE($2, iban),
       purpose = COALESCE($3, purpose),
       balance = COALESCE($4, balance),
       updated_at = now()
     WHERE id = $5 RETURNING *`,
    [name, iban, purpose, balance, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Konto nicht gefunden." });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  await pool.query("DELETE FROM bank_accounts WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
