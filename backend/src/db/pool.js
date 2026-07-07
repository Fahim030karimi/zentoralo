import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Wird erst benoetigt, sobald eine Render-Postgres-Instanz existiert (DATABASE_URL gesetzt).
// Bis dahin bleibt der Pool ungenutzt - Routen, die ihn brauchen, geben ohne DATABASE_URL
// eine klare Fehlermeldung statt eines kryptischen Absturzes zurueck.
export const pool = process.env.DATABASE_URL
  ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  })
    : null;

export function requireDb() {
    if (!pool) {
          throw new Error(
                  "DATABASE_URL ist nicht gesetzt. Bitte Render-Postgres verknuepfen (siehe DEPLOYMENT.md)."
                );
    }
    return pool;
}
