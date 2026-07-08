import EinstellungenTabs from "./EinstellungenTabs.jsx";

export default function Konten() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Einstellungen</h1>
          <p className="text-xs text-slate-400 mt-1">Profil, Sicherheit, Storedaten, Konten und App-Verhalten.</p>
        </div>
      </header>

      <EinstellungenTabs active="konten" />

      <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>🔌</span> 4. Konten-Verknüpfung & Live-Daten
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Verbinde zentoralo mit Drittsystemen für nahtlosen Datenfluss.
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-2">
            <div>
              <p className="font-semibold text-slate-700">Google-Konto (Gmail & Drive)</p>
              <p className="text-[10px] text-slate-400">Für automatischen Rechnungsscan – kommt mit Phase 1.</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-center">
              Noch nicht verfügbar
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-2">
            <div>
              <p className="font-semibold text-slate-700">Kassensystem (POS Live-API)</p>
              <p className="text-[10px] text-slate-400">Echtzeit-Umsatzdaten aus Vectron / Lightspeed & Co.</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-center">
              Noch nicht verfügbar
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-2">
            <div>
              <p className="font-semibold text-slate-700">Zahlungsabwickler (Card/Terminal)</p>
              <p className="text-[10px] text-slate-400">Abgleich von Kartenzahlungen über Stripe / SumUp.</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-center">
              Noch nicht verfügbar
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-2">
            <div>
              <p className="font-semibold text-slate-700">DATEV & Cloud-TSE (Finanzamt)</p>
              <p className="text-[10px] text-slate-400">Automatischer Export – siehe Finanzen → Buchhaltung.</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg self-start sm:self-center">
              Noch nicht verfügbar
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          Deine E-Mail und dein Passwort verwaltest du unter{" "}
          <span className="font-semibold text-slate-600">Profil</span> und{" "}
          <span className="font-semibold text-slate-600">Sicherheit</span>.
        </p>
      </section>
    </div>
  );
}
