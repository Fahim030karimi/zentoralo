import { useState } from "react";
import { useSettings } from "../../context/SettingsContext.jsx";
import EinstellungenTabs from "./EinstellungenTabs.jsx";

export default function AppEinstellungen() {
  const { targetFoodCost, lossSurcharge, persistStoreSettings } = useSettings();
  const [form, setForm] = useState({ targetFoodCost, lossSurcharge, backupFrequency: "stuendlich" });
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await persistStoreSettings({
        target_food_cost_percent: parseFloat(form.targetFoodCost) || 0,
        loss_surcharge_percent: parseFloat(form.lossSurcharge) || 0,
        backup_frequency: form.backupFrequency,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Einstellungen</h1>
          <p className="text-xs text-slate-400 mt-1">Profil, Sicherheit, Storedaten, Konten und App-Verhalten.</p>
        </div>
      </header>

      <EinstellungenTabs active="app" />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl px-4 py-3">
          App-Einstellungen gespeichert – wirken sofort in Werkzeuge & Finanzen.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>📊</span> 5. Globale Controlling-Hebel (Live-Auswirkung)
          </h2>
          <form onSubmit={save} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Ziel-Wareneinsatz (%)</label>
                <input
                  type="number"
                  value={form.targetFoodCost}
                  onChange={(e) => setForm({ ...form, targetFoodCost: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Verlust-Aufschlag (%)</label>
                <input
                  type="number"
                  value={form.lossSurcharge}
                  onChange={(e) => setForm({ ...form, lossSurcharge: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Automatische Backup-Frequenz</label>
              <select
                value={form.backupFrequency}
                onChange={(e) => setForm({ ...form, backupFrequency: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              >
                <option value="stuendlich">Stündlich (empfohlen)</option>
                <option value="taeglich">Täglich um 03:00 Uhr</option>
                <option value="woechentlich">Wöchentlich</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl premium-transit shadow-md shadow-indigo-600/10"
            >
              Änderungen anwenden
            </button>
          </form>
        </section>

        <section className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-md">
          <p className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">👥 Rollen & Rechte</p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-white">Geschäftsführer / Admin</p>
                <p className="text-[10px] text-slate-400">Voller Zugriff</p>
              </div>
              <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                Alle Rechte
              </span>
            </div>
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-white">Store-Manager</p>
                <p className="text-[10px] text-slate-400">Personal, Warenwirtschaft & Rezepte</p>
              </div>
              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                Eingeschränkt
              </span>
            </div>
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-white">Service / Küche</p>
                <p className="text-[10px] text-slate-400">Zeiterfassung & Bruchprotokoll</p>
              </div>
              <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                Nur Ansicht
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 pt-2 border-t border-white/10">
            Multi-User-Einladungen folgen, sobald echtes Login im Frontend aktiv ist.
          </p>
        </section>
      </div>
    </div>
  );
}
