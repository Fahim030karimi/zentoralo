import { Router } from "express";
import { pool } from "../db/pool.js";

// Zentrale-Dashboard > "Zenty" KI-Assistent. Beantwortet Fragen des Nutzers ausschliesslich
// auf Basis der echten, aktuell in der Datenbank vorhandenen Betriebsdaten (Monatszahlen,
// Rechnungen, Lagerbestand, anstehende Zahlungen) - kein Fake-Chat mehr, echte Anthropic-
// Anbindung wie beim Gmail-Rechnungsscan (google.js).
const router = Router();

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

function anthropicReady() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

router.post("/ask", async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Datenbank ist noch nicht verbunden." });
  const question = (req.body?.question || "").trim();
  if (!question) {
    return res.status(400).json({ error: "Frage darf nicht leer sein." });
  }
  if (!anthropicReady()) {
    return res.status(503).json({
      error: "ANTHROPIC_API_KEY fehlt im Backend - Zenty kann aktuell nicht antworten.",
    });
  }
  try {
    const [financeRes, invoicesRes, inventoryRes, upcomingRes] = await Promise.all([
      pool.query("SELECT * FROM monthly_finance ORDER BY month DESC LIMIT 6"),
      pool.query("SELECT * FROM invoices ORDER BY invoice_date DESC LIMIT 15"),
      pool.query("SELECT * FROM inventory_items ORDER BY name ASC"),
      pool.query("SELECT * FROM upcoming_transactions ORDER BY expected_date ASC LIMIT 10"),
    ]);
    const context = {
      monatszahlen: financeRes.rows.map((m) => ({
        monat: m.month,
        umsatz: Number(m.revenue),
        wareneinsatz: Number(m.food_cost),
        personalkosten: Number(m.labor_cost),
        sonstige_kosten: Number(m.other_cost),
      })),
      letzte_rechnungen: invoicesRes.rows.map((r) => ({
        partner: r.partner,
        betrag_brutto: Number(r.amount_gross),
        datum: r.invoice_date,
        kategorie: r.category,
        richtung: r.direction,
        status: r.status,
      })),
      lagerbestand_kritisch: inventoryRes.rows
        .filter((i) => Number(i.current_stock) < Number(i.min_stock))
        .map((i) => i.name),
      anstehende_buchungen: upcomingRes.rows.map((u) => ({
        kategorie: u.category,
        betrag: Number(u.amount),
        datum: u.expected_date,
        typ: u.transaction_type,
        prioritaet: u.priority,
      })),
    };

    const prompt = `Du bist "Zenty", der KI-Assistent im Gastro-Management-Tool Zentoralo. Beantworte die Frage des Nutzers kurz (max. 4 Saetze), konkret und auf Deutsch, ausschliesslich auf Basis der folgenden echten Betriebsdaten (als JSON). Wenn die Daten fuer die Frage nicht ausreichen, sag das ehrlich anstatt zu raten oder Zahlen zu erfinden.

Betriebsdaten:
${JSON.stringify(context)}

Frage: ${question}`;

    const aiRes = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await aiRes.json();
    if (!aiRes.ok) throw new Error(data?.error?.message || "Anthropic-API-Fehler");
    const answer = (data.content || []).map((b) => b.text || "").join("").trim();
    res.json({ answer: answer || "Ich konnte dazu leider keine Antwort erzeugen." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
