import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Alle Routen: solange kein Login im Frontend verdrahtet ist, absichtlich ohne
// requireAuth nutzbar (MVP). TODO Phase 4 (Rest): requireAuth + Filter nach
// eingeloggtem Inhaber ergaenzen, sobald Login-UI existiert.

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { rows } = await pool.query(
    "SELECT * FROM employees ORDER BY active DESC, name ASC"
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { name, role, hourly_wage } = req.body;
  if (!name) return res.status(400).json({ error: "Name ist erforderlich." });
  const { rows } = await pool.query(
    "INSERT INTO employees (name, role, hourly_wage) VALUES ($1, $2, $3) RETURNING *",
    [name, role || "service", hourly_wage || 0]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { name, role, hourly_wage, active } = req.body;
  const { rows } = await pool.query(
    `UPDATE employees SET
       name = COALESCE($1, name),
       role = COALESCE($2, role),
       hourly_wage = COALESCE($3, hourly_wage),
       active = COALESCE($4, active)
     WHERE id = $5 RETURNING *`,
    [name, role, hourly_wage, active, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Mitarbeiter nicht gefunden." });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  await pool.query("DELETE FROM employees WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
