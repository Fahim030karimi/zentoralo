import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import { useSettings } from "../../context/SettingsContext.jsx";

// Finanzen > 1. Analysen. Kernstück (Monatserfassung + GuV-Kennzahlen) ist echt und
// gegen monthly_finance verdrahtet. Der stundengenaue Deep-Dive (Zeitfenster-Filter,
// Break-Even-Tacho, Umsatz-Taktung, Artikel-Rangliste) braucht POS-/Kassendaten, die es
// noch nicht gibt - dort bewusst als klar markierte Demo-Ansicht, damit die
// Ziel-Optik aus dem Mockup erhalten bleibt, ohne echte Zahlen vorzutäuschen.
export default function Analysen() {
  const { targetFoodCost } = useSettings();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    month: new Date().toISOString().slice(0, 7) + "-01",
    revenue: "",
    food_cost: "",
    labor_cost: "",
    other_cost: "",
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await api.get("/api/finance"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveMonth(e) {
    e.preventDefault();
    if (!form.month) return;
    try {
      await api.post("/api/finance", {
        month: form.month,
        revenue: parseFloat(form.revenue) || 0,
        food_cost: parseFloat(form.food_cost) || 0,
        labor_cost: parseFloat(form.labor_cost) || 0,
        other_cost: parseFloat(form.other_cost) || 0,
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const latest = rows[0];
  const latestFoodCostPct = latest && latest.revenue > 0 ? (latest.food_cost / latest.revenue) * 100 : 0;
  const latestProfit = latest
    ? Number(latest.revenue) - Number(latest.food_cost) - Number(latest.labor_cost) - Number(latest.other_cost)
    : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">1. Analysen & Deep-Dive</h1>
          <p className="text-xs text-slate-400 mt-1">
            Monatswerte erfassen und auswerten – Wareneinsatz-Ampel gegen dein Ziel ({targetFoodCost}%).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl p-2 shadow-xs">
          <div className="flex border-r border-slate-200 pr-2 mr-1 text-[11px] font-semibold text-slate-500">
            <button className="premium-transit px-2 py-1 rounded-md bg-slate-900 text-white shadow-xs">
              Monat
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Monat:</span>
            <input
              type="month"
              value={form.month.slice(0, 7)}
              onChange={(e) => setForm({ ...form, month: e.target.value + "-01" })}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-[11px]"
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {latest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Umsatz (aktuell)</p>
            <p className="text-lg font-bold text-slate-800">{Number(latest.revenue).toFixed(0)} €</p>
          </div>
          <div
            className={`rounded-2xl p-4 border ${
              latestFoodCostPct > targetFoodCost ? "bg-rose-50/60 border-rose-200" : "bg-white border-slate-100"
            }`}
          >
            <p className="text-[10px] text-slate-400 uppercase font-bold">Wareneinsatz</p>
            <p className={`text-lg font-bold ${latestFoodCostPct > targetFoodCost ? "text-rose-600" : "text-slate-800"}`}>
              {latestFoodCostPct.toFixed(1)} %
            </p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Lohnkosten</p>
            <p className="text-lg font-bold text-slate-800">{Number(latest.labor_cost).toFixed(0)} €</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Gewinn</p>
            <p className={`text-lg font-bold ${latestProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {latestProfit.toFixed(0)} €
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 lg:col-span-1">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>🧾</span> Monat erfassen
          </h2>
          <form onSubmit={saveMonth} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Umsatz (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.revenue}
                onChange={(e) => setForm({ ...form, revenue: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Wareneinsatz (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.food_cost}
                onChange={(e) => setForm({ ...form, food_cost: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Lohnkosten (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.labor_cost}
                onChange={(e) => setForm({ ...form, labor_cost: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Sonstige Kosten (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.other_cost}
                onChange={(e) => setForm({ ...form, other_cost: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl premium-transit shadow-md shadow-indigo-600/10"
            >
              Speichern
            </button>
          </form>
        </section>

        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 lg:col-span-2">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>📊</span> Monatsübersicht
          </h2>
          <div className="space-y-2 max-h-[22rem] overflow-y-auto">
            {rows.map((r) => {
              const foodPct = r.revenue > 0 ? (Number(r.food_cost) / Number(r.revenue)) * 100 : 0;
              const profit =
                Number(r.revenue) - Number(r.food_cost) - Number(r.labor_cost) - Number(r.other_cost);
              return (
                <div
                  key={r.id}
                  className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-700">{r.month?.slice(0, 7)}</p>
                    <p className="text-[10px] text-slate-400">
                      Umsatz {Number(r.revenue).toFixed(0)} € · Wareneinsatz {foodPct.toFixed(1)} %
                    </p>
                  </div>
                  <p className={`font-bold ${profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {profit.toFixed(0)} €
                  </p>
                </div>
              );
            })}
            {rows.length === 0 && !loading && (
              <p className="text-xs text-slate-400">Noch keine Monatsdaten erfasst.</p>
            )}
          </div>
        </section>
      </div>

      <section className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Break-Even-Tacho, Umsatz-Taktung nach Uhrzeit, Personaleffizienz & Artikel-Rangliste
          </span>
          <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
            Demo – benötigt Kassen-/POS-Anbindung
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
          Diese stundengenaue Auswertung (Break-Even je Tag, Umsatz-Taktung, Mitarbeiter-Effizienz,
          Artikel-Rangliste im Zeitfenster) wird live berechnet, sobald zentoralo an dein Kassensystem
          angebunden ist. Bis dahin trägst du die Monatswerte oben manuell ein – die KPI-Karten und die
          Wareneinsatz-Ampel sind schon jetzt vollständig real.
        </p>
      </section>
    </div>
  );
}
