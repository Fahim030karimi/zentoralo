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

-- Phase 6 MVP: Finanzen-Deep-Dive (Rechnungen, Tresor/Kassenbuch, Cashflow) sowie
-- Konten-/Store-Profil fuer die neue Einstellungen-Struktur. Noch ohne owner_user_id -
-- TODO: sobald echtes Login im Frontend verdrahtet ist, hier auf Mandantentrennung umstellen.

-- 2. Rechnungen (In & Out) - Lieferanten-Kosten und eigene Erloes-Rechnungen
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  direction TEXT NOT NULL DEFAULT 'in', -- 'in' = Kosten/Eingang, 'out' = Erloes/Ausgang
  partner TEXT NOT NULL,
  category TEXT,
  invoice_number TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  amount_gross NUMERIC NOT NULL DEFAULT 0,
  amount_net NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 19,
  status TEXT NOT NULL DEFAULT 'offen', -- 'offen' | 'bezahlt' | 'ueberfaellig'
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tresor & Kassenbestand - Live-Salden (Singleton-Zeile) + chronologisches Kassenbuch
CREATE TABLE IF NOT EXISTS cash_state (
  id SERIAL PRIMARY KEY,
  main_safe_balance NUMERIC NOT NULL DEFAULT 0,
  circulating_balance NUMERIC NOT NULL DEFAULT 0,
  change_reserve NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id SERIAL PRIMARY KEY,
  movement_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  movement_type TEXT NOT NULL DEFAULT 'zaehlung', -- 'zaehlung' | 'transit'
  target_amount NUMERIC,
  actual_amount NUMERIC,
  note TEXT,
  responsible TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Cashflow & Liquiditaet - angebundene Konten + erwartete Grossbuchungen
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  iban TEXT,
  purpose TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS upcoming_transactions (
  id SERIAL PRIMARY KEY,
  expected_date DATE NOT NULL,
  category TEXT NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'expense', -- 'income' | 'expense'
  priority TEXT NOT NULL DEFAULT 'mittel', -- 'niedrig' | 'mittel' | 'hoch'
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Einstellungen: Konto-Profil (Login-Daten des Inhabers) und Store-Profil (Stammdaten +
-- Controlling-Vorgaben). Bewusst als Singleton (eine Zeile) angelegt, bis echtes
-- Multi-User-Login existiert.
CREATE TABLE IF NOT EXISTS account_profile (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'Geschäftsleitung',
  email TEXT NOT NULL DEFAULT 'inhaber@zentoralo.com',
  password_hash TEXT,
  phone TEXT,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_profile (
  id SERIAL PRIMARY KEY,
  store_name TEXT NOT NULL DEFAULT 'Zentoralo Gastro Hub',
  address TEXT,
  target_food_cost_percent NUMERIC NOT NULL DEFAULT 25,
  loss_surcharge_percent NUMERIC NOT NULL DEFAULT 2,
  backup_frequency TEXT NOT NULL DEFAULT 'stuendlich',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
