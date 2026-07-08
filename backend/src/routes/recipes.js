import { Router } from "express";
import { pool } from "../db/pool.js";

// Store > Werkzeuge: echte Persistenz fuer den Rezeptur- & Margenrechner. Zutatenpreise
// werden beim Speichern aus inventory_items als Snapshot uebernommen (siehe schema.sql),
// damit gespeicherte Rezepte stabil bleiben, auch wenn sich Lagerpreise spaeter aendern.
const router = Router();

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank nicht verbunden." });
  try {
    const { rows: recipes } = await pool.query(
      "SELECT * FROM recipes ORDER BY created_at DESC"
    );
    const { rows: ingredients } = await pool.query(
      "SELECT * FROM recipe_ingredients ORDER BY id ASC"
    );
    const byRecipe = {};
    for (const ing of ingredients) {
      if (!byRecipe[ing.recipe_id]) byRecipe[ing.recipe_id] = [];
      byRecipe[ing.recipe_id].push(ing);
    }
    res.json(recipes.map((r) => ({ ...r, ingredients: byRecipe[r.id] || [] })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank nicht verbunden." });
  const { name, sale_price_gross, ingredients } = req.body;
  if (!name || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res
      .status(400)
      .json({ error: "Name und mindestens eine Zutat sind erforderlich." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "INSERT INTO recipes (name, sale_price_gross) VALUES ($1, $2) RETURNING *",
      [name, Number(sale_price_gross) || 0]
    );
    const recipe = rows[0];
    for (const ing of ingredients) {
      await client.query(
        `INSERT INTO recipe_ingredients
          (recipe_id, inventory_item_id, name_snapshot, unit, quantity, price_per_unit_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          recipe.id,
          ing.inventory_item_id || null,
          ing.name || "Zutat",
          ing.unit || "Stk",
          Number(ing.quantity) || 0,
          Number(ing.price_per_unit) || 0,
        ]
      );
    }
    await client.query("COMMIT");
    res.status(201).json(recipe);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank nicht verbunden." });
  try {
    await pool.query("DELETE FROM recipes WHERE id = $1", [req.params.id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
