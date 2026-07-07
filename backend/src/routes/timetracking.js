import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Zeiterfassung: manuelle Eintraege (Datum + Stunden) pro Mitarbeiter.
// TODO Phase 4 (Rest): echte Stempeluhr (Clock-in/Clock-out) statt manueller Eingabe.

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { rows } = await pool.query(
    `SELECT t.*, e.name AS employee_name, e.hourly_wage
     FROM time_entries t
     JOIN employees e ON e.id = t.employee_id
     ORDER BY t.work_date DESC, t.id DESC
     LIMIT 200`
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { employee_id, work_date, hours, note } = req.body;
  if (!employee_id || !work_date || !hours) {
    return res.status(400).json({ error: "employee_id, work_date und hours sind erforderlich." });
  }
  const { rows } = await pool.query(
    "INSERT INTO time_entries (employee_id, work_date, hours, note) VALUES ($1, $2, $3, $4) RETURNING *",
    [employee_id, work_date, hours, note || null]
  );
  res.status(201).json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  await pool.query("DELETE FROM time_entries WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
