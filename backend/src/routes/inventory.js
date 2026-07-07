import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Lager/Inventar-MVP. TODO Phase 2 (Rest): automatischer Bestandsabgleich aus
// Rechnungspositionen (inventoryService) statt manueller Pflege.

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { rows } = await pool.query(
    "SELECT * FROM inventory_items ORDER BY category NULLS LAST, name ASC"
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { name, category, unit, current_stock, min_stock, price_per_unit } = req.body;
  if (!name) return res.status(400).json({ error: "Name ist erforderlich." });
  const { rows } = await pool.query(
    `INSERT INTO inventory_items (name, category, unit, current_stock, min_stock, price_per_unit)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, category || null, unit || "Stk", current_stock || 0, min_stock || 0, price_per_unit || 0]
  );
  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const { name, category, unit, current_stock, min_stock, price_per_unit } = req.body;
  const { rows } = await pool.query(
    `UPDATE inventory_items SET
       name = COALESCE($1, name),
       category = COALESCE($2, category),
       unit = COALESCE($3, unit),
       current_stock = COALESCE($4, current_stock),
       min_stock = COALESCE($5, min_stock),
       price_per_unit = COALESCE($6, price_per_unit)
     WHERE id = $7 RETURNING *`,
    [name, category, unit, current_stock, min_stock, price_per_unit, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Artikel nicht gefunden." });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  await pool.query("DELETE FROM inventory_items WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

export default router;
