import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Finanzen > 2. Rechnungen (In & Out). MVP ohne Login-Bindung, siehe employees.js.

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { rows } = await pool.query(
    "SELECT * FROM invoices ORDER BY invoice_date DESC, id DESC LIMIT 300"
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const {
    direction,
    partner,
    category,
    invoice_number,
    invoice_date,
    due_date,
    amount_gross,
    amount_net,
    vat_rate,
    status,
    note,
  } = req.body;
  if (!partner || !invoice_date) {
    return res.status(400).json({ error: "partner und invoice_date sind erforderlich." });
  }
  const { rows } = await pool.query(
    `INSERT INTO invoices
       (direction, partner, category, invoice_number, invoice_date, due_date,
        amount_gross, amount_net, vat_rate, status, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      direction || "in",
      partner,
      category || null,
      invoice_number || null,
      invoice_date,
      due_date || null,
      amount_gross || 0,
      amount_net || 0,
      vat_rate ?? 19,
      status || "offen",
      note || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { status, note } = req.body;
  const { rows } = await pool.query(
    `UPDATE invoices SET
       status = COALESCE($1, status),
       note = COALESCE($2, note)
     WHERE id = $3 RETURNING *`,
    [status, note, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Rechnung nicht gefunden." });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  await pool.query("DELETE FROM invoices WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
