export default function Personal() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">1. Personalverwaltung</h1>
      <p className="text-xs text-slate-400">
        Dienstpläne, Zeiterfassung und Lohnkostenfaktor.
      </p>
      {/* TODO Phase 4: Zeiterfassung (timetracking.js), Dienstplan (schedule.js),
          HR-Dokumente (hrDocuments.js, serverseitig auf Rolle "inhaber" gesperrt) */}
    </div>
  );
}
