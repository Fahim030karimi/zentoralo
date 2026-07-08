import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useSettings } from "../context/SettingsContext.jsx";

const eur = (value) => `${Number(value || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function Zentrale() {
  const { targetFoodCost } = useSettings();
  const [range, setRange] = useState("heute");
  const [financeRows, setFinanceRows] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/finance").catch(() => []),
      api.get("/api/inventory").catch(() => []),
    ])
      .then(([finance, inventory]) => {
        setFinanceRows(finance);
        setLowStock(inventory.filter((it) => Number(it.current_stock) < Number(it.min_stock)));
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
    return Math.max(0, Math.round(score));
  }, [latest, foodCostPct, targetFoodCost, lowStock]);

  const indexColor = betriebsIndex >= 80 ? "text-emerald-500" : betriebsIndex >= 50 ? "text-amber-500" : "text-rose-500";

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
            KI-Event- & Wetterprognose <span className="text-slate-300 font-medium normal-case">(Demo – Phase 1)</span>
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
              <p className="text-sm font-bold text-indigo-600 flex items-center gap-2">📅 In 2 Wochen: Muttertag</p>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Vorjahr zeigt +42% Reservierungen. Möchtest du ein spezielles Feiertags-Menü anbieten?
              </p>
              <button
                onClick={() => alert("Diese Funktion wird mit der KI-Anbindung in Phase 1 aktiv.")}
                className="premium-transit mt-3 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-md shadow-xs"
              >
                Menü planen
              </button>
            </div>
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">Wetter-Tipp: Freitag (28°C ☀️)</p>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Prognose verlangt Mehrverbrauch: +15kg Limetten, +2 Fässer Bier.
                </p>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold block mt-3">
                ✓ Schichtplan abgedeckt
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            Eingang Belege & Kasse <span className="text-slate-300 font-medium normal-case">(Demo – Google-Anbindung folgt)</span>
          </h3>
          <div className="divide-y divide-slate-100 text-sm">
            <div className="py-3 flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  Metro AG <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-2 font-medium">PDF</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Wird künftig automatisch aus Google Drive gelesen</p>
              </div>
              <p className="font-bold text-slate-900">412,50 €</p>
            </div>
            <div className="py-3 flex justify-between items-center bg-amber-50/30 px-3 -mx-3 rounded-xl border border-amber-100/50 mt-1">
              <div>
                <p className="font-bold text-amber-900 text-sm">
                  UberEats <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ml-2 font-bold">Mailtext</span>
                </p>
                <p className="text-xs text-amber-600 mt-0.5 font-medium">Wert prüfen, dann Enter</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  defaultValue="1.450,00 €"
                  className="w-24 text-right bg-white border border-amber-200 px-2 py-1 rounded-md text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <button className="premium-transit bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-xs">
                  ✓
                </button>
              </div>
            </div>
          </div>
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
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-56">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shadow-xs shadow-indigo-500/50"></div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                Zenty • Zentoralo Intelligenz
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600 max-w-2xl leading-relaxed">
              👋 Hi Chef! Ich bin <span className="font-semibold text-indigo-600">Zenty</span>. Sobald die
              KI-Anbindung in Phase 1 live ist, beantworte ich hier direkt Fragen zu deinen Zahlen.
            </div>
          </div>
          <div className="flex gap-3 border-t border-slate-100 pt-3">
            <input
              type="text"
              placeholder="Frag Zenty etwas…"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 premium-transit text-slate-800"
            />
            <button
              onClick={() => alert("Zenty ist noch in Entwicklung (Phase 1: KI-Anbindung).")}
              className="premium-transit bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-xs"
            >
              Fragen
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-56">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Offene Missionen
            </span>
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Missions-Status</span>
                <span className="text-indigo-600">66% erfüllt</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: "66%" }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <button className="premium-transit w-full text-left bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 p-2.5 rounded-xl text-sm font-medium text-slate-700 flex justify-between items-center group">
                <span className="flex items-center gap-2">
                  🚀 <span className="text-xs">Muttertags-Menü checken</span>
                </span>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md group-hover:bg-indigo-600 group-hover:text-white premium-transit">
                  Start →
                </span>
              </button>
              <button className="premium-transit w-full text-left bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100 p-2.5 rounded-xl text-sm font-medium text-slate-700 flex justify-between items-center group">
                <span className="flex items-center gap-2">
                  ☀️ <span className="text-xs">Limetten-Bestand erhöhen</span>
                </span>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md group-hover:bg-indigo-600 group-hover:text-white premium-transit">
                  Start →
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
