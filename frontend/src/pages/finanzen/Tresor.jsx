import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";

export default function Tresor() {
  const [state, setState] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stateForm, setStateForm] = useState({
    main_safe_balance: "",
    circulating_balance: "",
    change_reserve: "",
  });
  const [moveForm, setMoveForm] = useState({
    movement_type: "zaehlung",
    target_amount: "",
    actual_amount: "",
    responsible: "",
    note: "",
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [s, m] = await Promise.all([
        api.get("/api/cashbook/state"),
        api.get("/api/cashbook/movements"),
      ]);
      setState(s);
      setStateForm({
        main_safe_balance: s.main_safe_balance,
        circulating_balance: s.circulating_balance,
        change_reserve: s.change_reserve,
      });
      setMovements(m);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveState(e) {
    e.preventDefault();
    try {
      await api.put("/api/cashbook/state", {
        main_safe_balance: parseFloat(stateForm.main_safe_balance) || 0,
        circulating_balance: parseFloat(stateForm.circulating_balance) || 0,
        change_reserve: parseFloat(stateForm.change_reserve) || 0,
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addMovement(e) {
    e.preventDefault();
    if (!moveForm.responsible.trim()) return;
    try {
      await api.post("/api/cashbook/movements", {
        movement_type: moveForm.movement_type,
        target_amount: moveForm.target_amount ? parseFloat(moveForm.target_amount) : null,
        actual_amount: moveForm.actual_amount ? parseFloat(moveForm.actual_amount) : null,
        responsible: moveForm.responsible.trim(),
        note: moveForm.note || null,
      });
      setMoveForm({ movement_type: "zaehlung", target_amount: "", actual_amount: "", responsible: "", note: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeMovement(id) {
    try {
      await api.del(`/api/cashbook/movements/${id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">4. Tresor & Kassenbestand</h1>
          <p className="text-xs text-slate-400 mt-1">
            Bargeld im Betrieb überwachen und Kassenstürze rechtssicher dokumentieren.
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Live-Barbestandsübersicht</h2>
        <form onSubmit={saveState} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Haupttresor (Büro)</label>
            <input
              type="number"
              step="0.01"
              value={stateForm.main_safe_balance}
              onChange={(e) => setStateForm({ ...stateForm, main_safe_balance: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Im Umlauf (Geldbeutel)</label>
            <input
              type="number"
              step="0.01"
              value={stateForm.circulating_balance}
              onChange={(e) => setStateForm({ ...stateForm, circulating_balance: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Wechselgeld-Reserve</label>
            <input
              type="number"
              step="0.01"
              value={stateForm.change_reserve}
              onChange={(e) => setStateForm({ ...stateForm, change_reserve: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl premium-transit shadow-md shadow-indigo-600/10"
            >
              Salden speichern
            </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 lg:col-span-1">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Kassensturz / Transit erfassen</h2>
          <form onSubmit={addMovement} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Typ</label>
              <select
                value={moveForm.movement_type}
                onChange={(e) => setMoveForm({ ...moveForm, movement_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              >
                <option value="zaehlung">📋 Kassensturz (Zählung)</option>
                <option value="transit">💸 Geldtransit (Bank)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Soll (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={moveForm.target_amount}
                  onChange={(e) => setMoveForm({ ...moveForm, target_amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Ist (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={moveForm.actual_amount}
                  onChange={(e) => setMoveForm({ ...moveForm, actual_amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Verantwortlich</label>
              <input
                type="text"
                value={moveForm.responsible}
                onChange={(e) => setMoveForm({ ...moveForm, responsible: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                placeholder="Sabine T."
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Notiz / Begründung</label>
              <input
                type="text"
                value={moveForm.note}
                onChange={(e) => setMoveForm({ ...moveForm, note: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
                placeholder="Wechselgeldfehler bei Tisch 4"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl premium-transit shadow-md shadow-indigo-600/10"
            >
              Eintragen
            </button>
          </form>
        </section>

        <section className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden lg:col-span-2">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900">Kassenbuch-Log</h3>
            <p className="text-[11px] text-slate-400">Chronologisches Protokoll aller Bargeld-Bewegungen.</p>
          </div>
          <div className="overflow-x-auto max-h-[26rem] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 sticky top-0">
                  <th className="py-3 px-4">Datum</th>
                  <th className="py-3 px-4">Typ</th>
                  <th className="py-3 px-4">Soll / Ist</th>
                  <th className="py-3 px-4">Abweichung</th>
                  <th className="py-3 px-4">Notiz</th>
                  <th className="py-3 px-4">Verantwortlich</th>
                  <th className="py-3 px-4 text-center">Aktion</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-50">
                {movements.map((mv) => {
                  const diff =
                    mv.target_amount !== null && mv.actual_amount !== null
                      ? Number(mv.actual_amount) - Number(mv.target_amount)
                      : null;
                  return (
                    <tr key={mv.id} className="hover:bg-slate-50/50 premium-transit">
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(mv.movement_date).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {mv.movement_type === "transit" ? "💸 Geldtransit" : "📋 Kassensturz"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {mv.target_amount !== null ? `Soll: ${Number(mv.target_amount).toFixed(2)} €` : "—"}
                        <br />
                        {mv.actual_amount !== null ? `Ist: ${Number(mv.actual_amount).toFixed(2)} €` : ""}
                      </td>
                      <td className="py-3 px-4">
                        {diff !== null ? (
                          <span className={`font-bold ${diff === 0 ? "text-emerald-600" : diff < 0 ? "text-rose-600" : "text-amber-600"}`}>
                            {diff > 0 ? "+" : ""}
                            {diff.toFixed(2)} €
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{mv.note || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{mv.responsible || "—"}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => removeMovement(mv.id)}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-600"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {movements.length === 0 && !loading && (
              <p className="text-xs text-slate-400 p-4">Noch keine Einträge im Kassenbuch.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
