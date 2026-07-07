import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fuehrt schema.sql beim Start aus. Sicher, weil schema.sql nur additive
// Statements enthaelt (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
// So bekommt jede neue Tabelle automatisch bei jedem Deploy ihre Struktur,
// ohne dass manuell eine Migration von Hand ausgefuehrt werden muss.
export async function runMigrations(pool) {
  if (!pool) {
    console.log("Kein DATABASE_URL gesetzt - Migration wird uebersprungen.");
    return;
  }
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = readFileSync(schemaPath, "utf-8");
  try {
    await pool.query(sql);
    console.log("Datenbank-Schema erfolgreich geprueft/aktualisiert.");
  } catch (err) {
    console.error("Fehler beim Ausfuehren der Migration:", err.message);
  }
}
