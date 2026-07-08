import express from "express";
import cors from "cors";
import session from "express-session";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import employeesRouter from "./routes/employees.js";
import timetrackingRouter from "./routes/timetracking.js";
import inventoryRouter from "./routes/inventory.js";
import financeRouter from "./routes/finance.js";
import invoicesRouter from "./routes/invoices.js";
import cashbookRouter from "./routes/cashbook.js";
import bankaccountsRouter from "./routes/bankaccounts.js";
import upcomingRouter from "./routes/upcoming.js";
import accountRouter from "./routes/account.js";
import storeRouter from "./routes/store.js";
import googleRouter, { scanInvoicesForAccount } from "./routes/google.js";
import { pool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Erlaubte Frontend-Origins. FRONTEND_ORIGIN kann eine Komma-getrennte Liste sein,
// damit sowohl die finale Domain (zentoralo.com) als auch die Render-Vorschau-URL
// (zentoralo-frontend.onrender.com) gleichzeitig funktionieren, ohne den Code bei
// jeder DNS-Umstellung anfassen zu muessen.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin nicht erlaubt: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Tage
    },
  })
);

// Health-Check - fuer Render und fuer schnelle manuelle Verifikation
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "zentoralo-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/timetracking", timetrackingRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/finance", financeRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/cashbook", cashbookRouter);
app.use("/api/bankaccounts", bankaccountsRouter);
app.use("/api/upcoming", upcomingRouter);
app.use("/api/account", accountRouter);
app.use("/api/store", storeRouter);
app.use("/api/google", googleRouter);

runMigrations(pool).finally(() => {
  app.listen(PORT, () => {
    console.log(`Zentoralo backend listening on port ${PORT}`);
  });

  // Stuendlicher Hintergrund-Scan der Gmail-Rechnungen (Einstellungen > Konten).
  // Laeuft nur, solange der Prozess aktiv ist - der Free-Tier-Service von Render
  // schlaeft bei Inaktivitaet ein, dann uebernimmt beim naechsten Seitenaufruf
  // wieder der manuelle "Aktualisieren"-Button auf der Rechnungen-Seite.
  setInterval(() => {
    scanInvoicesForAccount().catch((err) =>
      console.error("Automatischer Rechnungsscan fehlgeschlagen:", err.message)
    );
  }, 60 * 60 * 1000);
});
