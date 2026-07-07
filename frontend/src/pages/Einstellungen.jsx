import { useSettings } from "../context/SettingsContext.jsx";

export default function Einstellungen() {
  const { targetFoodCost, setTargetFoodCost, lossSurcharge, setLossSurcharge } = useSettings();

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Globale App- & Systemeinstellungen
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verwalte deine Kontenverknüpfungen, Datensicherheit, API-Schnittstellen und
            globalen Store-Vorgaben.
          </p>
        </div>
        <button
          onClick={() => alert("Konfiguration wird in Phase 0 (Backend-Anbindung) echt gespeichert.")}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl premium-transit shadow-md shadow-indigo-600/10"
        >
          Konfiguration anwenden
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <span>🔌</span> Konten-Verknüpfung & Live-Daten
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 items-center">
                <div>
                  <p className="font-semibold text-slate-700">Google-Konto (Gmail & Drive)</p>
                  <p className="text-[10px] text-slate-400">
                    Für automatischen Rechnungsscan – wird in Phase 1 angebunden.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                  Noch nicht verfügbar
                </span>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <span>📊</span> Globale Controlling-Hebel (Live-Auswirkung)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Ziel-Wareneinsatz (%)
                </label>
                <input
                  type="number"
                  value={targetFoodCost}
                  onChange={(e) => setTargetFoodCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  Verlust-Aufschlag (%)
                </label>
                <input
                  type="number"
                  value={lossSurcharge}
                  onChange={(e) => setLossSurcharge(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-md">
            <p className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
              👥 Rollen & Rechte
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                <span>Geschäftsführer</span>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              </div>
              <div className="p-2 bg-white/5 border border-white/10 rounded-xl flex justify-between items-center">
                <span>Service / Küche</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                  Ansicht
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
