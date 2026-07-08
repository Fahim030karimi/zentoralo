import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Finanzen > 4. Tresor & Kassenbestand. cash_state ist eine Singleton-Zeile mit den
// Live-Salden, cash_movements das chronologische Kassenbuch (Kassenstürze, Transits).

async function ensureCashState() {
  const { rows } = await pool.query("SELECT * FROM cash_state ORDER BY id ASC LIMIT 1");
  if (rows[0]) return rows[0];
  const inserted = await pool.query(
    "INSERT INTO cash_state (main_safe_balance, circulating_balance, change_reserve) VALUES (0, 0, 0) RETURNING *"
  );
  return inserted.rows[0];
}

router.get("/state", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  res.json(await ensureCashState());
});

router.put("/state", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const state = await ensureCashState();
  const { main_safe_balance, circulating_balance, change_reserve } = req.body;
  const { rows } = await pool.query(
    `UPDATE cash_state SET
       main_safe_balance = COALESCE($1, main_safe_balance),
       circulating_balance = COALESCE($2, circulating_balance),
       change_reserve = COALESCE($3, change_reserve),
       updated_at = now()
     WHERE id = $4 RETURNING *`,
    [main_safe_balance, circulating_balance, change_reserve, state.id]
  );
  res.json(rows[0]);
});

router.get("/movements", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { rows } = await pool.query(
    "SELECT * FROM cash_movements ORDER BY movement_date DESC LIMIT 200"
  );
  res.json(rows);
});

router.post("/movements", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { movement_type, target_amount, actual_amount, note, responsible, movement_date } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO cash_movements
       (movement_type, target_amount, actual_amount, note, responsible, movement_date)
     VALUES ($1,$2,$3,$4,$5, COALESCE($6, now()))
     RETURNING *`,
    [
      movement_type || "zaehlung",
      target_amount ?? null,
      actual_amount ?? null,
      note || null,
      responsible || null,
      movement_date || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.delete("/movements/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  await pool.query("DELETE FROM cash_movements WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
