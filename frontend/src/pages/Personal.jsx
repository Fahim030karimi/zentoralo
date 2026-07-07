import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";

// Phase 4 MVP: echte Mitarbeiterverwaltung + manuelle Zeiterfassung, per Backend-API
// gegen Postgres gespeichert. TODO Phase 4 (Rest): Dienstplan, Urlaubsantraege,
// HR-Dokumente (rollen-geschuetzt fuer role="inhaber"), echte Stempeluhr.
export default function Personal() {
  const [employees, setEmployees] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [empForm, setEmpForm] = useState({ name: "", role: "service", hourly_wage: "" });
  const [timeForm, setTimeForm] = useState({
    employee_id: "",
    work_date: new Date().toISOString().slice(0, 10),
    hours: "",
    note: "",
  });

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [emps, ents] = await Promise.all([api.get("/api/employees"), api.get("/api/timetracking")]);
      setEmployees(emps);
      setEntries(ents);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addEmployee(e) {
    e.preventDefault();
    if (!empForm.name.trim()) return;
    try {
      await api.post("/api/employees", {
        name: empForm.name.trim(),
        role: empForm.role,
        hourly_wage: parseFloat(empForm.hourly_wage) || 0,
      });
      setEmpForm({ name: "", role: "service", hourly_wage: "" });
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeEmployee(id) {
    try {
      await api.del(`/api/employees/${id}`);
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addTimeEntry(e) {
    e.preventDefault();
    if (!timeForm.employee_id || !timeForm.hours) return;
    try {
      await api.post("/api/timetracking", {
        employee_id: Number(timeForm.employee_id),
        work_date: timeForm.work_date,
        hours: parseFloat(timeForm.hours),
        note: timeForm.note || null,
      });
      setTimeForm({ ...timeForm, hours: "", note: "" });
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  const thisMonthLabel = new Date().toISOString().slice(0, 7);
  const monthEntries = useMemo(
    () => entries.filter((en) => en.work_date?.slice(0, 7) === thisMonthLabel),
    [entries, thisMonthLabel]
  );
  const totalHours = monthEntries.reduce((sum, en) => sum + Number(en.hours), 0);
  const totalLaborCost = monthEntries.reduce(
    (sum, en) => sum + Number(en.hours) * Number(en.hourly_wage || 0),
    0
  );

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-100 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">1. Personalverwaltung</h1>
        <p className="text-xs text-slate-400 mt-1">Mitarbeiter, Stundenlohn und Zeiterfassung.</p>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {!loading && employees.length === 0 && !error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-xl px-4 py-3">
          Noch keine Mitarbeiter angelegt.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 lg:col-span-1">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>👤</span> Neuer Mitarbeiter
          </h2>
          <form onSubmit={addEmployee} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Name</label>
              <input
                type="text"
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Rolle</label>
              <select
                value={empForm.role}
                onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              >
                <option value="service">Service</option>
                <option value="kueche">Küche</option>
                <option value="leitung">Leitung</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Stundenlohn (€)</label>
              <input
                type="number"
                step="0.01"
                value={empForm.hourly_wage}
                onChange={(e) => setEmpForm({ ...empForm, hourly_wage: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                placeholder="14.50"
              />
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
            <span>📋</span> Team ({employees.length})
          </h2>
          <div className="space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-700">{emp.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {emp.role} · {Number(emp.hourly_wage).toFixed(2)} €/Std.
                  </p>
                </div>
                <button
                  onClick={() => removeEmployee(emp.id)}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 px-2 py-1"
                >
                  Entfernen
                </button>
              </div>
            ))}
            {employees.length === 0 && (
              <p className="text-xs text-slate-400">Noch keine Mitarbeiter angelegt.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 lg:col-span-1">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>⏱</span> Zeit erfassen
          </h2>
          <form onSubmit={addTimeEntry} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Mitarbeiter</label>
              <select
                value={timeForm.employee_id}
                onChange={(e) => setTimeForm({ ...timeForm, employee_id: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              >
                <option value="">Auswählen…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Datum</label>
              <input
                type="date"
                value={timeForm.work_date}
                onChange={(e) => setTimeForm({ ...timeForm, work_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Stunden</label>
              <input
                type="number"
                step="0.25"
                value={timeForm.hours}
                onChange={(e) => setTimeForm({ ...timeForm, hours: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                placeholder="8"
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

        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <span>🗓</span> Einträge diesen Monat
            </h2>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Stunden / Lohnkosten</p>
              <p className="text-sm font-bold text-slate-800">
                {totalHours.toFixed(1)} Std. · {totalLaborCost.toFixed(2)} €
              </p>
            </div>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {monthEntries.map((en) => (
              <div
                key={en.id}
                className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-700">{en.employee_name}</p>
                  <p className="text-[10px] text-slate-400">
                    {en.work_date} · {Number(en.hours).toFixed(2)} Std.
                    {en.note ? ` · ${en.note}` : ""}
                  </p>
                </div>
                <p className="font-semibold text-slate-600">
                  {(Number(en.hours) * Number(en.hourly_wage || 0)).toFixed(2)} €
                </p>
              </div>
            ))}
            {monthEntries.length === 0 && (
              <p className="text-xs text-slate-400">Noch keine Einträge diesen Monat.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
