import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { useSettings } from "../context/SettingsContext.jsx";

// Zutatenpreise kommen jetzt echt aus der Warenwirtschaft (inventory_items, Einkaufspreis
// pro Einheit) statt aus hartcodierten Demo-Werten. Gespeicherte Rezepte werden echt in
// recipes/recipe_ingredients persistiert (Preise als Snapshot, damit alte Rezepte stabil
// bleiben, auch wenn sich Lagerpreise spaeter aendern).
const eur = (value) => `${(Number(value) || 0).toFixed(2).replace(".", ",")} €`;

let rowIdCounter = 0;
function newRow() {
  rowIdCounter += 1;
  return { id: rowIdCounter, inventory_item_id: "", quantity: 1 };
}

function RezepturCard({ inventory, onSaved }) {
  const { targetFoodCost, lossSurcharge } = useSettings();
  const [name, setName] = useState("Neues Gericht");
  const [vkPreis, setVkPreis] = useState(14.9);
  const [rows, setRows] = useState(() => [newRow()]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  function itemFor(id) {
    return inventory.find((it) => String(it.id) === String(id));
  }

  function updateRow(id, patch) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function removeRow(id) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }

  const calc = useMemo(() => {
    let reineWarenkosten = 0;
    const lines = rows.map((r) => {
      const item = itemFor(r.inventory_item_id);
      const price = item ? Number(item.price_per_unit) : 0;
      const qty = Number(r.quantity) || 0;
      const cost = price * qty;
      reineWarenkosten += cost;
      return { ...r, item, cost };
    });
    const finaleWarenkosten = reineWarenkosten * (1 + lossSurcharge / 100);
    const nettoUmsatz = vkPreis / 1.19; // 19% MwSt. im Haus
    const foodCostPercentage = nettoUmsatz > 0 ? (finaleWarenkosten / nettoUmsatz) * 100 : 0;
    const rohgewinn = Math.max(0, nettoUmsatz - finaleWarenkosten);
    return { lines, finaleWarenkosten, foodCostPercentage, rohgewinn };
  }, [rows, inventory, vkPreis, lossSurcharge]);

  const limitUeberschritten = calc.foodCostPercentage > targetFoodCost;
  const canSave = name.trim().length > 0 && calc.lines.some((l) => l.item);

  async function saveRecipe() {
    setSaveError("");
    setSaveMsg("");
    const ingredients = calc.lines
      .filter((l) => l.item)
      .map((l) => ({
        inventory_item_id: l.item.id,
        name: l.item.name,
        unit: l.item.unit,
        quantity: l.quantity,
        price_per_unit: l.item.price_per_unit,
      }));
    if (!name.trim() || ingredients.length === 0) return;
    setSaving(true);
    try {
      await api.post("/api/recipes", {
        name: name.trim(),
        sale_price_gross: vkPreis,
        ingredients,
      });
      setSaveMsg("Gericht gespeichert.");
      onSaved();
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={`border rounded-2xl shadow-sm p-5 space-y-4 premium-transit ${
        limitUeberschritten ? "bg-rose-50/60 border-rose-200" : "bg-white border-slate-100"
      }`}
    >
      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>🍳</span> Interaktiver Rezeptur- & Margenrechner
          </h2>
          <p className="text-[11px] text-slate-400">
            Zutaten stammen aus deiner Warenwirtschaft. Verändere Mengen oder Preise dort – die
            Kalkulation hier zieht automatisch nach.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-medium">Ziel-Wareneinsatz</span>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            max. {targetFoodCost}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-50 text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 w-full focus:outline-none"
            placeholder="Name des Gerichts"
          />

          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Zutaten & Mengen
            </p>

            {inventory.length === 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Noch keine Artikel in der Warenwirtschaft angelegt. Lege dort zuerst Artikel mit
                Einkaufspreis an, um hier Rezepte zu kalkulieren.
              </p>
            )}

            {calc.lines.map((line) => (
              <div
                key={line.id}
                className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-xs"
              >
                <select
                  value={line.inventory_item_id}
                  onChange={(e) => updateRow(line.id, { inventory_item_id: e.target.value })}
                  className="w-1/3 bg-white border border-slate-200 rounded px-2 py-1 font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="">Artikel wählen…</option>
                  {inventory.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1 w-1/6">
                  <input
                    type="number"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => updateRow(line.id, { quantity: e.target.value })}
                    className="w-14 bg-white border border-slate-200 rounded px-1 py-0.5 text-center font-medium"
                  />
                  <span className="text-slate-400 text-[11px]">{line.item?.unit || ""}</span>
                </div>
                <div className="text-[11px] text-slate-400 w-1/4">
                  {line.item ? (
                    <>
                      <span className="bg-emerald-50 text-emerald-700 font-semibold px-1 rounded text-[10px]">
                        Lager
                      </span>{" "}
                      {eur(line.item.price_per_unit)}/{line.item.unit}
                    </>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="flex-1 text-right font-bold text-slate-800">{eur(line.cost)}</div>
                <button
                  onClick={() => removeRow(line.id)}
                  className="text-rose-400 hover:text-rose-600 text-sm px-1 font-bold"
                  title="Zutat entfernen"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={addRow}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              + Zutat hinzufügen
            </button>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between shadow-md">
          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
              Kalkulation
            </p>
            <div>
              <span className="text-[11px] text-slate-400 block">Wareneinsatz (+ Schwund)</span>
              <span className="text-lg font-bold text-white">{eur(calc.finaleWarenkosten)}</span>
            </div>
            <div className="pt-2 border-t border-white/10">
              <span className="text-[11px] text-slate-400 block">Verkaufspreis (Brutto)</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  step="0.1"
                  value={vkPreis}
                  onChange={(e) => setVkPreis(parseFloat(e.target.value) || 0)}
                  className="bg-white/10 border border-white/20 text-white font-bold rounded px-2 py-1 w-24 text-sm focus:outline-none"
                />
                <span className="text-xs font-bold">€</span>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">Einsatz in %</span>
                <span
                  className={`text-sm font-bold ${
                    limitUeberschritten ? "text-rose-500" : "text-emerald-400"
                  }`}
                >
                  {calc.foodCostPercentage.toFixed(1).replace(".", ",")} %
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Rohgewinn (€)</span>
                <span className="text-sm font-bold text-white">{eur(calc.rohgewinn)}</span>
              </div>
            </div>
          </div>
          {limitUeberschritten && (
            <p className="text-[11px] text-rose-400 font-bold mt-2">
              🚨 Ziel von {targetFoodCost}% überschritten!
            </p>
          )}
          {saveError && <p className="text-[11px] text-rose-400 font-semibold mt-2">{saveError}</p>}
          {saveMsg && <p className="text-[11px] text-emerald-400 font-semibold mt-2">{saveMsg}</p>}
          <button
            onClick={saveRecipe}
            disabled={!canSave || saving}
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold py-2 rounded-xl premium-transit"
          >
            {saving ? "Speichert…" : "💾 Speichern"}
          </button>
        </div>
      </div>
    </section>
  );
}

function RecipeListCard({ recipes, loading, onDelete }) {
  const { targetFoodCost, lossSurcharge } = useSettings();

  function metricsFor(recipe) {
    const kosten = (recipe.ingredients || []).reduce(
      (sum, ing) => sum + Number(ing.quantity) * Number(ing.price_per_unit_snapshot),
      0
    );
    const final = kosten * (1 + lossSurcharge / 100);
    const netto = Number(recipe.sale_price_gross) / 1.19;
    const pct = netto > 0 ? (final / netto) * 100 : 0;
    return { final, pct };
  }

  return (
    <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
      <div className="border-b border-slate-100 pb-3 mb-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>📖</span> Gespeicherte Gerichte ({recipes.length})
        </h2>
        <p className="text-[11px] text-slate-400">
          Alle gespeicherten Rezepturen mit aktueller Marge auf Basis der Preis-Snapshots.
        </p>
      </div>
      <div className="space-y-2">
        {recipes.map((r) => {
          const { final, pct } = metricsFor(r);
          const over = pct > targetFoodCost;
          return (
            <div
              key={r.id}
              className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
            >
              <div>
                <p className="font-semibold text-slate-700">{r.name}</p>
                <p className="text-[10px] text-slate-400">
                  VK {eur(r.sale_price_gross)} · Wareneinsatz {eur(final)} ·{" "}
                  <span className={over ? "text-rose-500 font-bold" : "text-emerald-600 font-bold"}>
                    {pct.toFixed(1).replace(".", ",")} %
                  </span>
                </p>
              </div>
              <button
                onClick={() => onDelete(r.id)}
                className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1"
              >
                Entfernen
              </button>
            </div>
          );
        })}
        {recipes.length === 0 && !loading && (
          <p className="text-xs text-slate-400">
            Noch keine Gerichte gespeichert – nutze den Rechner oben und klicke „Speichern“.
          </p>
        )}
      </div>
    </section>
  );
}

function BreakEvenCard() {
  const [fixkosten, setFixkosten] = useState(18500);
  const [durchschnittsBon, setDurchschnittsBon] = useState(22.5);

  const calc = useMemo(() => {
    const deckungsbeitragProGast = durchschnittsBon * 0.7;
    const benoetigteGaeste = Math.ceil(fixkosten / deckungsbeitragProGast);
    const benoetigterUmsatz = benoetigteGaeste * durchschnittsBon;
    const tagesZielUmsatz = benoetigterUmsatz / 26;
    return { benoetigteGaeste, benoetigterUmsatz, tagesZielUmsatz };
  }, [fixkosten, durchschnittsBon]);

  return (
    <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
      <div className="border-b border-slate-100 pb-3 mb-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>📉</span> Break-Even & Mindestumsatz-Planer
        </h2>
        <p className="text-[11px] text-slate-400">
          Ermittle den nötigen Mindestumsatz anhand deiner Fixkosten-Struktur.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between text-slate-600 font-medium mb-1">
              <span>Monatliche Fixkosten (Miete, Personal, Strom)</span>
              <span className="font-bold text-slate-900">
                {fixkosten.toLocaleString("de-DE")} €
              </span>
            </div>
            <input
              type="range"
              min="5000"
              max="50000"
              step="500"
              value={fixkosten}
              onChange={(e) => setFixkosten(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
          <div>
            <div className="flex justify-between text-slate-600 font-medium mb-1">
              <span>Durchschnittlicher Bon (Umsatz pro Gast)</span>
              <span className="font-bold text-slate-900">
                {durchschnittsBon.toFixed(2).replace(".", ",")} €
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="0.5"
              value={durchschnittsBon}
              onChange={(e) => setDurchschnittsBon(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-700 font-semibold">Nötiger Monatsumsatz:</span>
            <span className="text-sm font-bold text-indigo-700">
              {Math.round(calc.benoetigterUmsatz).toLocaleString("de-DE")} €
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-indigo-100 pt-2 text-[11px]">
            <span className="text-slate-500">Gäste pro Monat nötig:</span>
            <span className="font-bold text-slate-800">
              {calc.benoetigteGaeste.toLocaleString("de-DE")} Personen
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Tagesziel (bei 26 Öffnungstagen):</span>
            <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {Math.round(calc.tagesZielUmsatz).toLocaleString("de-DE")} € / Tag
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Werkzeuge() {
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [inv, rec] = await Promise.all([api.get("/api/inventory"), api.get("/api/recipes")]);
      setInventory(inv);
      setRecipes(rec);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function deleteRecipe(id) {
    try {
      await api.del(`/api/recipes/${id}`);
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            3. Gastro-Werkzeuge & Rechner
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Smarte Werkzeuge zur Break-Even-Berechnung und exakten Rezeptur-Kalkulation.
          </p>
        </div>
        <div className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1">
          <span>🔗 Zutatenpreise aus Warenwirtschaft verknüpft</span>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <RezepturCard inventory={inventory} onSaved={loadAll} />
      <RecipeListCard recipes={recipes} loading={loading} onDelete={deleteRecipe} />
      <BreakEvenCard />
    </div>
  );
}
