import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { useSettings } from "../context/SettingsContext.jsx";

const eur = (value) =>
  `${Number(value || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// Zenty: echter KI-Chat ueber die Anthropic-API im Backend (/api/zenty/ask), der die
// tatsaechlichen Betriebsdaten (Umsatz, Rechnungen, Lager, anstehende Zahlungen) kennt -
// kein Demo-Platzhalter mehr.
function ZentyChat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  async function ask(e) {
    e.preventDefault();
    if (!question.trim() || asking) return;
    setAsking(true);
    setError("");
    setAnswer("");
    try {
      const res = await api.post("/api/zenty/ask", { question: question.trim() });
      setAnswer(res.answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-56">
      <div className="overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-xs shadow-indigo-500/50"></div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
            Zenty • Zentoralo Intelligenz
          </span>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 max-w-2xl leading-relaxed">
          {asking
            ? "Zenty schaut sich deine Zahlen an…"
            : error
            ? <span className="text-rose-600">{error}</span>
            : answer || (
                <>
                  👋 Hi Chef! Ich bin <span className="font-semibold text-indigo-600">Zenty</span>. Frag
                  mich etwas zu deinem Umsatz, deinen Rechnungen oder deinem Lager.
                </>
              )}
        </div>
      </div>
      <form onSubmit={ask} className="flex gap-3 border-t border-slate-100 pt-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Frag Zenty etwas…"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 premium-transit text-slate-800"
        />
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="premium-transit bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-xs"
        >
          {asking ? "…" : "Fragen"}
        </button>
      </form>
    </div>
  );
}

export default function Zentrale() {
  const { targetFoodCost } = useSettings();
  const [range, setRange] = useState("heute");
  const [financeRows, setFinanceRows] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/finance").catch(() => []),
      api.get("/api/inventory").catch(() => []),
      api.get("/api/invoices").catch(() => []),
      api.get("/api/upcoming").catch(() => []),
    ])
      .then(([finance, inventory, invoiceRows, upcomingRows]) => {
        setFinanceRows(finance);
        setLowStock(inventory.filter((it) => Number(it.current_stock) < Number(it.min_stock)));
        setInvoices(invoiceRows);
        setUpcoming(upcomingRows);
      })
      .finally(() => setLoading(false));
  }, []);

  const latest = financeRows[0];
  const previous = financeRows[1];
  const revenue = latest ? Number(latest.revenue) : 0;
  const foodCost = latest ? Number(latest.food_cost) : 0;
  const laborCost = latest ? Number(latest.labor_cost) : 0;
  const otherCost = latest ? Number(latest.other_cost) : 0;
  const netProfit = revenue - foodCost - laborCost - otherCost;
  const margin = revenue > 0 ? ((revenue - foodCost) / revenue) * 100 : 0;
  const revenueChangePct =
    latest && previous && Number(previous.revenue) > 0
      ? ((revenue - Number(previous.revenue)) / Number(previous.revenue)) * 100
      : null;
  const foodCostPct = revenue > 0 ? (foodCost / revenue) * 100 : 0;

  const recentGmailInvoices = useMemo(
    () =>
      invoices
        .filter((i) => i.source === "gmail-scan")
        .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date))
        .slice(0, 4),
    [invoices]
  );

  const upcomingNext = useMemo(
    () =>
      upcoming
        .filter((u) => new Date(u.expected_date) >= new Date(new Date().toDateString()))
        .slice(0, 4),
    [upcoming]
  );

  const overdueInvoices = useMemo(
    () =>
      invoices.filter(
        (i) =>
          i.direction === "in" &&
          i.status !== "bezahlt" &&
          i.due_date &&
          new Date(i.due_date) < new Date()
      ),
    [invoices]
  );

  const highPriorityUpcoming = useMemo(
    () => upcoming.filter((u) => u.priority === "hoch"),
    [upcoming]
  );

  // Betriebs-Index: einfache, echte Heuristik aus vorhandenen Daten (kein Fake-Wert) -
  // 100 Basispunkte, Abzuege bei Wareneinsatz ueber Ziel und bei Mindestbestand-
  // Unterschreitungen. TODO Phase 5 (Rest): vollstaendiges Scoring inkl. Personalquote,
  // Kassendifferenzen etc.
  const betriebsIndex = useMemo(() => {
    let score = 100;
    if (latest && foodCostPct > targetFoodCost) {
      score -= Math.min(30, (foodCostPct - targetFoodCost) * 3);
    }
    score -= Math.min(30, lowStock.length * 5);
    score -= Math.min(20, overdueInvoices.length * 5);
    return Math.max(0, Math.round(score));
  }, [latest, foodCostPct, targetFoodCost, lowStock, overdueInvoices]);

  const indexColor = betriebsIndex >= 80 ? "text-emerald-500" : betriebsIndex >= 50 ? "text-amber-500" : "text-rose-500";

  // Naechste Schritte: echte, aus den Live-Daten abgeleitete Handlungsempfehlungen statt
  // eines statischen Demo-Fortschrittsbalkens.
  const nextSteps = useMemo(() => {
    const steps = [];
    if (lowStock.length > 0) {
      steps.push({
        icon: "📦",
        label: `${lowStock.length} Artikel unter Mindestbestand nachbestellen`,
        to: "/store/warenwirtschaft",
      });
    }
    if (overdueInvoices.length > 0) {
      steps.push({
        icon: "⚠️",
        label: `${overdueInvoices.length} überfällige Rechnung${overdueInvoices.length === 1 ? "" : "en"} begleichen`,
        to: "/finanzen/rechnungen",
      });
    }
    if (highPriorityUpcoming.length > 0) {
      steps.push({
        icon: "💸",
        label: `${highPriorityUpcoming.length} wichtige Zahlung${highPriorityUpcoming.length === 1 ? "" : "en"} anstehend`,
        to: "/finanzen/cashflow",
      });
    }
    if (latest && foodCostPct > targetFoodCost) {
      steps.push({
        icon: "🍳",
        label: `Wareneinsatz ${(foodCostPct - targetFoodCost).toFixed(1)} Punkte über Ziel prüfen`,
        to: "/finanzen/analysen",
      });
    }
    return steps;
  }, [lowStock, overdueInvoices, highPriorityUpcoming, latest, foodCostPct, targetFoodCost]);

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Deine Zentrale</h1>
          <p className="text-xs text-slate-400 mt-1">Alles im Blick, alles unter Kontrolle.</p>
        </div>
        <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-xs text-xs font-semibold text-slate-500">
          {[
            { key: "heute", label: "Heute" },
            { key: "7", label: "7 Tage" },
            { key: "30", label: "30 Tage" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`premium-transit px-3 py-1.5 rounded-md ${
                range === opt.key ? "bg-slate-900 text-white shadow-xs" : "hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {!loading && !latest && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium rounded-xl px-4 py-3">
          Noch keine Monatsdaten erfasst. Trage sie unter{" "}
          <span className="font-bold">Finanzen → Analysen</span> ein, damit hier echte Kennzahlen erscheinen.
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md premium-transit">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Einnahmen (Brutto)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{eur(revenue)}</p>
          {revenueChangePct !== null ? (
            <span
              className={`text-[10px] font-semibold px-2 py-1 rounded-md mt-3 inline-block ${
                revenueChangePct >= 0 ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
              }`}
            >
              {revenueChangePct >= 0 ? "↑" : "↓"} {Math.abs(revenueChangePct).toFixed(0)}% vs. Vormonat
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-semibold bg-slate-50 px-2 py-1 rounded-md mt-3 inline-block">
              Kein Vergleichsmonat
            </span>
          )}
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md premium-transit">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ausgaben (Wareneinkauf)</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{eur(foodCost)}</p>
          <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-1 rounded-md mt-3 inline-block">
            Marge aktuell: {margin.toFixed(1)}%
          </span>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs hover:shadow-md premium-transit bg-gradient-to-br from-white to-indigo-50/30">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Netto-Gewinn</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{eur(netProfit)}</p>
          <span className="text-[10px] text-slate-500 font-medium bg-slate-50 px-2 py-1 rounded-md mt-3 inline-block border border-slate-100">
            Umsatz − Wareneinsatz − Personal − Sonstiges
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Betriebs-Index</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className={`text-4xl font-bold tracking-tight ${indexColor}`}>{betriebsIndex}</span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100 leading-relaxed">
            {lowStock.length > 0
              ? `${lowStock.length} Artikel unter Mindestbestand – schau in der Warenwirtschaft vorbei.`
              : "Lagerbestände sind gedeckt."}{" "}
            {latest && foodCostPct > targetFoodCost
              ? `Wareneinsatz liegt ${(foodCostPct - targetFoodCost).toFixed(1)} Punkte über Ziel.`
              : ""}
          </p>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
            Anstehende Zahlungen <span className="text-slate-300 font-medium normal-case">(aus Cashflow & Liquidität)</span>
          </span>
          {upcomingNext.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingNext.map((u) => (
                <div key={u.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{u.category}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(u.expected_date).toLocaleDateString("de-DE")} ·{" "}
                      {u.priority === "hoch" ? (
                        <span className="text-rose-600 font-semibold">hohe Priorität</span>
                      ) : u.priority === "mittel" ? (
                        <span className="text-amber-600 font-semibold">mittlere Priorität</span>
                      ) : (
                        <span className="text-slate-400">niedrige Priorität</span>
                      )}
                    </p>
                  </div>
                  <p className={`font-bold ${u.transaction_type === "income" ? "text-emerald-600" : "text-slate-900"}`}>
                    {u.transaction_type === "income" ? "+" : "−"}
                    {eur(u.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Keine anstehenden Buchungen erfasst. Trage sie unter{" "}
              <Link to="/finanzen/cashflow" className="text-indigo-600 font-semibold hover:underline">
                Finanzen → Cashflow
              </Link>{" "}
              ein.
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            Eingang Belege & Kasse <span className="text-slate-300 font-medium normal-case">(automatisch aus Gmail gescannt)</span>
          </h3>
          {recentGmailInvoices.length > 0 ? (
            <div className="divide-y divide-slate-100 text-sm">
              {recentGmailInvoices.map((inv) => (
                <div key={inv.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {inv.partner}{" "}
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded ml-2 font-medium">
                        📧 Gmail
                      </span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inv.invoice_date?.slice(0, 10)}
                      {inv.category ? ` · ${inv.category}` : ""}
                    </p>
                  </div>
                  <p className="font-bold text-slate-900">{eur(inv.amount_gross)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Noch keine per Gmail gescannten Rechnungen. Verbinde dein Gmail-Konto unter{" "}
              <Link to="/einstellungen/konten" className="text-indigo-600 font-semibold hover:underline">
                Einstellungen → Konten
              </Link>{" "}
              oder scanne manuell unter{" "}
              <Link to="/finanzen/rechnungen" className="text-indigo-600 font-semibold hover:underline">
                Finanzen → Rechnungen
              </Link>.
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">System-Hinweise</h3>
          {lowStock.length > 0 ? (
            <div className="p-3 bg-rose-50/50 border border-rose-100/80 rounded-xl">
              <p className="font-bold text-rose-900 text-sm">⚠️ Bestand kritisch</p>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                {lowStock.slice(0, 3).map((it) => it.name).join(", ")}
                {lowStock.length > 3 ? ` und ${lowStock.length - 3} weitere` : ""} unter Mindestbestand.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50/50 border border-emerald-100/80 rounded-xl">
              <p className="font-bold text-emerald-900 text-sm">✓ Alles im grünen Bereich</p>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                Kein Lagerartikel unter Mindestbestand.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ZentyChat />

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-56">
          <div className="overflow-y-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Nächste Schritte
            </span>
            <div className="space-y-2">
              {nextSteps.length > 0 ? (
                nextSteps.map((step, idx) => (
                  <Link
                    key={idx}
                    to={step.to}
                    className="premium-transit w-full text-left bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 p-2.5 rounded-xl text-sm font-medium text-slate-700 flex justify-between items-center group"
                  >
                    <span className="flex items-center gap-2">
                      {step.icon} <span className="text-xs">{step.label}</span>
                    </span>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md group-hover:bg-indigo-600 group-hover:text-white premium-transit">
                      Start →
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-slate-400">Aktuell nichts Dringendes offen – gut gemacht!</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
