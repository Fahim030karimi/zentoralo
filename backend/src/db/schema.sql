-- Zentoralo Datenbank-Schema
--
-- WICHTIGES PRINZIP (nie aendern!): Alle Migrationen sind additiv.
-- Nur CREATE TABLE IF NOT EXISTS und ADD COLUMN IF NOT EXISTS.
-- Niemals DROP, TRUNCATE oder destruktives ALTER auf Tabellen mit echten Kundendaten.
-- Grund: explizite Kundenvorgabe - Updates duerfen nie zu Datenverlust fuehren.

-- Phase 0: Fundament (Login/Rollen)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'inhaber',
    company_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    owner_user_id INTEGER NOT NULL REFERENCES users(id),
    target_food_cost_percent NUMERIC NOT NULL DEFAULT 25,
    loss_surcharge_percent NUMERIC NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

-- Ab hier folgen in spaeteren Phasen weitere Tabellen (additiv anhaengen, nie diese
-- Datei rueckwirkend destruktiv aendern):
-- Phase 1 (Rechnungen): google_accounts, invoices, invoice_items
-- Phase 2 (Betrieb): order_lists, order_list_items, article_units, stock_counts, stock_targets, supplier_offers
-- Phase 3 (Rezepte): recipes, recipe_ingredients, daily_production
-- Phase 4 (Team): time_entries, employee_availability, time_off_requests, shifts, hr_documents
-- Phase 5 (Sonstiges): news_items
