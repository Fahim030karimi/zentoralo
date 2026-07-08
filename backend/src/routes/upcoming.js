import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Finanzen > 5. Cashflow & Liquidität - anstehende Großbuchungen/Fixkosten.

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { rows } = await pool.query(
    "SELECT * FROM upcoming_transactions ORDER BY expected_date ASC LIMIT 100"
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { expected_date, category, transaction_type, priority, amount } = req.body;
  if (!expected_date || !category) {
    return res.status(400).json({ error: "expected_date und category sind erforderlich." });
  }
  const { rows } = await pool.query(
    `INSERT INTO upcoming_transactions (expected_date, category, transaction_type, priority, amount)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [expected_date, category, transaction_type || "expense", priority || "mittel", amount || 0]
  );
  res.status(201).json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  await pool.query("DELETE FROM upcoming_transactions WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
