import { useEffect, useState } from "react";
import { api } from "../../lib/api.js";
import EinstellungenTabs from "./EinstellungenTabs.jsx";

export default function Sicherheit() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", newPasswordRepeat: "" });

  async function load() {
    try {
      setAccount(await api.get("/api/account"));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changePassword(e) {
    e.preventDefault();
    setError("");
    setPwSaved(false);
    if (pwForm.newPassword !== pwForm.newPasswordRepeat) {
      setError("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    try {
      await api.put("/api/account/password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", newPasswordRepeat: "" });
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggle2fa() {
    setError("");
    try {
      const updated = await api.put("/api/account/security", {
        two_factor_enabled: !account.two_factor_enabled,
      });
      setAccount(updated);
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

      <EinstellungenTabs active="sicherheit" />

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      {pwSaved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-xl px-4 py-3">
          Passwort erfolgreich geändert.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>🔑</span> 2. Sicherheit – Passwort ändern
          </h2>
          <form onSubmit={changePassword} className="space-y-3 text-xs">
            {account?.password_hash !== undefined && account?.password_hash !== null && (
              <div>
                <label className="block text-slate-600 font-medium mb-1">Aktuelles Passwort</label>
                <input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-slate-600 font-medium mb-1">Neues Passwort (min. 8 Zeichen)</label>
              <input
                type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-medium mb-1">Neues Passwort wiederholen</label>
              <input
                type="password"
                value={pwForm.newPasswordRepeat}
                onChange={(e) => setPwForm({ ...pwForm, newPasswordRepeat: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl premium-transit shadow-md shadow-indigo-600/10"
            >
              Passwort speichern
            </button>
          </form>
        </section>

        <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>🔒</span> Zwei-Faktor-Authentifizierung
          </h2>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <p className="font-semibold text-slate-700">2FA für Admin-/Inhaber-Login</p>
              <p className="text-[10px] text-slate-400">Zusätzlicher Schutz beim nächsten echten Login.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!account?.two_factor_enabled}
                onChange={toggle2fa}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1">🛡️ Serverstandort: Frankfurt (DE)</p>
            <p className="text-[11px] text-indigo-700 leading-relaxed">
              Alle Daten liegen auf einem Render-Postgres-Server in Frankfurt am Main.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
