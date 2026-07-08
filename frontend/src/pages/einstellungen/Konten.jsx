import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, API_BASE } from "../../lib/api.js";
import EinstellungenTabs from "./EinstellungenTabs.jsx";

// Einstellungen > 4. Konten. Google-Konto ist die erste echte Verknüpfung (Phase 1):
// Verbinden loest einen vollen Browser-Redirect zum Backend-OAuth-Start aus (kein fetch,
// da Google selbst zum Consent-Screen weiterleiten muss). Nach Rückkehr hängt das
// Backend ?google=connected|error an die URL an.
export default function Konten() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState(null);

  async function loadStatus() {
    setLoading(true);
    try {
      setStatus(await api.get("/api/google/status"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const google = searchParams.get("google");
    if (google === "connected") {
      setBanner({ type: "success", text: "Google-Konto erfolgreich verbunden." });
    } else if (google === "error") {
      const reason = searchParams.get("reason");
      const messages = {
        "not-configured":
          "Google-Verbindung ist im Backend noch nicht konfiguriert (GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI fehlen).",
        "token-exchange": "Google hat die Anmeldung abgelehnt. Bitte erneut versuchen.",
        "missing-code": "Anmeldung wurde abgebrochen.",
      };
      setBanner({ type: "error", text: messages[reason] || "Verbindung mit Google ist fehlgeschlagen." });
    }
    if (google) {
      searchParams.delete("google");
      searchParams.delete("reason");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function disconnect() {
    setError("");
    try {
      await api.del("/api/google/disconnect");
      loadStatus();
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

      <EinstellungenTabs active="konten" />

      {banner && (
        <div
          className={`text-xs font-medium rounded-xl px-4 py-3 border ${
            banner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-rose-50 border-rose-200 text-rose-700"
          }`}
        >
          {banner.text}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

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
              <p className="font-semibold text-slate-700">Google-Konto (Gmail)</p>
              <p className="text-[10px] text-slate-400">
                {!loading && status?.connected
                  ? `Verbunden als ${status.email} – Rechnungs-Mails werden künftig automatisch gescannt.`
                  : "Verbinde dein Postfach, damit Rechnungen aus deinen E-Mails automatisch erkannt werden."}
              </p>
            </div>
            {loading ? (
              <span className="text-[10px] font-bold text-slate-400 px-2.5 py-1">Lädt…</span>
            ) : status?.connected ? (
              <button
                onClick={disconnect}
                className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-100 premium-transit self-start sm:self-center"
              >
                Trennen
              </button>
            ) : (
              <a
                href={`${API_BASE}/api/google/connect`}
                className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 rounded-lg premium-transit self-start sm:self-center shadow-xs"
              >
                Konto verknüpfen
              </a>
            )}
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
