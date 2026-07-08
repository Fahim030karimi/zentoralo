import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";

const priorityStyle = {
  hoch: "text-rose-700 bg-rose-50",
  mittel: "text-amber-700 bg-amber-50",
  niedrig: "text-slate-600 bg-slate-100",
};

export default function Cashflow() {
  const [accounts, setAccounts] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accForm, setAccForm] = useState({ name: "", iban: "", purpose: "", balance: "" });
  const [txForm, setTxForm] = useState({
    expected_date: new Date().toISOString().slice(0, 10),
    category: "",
    transaction_type: "expense",
    priority: "mittel",
    amount: "",
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [a, u] = await Promise.all([api.get("/api/bankaccounts"), api.get("/api/upcoming")]);
      setAccounts(a);
      setUpcoming(u);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addAccount(e) {
    e.preventDefault();
    if (!accForm.name.trim()) return;
    try {
      await api.post("/api/bankaccounts", {
        name: accForm.name.trim(),
        iban: accForm.iban || null,
        purpose: accForm.purpose || null,
        balance: parseFloat(accForm.balance) || 0,
      });
      setAccForm({ name: "", iban: "", purpose: "", balance: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeAccount(id) {
    try {
      await api.del(`/api/bankaccounts/${id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addUpcoming(e) {
    e.preventDefault();
    if (!txForm.category.trim() || !txForm.amount) return;
    try {
      await api.post("/api/upcoming", {
        expected_date: txForm.expected_date,
        category: txForm.category.trim(),
        transaction_type: txForm.transaction_type,
        priority: txForm.priority,
        amount: parseFloat(txForm.amount) || 0,
      });
      setTxForm({ ...txForm, category: "", amount: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeUpcoming(id) {
    try {
      await api.del(`/api/upcoming/${id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const totalLiquidity = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const netUpcoming = useMemo(
    () =>
      upcoming.reduce(
        (s, t) => s + (t.transaction_type === "income" ? Number(t.amount) : -Number(t.amount)),
        0
      ),
    [upcoming]
  );
  const nextCriticalDate = useMemo(() => {
    const critical = upcoming
      .filter((t) => t.transaction_type === "expense" && Number(t.amount) > totalLiquidity * 0.15)
      .sort((a, b) => new Date(a.expected_date) - new Date(b.expected_date));
    return critical[0] || null;
  }, [upcoming, totalLiquidity]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">5. Cashflow & Liquidität</h1>
          <p className="text-xs text-slate-400 mt-1">Konten, Salden und anstehende Groß­buchungen im Blick.</p>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {nextCriticalDate && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-amber-800">Größere Belastung erkannt</h4>
              <p className="text-[11px] text-amber-700/90 mt-0.5">
                Am <strong>{nextCriticalDate.expected_date?.slice(0, 10)}</strong> steht „{nextCriticalDate.category}“
                mit {Number(nextCriticalDate.amount).toFixed(2)} € an – prüfe rechtzeitig deine Liquidität.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Verfügbare Liquidität</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalLiquidity.toFixed(2)} €</p>
          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded mt-2 inline-block">
            Summe aller Konten
          </span>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Netto anstehende Buchungen</span>
          <p className={`text-xl font-bold mt-1 ${netUpcoming >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {netUpcoming.toFixed(2)} €
          </p>
          <span className="text-[10px] text-slate-400">Alle erfassten Fixkosten/Erlöse</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Anstehende Buchungen</span>
          <p className="text-xl font-bold text-indigo-600 mt-1">{upcoming.length}</p>
          <span className="text-[10px] text-slate-400">Erfasste Groß­buchungen</span>
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Geschäftskonten</h3>
            <p className="text-[11px] text-slate-400">Manuell gepflegte Salden (echte Banksync folgt später).</p>
          </div>
        </div>
        <form onSubmit={addAccount} className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs border-b border-slate-100 bg-slate-50/30">
          <input
            type="text"
            value={accForm.name}
            onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
            placeholder="Commerzbank Hauptkonto"
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 col-span-2"
          />
          <input
            type="text"
            value={accForm.iban}
            onChange={(e) => setAccForm({ ...accForm, iban: e.target.value })}
            placeholder="IBAN"
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5"
          />
          <input
            type="text"
            value={accForm.purpose}
            onChange={(e) => setAccForm({ ...accForm, purpose: e.target.value })}
            placeholder="Verwendungszweck"
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5"
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={accForm.balance}
              onChange={(e) => setAccForm({ ...accForm, balance: e.target.value })}
              placeholder="Saldo €"
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 w-full"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 rounded-lg premium-transit">
              +
            </button>
          </div>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Konto</th>
                <th className="py-3 px-4">IBAN</th>
                <th className="py-3 px-4">Zweck</th>
                <th className="py-3 px-4 text-right">Saldo</th>
                <th className="py-3 px-4 text-center">Aktion</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-50">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50 premium-transit">
                  <td className="py-3 px-4 font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> {a.name}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{a.iban || "—"}</td>
                  <td className="py-3 px-4 text-slate-600">{a.purpose || "—"}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{Number(a.balance).toFixed(2)} €</td>
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => removeAccount(a.id)} className="text-[10px] font-bold text-rose-500 hover:text-rose-600">
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 && !loading && (
            <p className="text-xs text-slate-400 p-4">Noch keine Konten hinterlegt.</p>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900">Anstehende Großbuchungen & Fixkosten</h3>
          <p className="text-[11px] text-slate-400">Manuell erfasste, wiederkehrende Belastungen und erwartete Einnahmen.</p>
        </div>
        <form onSubmit={addUpcoming} className="p-4 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs border-b border-slate-100 bg-slate-50/30">
          <input
            type="date"
            value={txForm.expected_date}
            onChange={(e) => setTxForm({ ...txForm, expected_date: e.target.value })}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5"
          />
          <input
            type="text"
            value={txForm.category}
            onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
            placeholder="Finanzamt / Lohn / ..."
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 col-span-2"
          />
          <select
            value={txForm.transaction_type}
            onChange={(e) => setTxForm({ ...txForm, transaction_type: e.target.value })}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5"
          >
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
          <select
            value={txForm.priority}
            onChange={(e) => setTxForm({ ...txForm, priority: e.target.value })}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5"
          >
            <option value="niedrig">Niedrig</option>
            <option value="mittel">Mittel</option>
            <option value="hoch">Hoch</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.01"
              value={txForm.amount}
              onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
              placeholder="Betrag €"
              className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 w-full"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 rounded-lg premium-transit">
              +
            </button>
          </div>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Datum</th>
                <th className="py-3 px-4">Kategorie</th>
                <th className="py-3 px-4">Priorität</th>
                <th className="py-3 px-4 text-right">Betrag</th>
                <th className="py-3 px-4 text-center">Aktion</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-50">
              {upcoming.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 premium-transit">
                  <td className="py-3.5 px-4 text-slate-500">{t.expected_date?.slice(0, 10)}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{t.category}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded font-medium text-[10px] ${priorityStyle[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className={`py-3.5 px-4 text-right font-bold ${t.transaction_type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                    {t.transaction_type === "income" ? "+ " : "- "}
                    {Number(t.amount).toFixed(2)} €
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button onClick={() => removeUpcoming(t.id)} className="text-[10px] font-bold text-rose-500 hover:text-rose-600">
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {upcoming.length === 0 && !loading && (
            <p className="text-xs text-slate-400 p-4">Noch keine anstehenden Buchungen erfasst.</p>
          )}
        </div>
      </section>
    </div>
  );
}
