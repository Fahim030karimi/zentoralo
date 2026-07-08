import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import EinstellungenTabs from "./EinstellungenTabs.jsx";

export default function Profil() {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get("/api/account")
      .then((acc) => setForm({ full_name: acc.full_name || "", email: acc.email || "", phone: acc.phone || "" }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await api.put("/api/account/profile", form);
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

      <EinstellungenTabs active="profil" />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl px-4 py-3">
          Profil gespeichert.
        </div>
      )}

      <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 max-w-xl">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <span>👤</span> 1. Profil
        </h2>
        {!loading && (
          <form onSubmit={save} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">E-Mail (Login-Konto)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Telefon</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl premium-transit shadow-md shadow-indigo-600/10"
            >
              Profil speichern
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
