import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Monatliche Kennzahlen fuer das Finanzen-Dashboard. TODO Phase 5 (Rest): echte
// Buchhaltungs-Anbindung + KI-Chatbot statt manueller Monatswerte.

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { rows } = await pool.query(
    "SELECT * FROM monthly_finance ORDER BY month DESC LIMIT 24"
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { month, revenue, food_cost, labor_cost, other_cost } = req.body;
  if (!month) return res.status(400).json({ error: "month ist erforderlich (z.B. 2026-07-01)." });
  const { rows } = await pool.query(
    `INSERT INTO monthly_finance (month, revenue, food_cost, labor_cost, other_cost)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (month) DO UPDATE SET
       revenue = EXCLUDED.revenue,
       food_cost = EXCLUDED.food_cost,
       labor_cost = EXCLUDED.labor_cost,
       other_cost = EXCLUDED.other_cost
     RETURNING *`,
    [month, revenue || 0, food_cost || 0, labor_cost || 0, other_cost || 0]
  );
  res.status(201).json(rows[0]);
});

export default router;
