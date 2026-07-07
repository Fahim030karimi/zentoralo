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
  role TEXT NOT NULL DEFAULT 'inhaber', -- 'inhaber' | 'mitarbeiter'
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
-- Phase 2 (Betrieb, MVP-Vorstufe unten schon als inventory_items angelegt): order_lists,
--   order_list_items, article_units, stock_counts, stock_targets, supplier_offers
-- Phase 3 (Rezepte): recipes, recipe_ingredients, daily_production
-- Phase 4 (Team, MVP-Vorstufe unten schon als employees/time_entries angelegt):
--   employee_availability, time_off_requests, shifts, hr_documents
-- Phase 5 (Sonstiges): news_items

-- Phase 4 MVP: einfache Personalverwaltung + Zeiterfassung (noch ohne Login-Bindung -
-- TODO: sobald Login im Frontend verdrahtet ist, hier owner_user_id ergaenzen und filtern)
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'service', -- 'service' | 'kueche' | 'leitung'
  hourly_wage NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  work_date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 2 MVP: einfaches Lager/Inventar (Vorstufe zu den vollen order_list/stock-Tabellen)
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'Stk',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phase 5 MVP: monatliche Kennzahlen fuer das Finanzen-Dashboard (Vorstufe zur vollen
-- Buchhaltungs-/Analyse-Anbindung)
CREATE TABLE IF NOT EXISTS monthly_finance (
  id SERIAL PRIMARY KEY,
  month DATE NOT NULL, -- immer der 1. des Monats, z.B. 2026-07-01
  revenue NUMERIC NOT NULL DEFAULT 0,
  food_cost NUMERIC NOT NULL DEFAULT 0,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  other_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month)
);
