import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// Einstellungen > Storedaten & App-Einstellungen. store_profile ist die Singleton-Quelle
// fuer Ziel-Wareneinsatz/Verlustaufschlag - loest den bisher rein clientseitigen
// SettingsContext-Zustand ab.

async function ensureStore() {
  const { rows } = await pool.query("SELECT * FROM store_profile ORDER BY id ASC LIMIT 1");
  if (rows[0]) return rows[0];
  const inserted = await pool.query(
    "INSERT INTO store_profile (store_name) VALUES ('Zentoralo Gastro Hub') RETURNING *"
  );
  return inserted.rows[0];
}

router.get("/", async (_req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  res.json(await ensureStore());
});

router.put("/", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const store = await ensureStore();
  const {
    store_name,
    address,
    target_food_cost_percent,
    loss_surcharge_percent,
    backup_frequency,
  } = req.body;
  const { rows } = await pool.query(
    `UPDATE store_profile SET
       store_name = COALESCE($1, store_name),
       address = COALESCE($2, address),
       target_food_cost_percent = COALESCE($3, target_food_cost_percent),
       loss_surcharge_percent = COALESCE($4, loss_surcharge_percent),
       backup_frequency = COALESCE($5, backup_frequency),
       updated_at = now()
     WHERE id = $6 RETURNING *`,
    [store_name, address, target_food_cost_percent, loss_surcharge_percent, backup_frequency, store.id]
  );
  res.json(rows[0]);
});

export default router;
