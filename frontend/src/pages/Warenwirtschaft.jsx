import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

// Phase 2 MVP: echtes Lager/Inventar mit Mindestbestand-Warnung, per Backend-API
// gegen Postgres gespeichert. TODO Phase 2 (Rest): automatischer Bestandsabgleich aus
// Rechnungspositionen, Verpackungseinheiten (toPieces/fromPieces), 14-Tage-Sollbestand,
// Abendbestand-Wizard, Lieferanten-Preisvergleich.
export default function Warenwirtschaft() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "Stk",
    current_stock: "",
    min_stock: "",
    price_per_unit: "",
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api.get("/api/inventory"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addItem(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.post("/api/inventory", {
        name: form.name.trim(),
        category: form.category || null,
        unit: form.unit,
        current_stock: parseFloat(form.current_stock) || 0,
        min_stock: parseFloat(form.min_stock) || 0,
        price_per_unit: parseFloat(form.price_per_unit) || 0,
      });
      setForm({ name: "", category: "", unit: "Stk", current_stock: "", min_stock: "", price_per_unit: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeItem(id) {
    try {
      await api.del(`/api/inventory/${id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function adjustStock(item, delta) {
    try {
      await api.put(`/api/inventory/${item.id}`, {
        current_stock: Math.max(0, Number(item.current_stock) + delta),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const lowStockItems = useMemo(
    () => items.filter((it) => Number(it.current_stock) < Number(it.min_stock)),
    [items]
  );
  const totalValue = items.reduce(
    (sum, it) => sum + Number(it.current_stock) * Number(it.price_per_unit),
    0
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">2. Warenwirtschaft</h1>
          <p className="text-xs text-slate-400 mt-1">Lagerbestände, Mindestbestand und Bestellvorschläge.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">Lagerwert gesamt</p>
          <p className="text-sm font-bold text-slate-800">{totalValue.toFixed(2)} €</p>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {lowStockItems.length > 0 && (
        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 space-y-2">
          <h2 className="text-xs font-bold tracking-wider text-rose-500 uppercase flex items-center gap-2">
            <span>⚠️</span> Bestellvorschlag – unter Mindestbestand
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {lowStockItems.map((it) => (
              <div
                key={it.id}
                className="flex justify-between items-center p-3 bg-white rounded-xl border border-rose-100 text-xs"
              >
                <span className="font-semibold text-slate-700">{it.name}</span>
                <span className="text-rose-600 font-bold">
                  {Number(it.current_stock)} / {Number(it.min_stock)} {it.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 lg:col-span-1">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>➕</span> Neuer Artikel
          </h2>
          <form onSubmit={addItem} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                placeholder="Rinderhack Gourmet"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Kategorie</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                placeholder="Fleisch"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Einheit</label>
                <input
                  type="text"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                  placeholder="kg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Preis/Einheit (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price_per_unit}
                  onChange={(e) => setForm({ ...form, price_per_unit: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Bestand</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.current_stock}
                  onChange={(e) => setForm({ ...form, current_stock: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Mindestbestand</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.min_stock}
                  onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl premium-transit shadow-md shadow-indigo-600/10"
            >
              Hinzufügen
            </button>
          </form>
        </section>

        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 lg:col-span-2">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>📦</span> Lagerartikel ({items.length})
          </h2>
          <div className="space-y-2 max-h-[28rem] overflow-y-auto">
            {items.map((it) => {
              const low = Number(it.current_stock) < Number(it.min_stock);
              return (
                <div
                  key={it.id}
                  className={`flex justify-between items-center p-3 rounded-xl border text-xs ${
                    low ? "bg-rose-50/60 border-rose-200" : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-700">{it.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {it.category || "—"} · {Number(it.price_per_unit).toFixed(2)} €/{it.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustStock(it, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold"
                    >
                      −
                    </button>
                    <span className={`font-bold w-16 text-center ${low ? "text-rose-600" : "text-slate-700"}`}>
                      {Number(it.current_stock)} {it.unit}
                    </span>
                    <button
                      onClick={() => adjustStock(it, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-500 font-bold"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(it.id)}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && !loading && (
              <p className="text-xs text-slate-400">Noch keine Artikel angelegt.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
