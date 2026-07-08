import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";

const statusStyle = {
  bezahlt: "text-emerald-600 bg-emerald-50",
  offen: "text-amber-600 bg-amber-50",
  ueberfaellig: "text-rose-600 bg-rose-50",
};
const statusLabel = { bezahlt: "Bezahlt", offen: "Offen", ueberfaellig: "Überfällig" };

export default function Rechnungen() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("alle");
  const [statusFilter, setStatusFilter] = useState("alle");

  const [form, setForm] = useState({
    direction: "in",
    partner: "",
    category: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    amount_gross: "",
    vat_rate: "19",
    status: "offen",
  });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setInvoices(await api.get("/api/invoices"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addInvoice(e) {
    e.preventDefault();
    if (!form.partner.trim() || !form.amount_gross) return;
    const gross = parseFloat(form.amount_gross) || 0;
    const vat = parseFloat(form.vat_rate) || 0;
    const net = vat > 0 ? gross / (1 + vat / 100) : gross;
    try {
      await api.post("/api/invoices", {
        direction: form.direction,
        partner: form.partner.trim(),
        category: form.category || null,
        invoice_number: form.invoice_number || null,
        invoice_date: form.invoice_date,
        due_date: form.due_date || null,
        amount_gross: gross,
        amount_net: net,
        vat_rate: vat,
        status: form.status,
      });
      setForm({ ...form, partner: "", category: "", invoice_number: "", amount_gross: "", due_date: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function markStatus(inv, status) {
    try {
      await api.put(`/api/invoices/${inv.id}`, { status });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeInvoice(id) {
    try {
      await api.del(`/api/invoices/${id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (typeFilter !== "alle" && inv.direction !== typeFilter) return false;
      if (statusFilter !== "alle" && inv.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${inv.partner} ${inv.invoice_number || ""} ${inv.category || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, typeFilter, statusFilter, search]);

  const totals = useMemo(() => {
    const kosten = invoices
      .filter((i) => i.direction === "in")
      .reduce((s, i) => s + Number(i.amount_gross), 0);
    const erloes = invoices
      .filter((i) => i.direction === "out")
      .reduce((s, i) => s + Number(i.amount_gross), 0);
    return { kosten, erloes, count: invoices.length };
  }, [invoices]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">2. Rechnungsverwaltung (In & Out)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Lieferantenbelege, Dienstleistungen und B2B-Erlöse an einem Ort.
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">Verbindlichkeiten</span>
          <p className="text-lg font-bold text-slate-900 mt-1">{totals.kosten.toFixed(2)} €</p>
          <span className="text-[10px] text-slate-400">Summe aller Kosten-Rechnungen</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Forderungen</span>
          <p className="text-lg font-bold text-slate-900 mt-1">{totals.erloes.toFixed(2)} €</p>
          <span className="text-[10px] text-slate-400">Summe aller Erlös-Rechnungen</span>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Belege Gesamt</span>
          <p className="text-lg font-bold text-indigo-600 mt-1">{totals.count} Rechnungen</p>
          <span className="text-[10px] text-slate-400">Alle erfassten Belege</span>
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
        <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
          <span>➕</span> Neue Rechnung erfassen
        </h2>
        <form onSubmit={addInvoice} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs items-end">
          <div className="col-span-2">
            <label className="block text-slate-600 font-medium mb-1">Partner</label>
            <input
              type="text"
              value={form.partner}
              onChange={(e) => setForm({ ...form, partner: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
              placeholder="Metro AG"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Typ</label>
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
            >
              <option value="in">Kosten</option>
              <option value="out">Erlös</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Kategorie</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
              placeholder="Wareneinsatz"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Datum</label>
            <input
              type="date"
              value={form.invoice_date}
              onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Fällig</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Betrag (Brutto)</label>
            <input
              type="number"
              step="0.01"
              value={form.amount_gross}
              onChange={(e) => setForm({ ...form, amount_gross: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg premium-transit"
            >
              Speichern
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="w-full md:w-72 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Partner, Rechnungsnr., Kategorie…"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-3 py-1.5 text-xs focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none"
          >
            <option value="alle">Alle Typen (In & Out)</option>
            <option value="in">📥 Kosten (Eingang)</option>
            <option value="out">📤 Erlös (Ausgang)</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none"
          >
            <option value="alle">Alle Status</option>
            <option value="bezahlt">Bezahlt</option>
            <option value="offen">Offen</option>
            <option value="ueberfaellig">Überfällig</option>
          </select>
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Typ</th>
                <th className="py-3 px-4">Partner / Zweck</th>
                <th className="py-3 px-4">Nr. / Datum</th>
                <th className="py-3 px-4">Fälligkeit</th>
                <th className="py-3 px-4">Betrag</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Aktion</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-50">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 premium-transit">
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        inv.direction === "in" ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50"
                      }`}
                    >
                      {inv.direction === "in" ? "Kosten (Eingang)" : "Erlös (Ausgang)"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-800 block">{inv.partner}</span>
                    <span className="text-[10px] text-slate-400">{inv.category || "—"}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-slate-700 block font-medium">{inv.invoice_number || "—"}</span>
                    <span className="text-[10px] text-slate-400">{inv.invoice_date?.slice(0, 10)}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{inv.due_date?.slice(0, 10) || "—"}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{Number(inv.amount_gross).toFixed(2)} €</span>
                    <span className="text-[10px] text-slate-400">{Number(inv.amount_net).toFixed(2)} € Netto</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={inv.status}
                      onChange={(e) => markStatus(inv, e.target.value)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-0 focus:outline-none ${statusStyle[inv.status]}`}
                    >
                      <option value="offen">Offen</option>
                      <option value="bezahlt">Bezahlt</option>
                      <option value="ueberfaellig">Überfällig</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => removeInvoice(inv.id)}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <p className="text-xs text-slate-400 p-4">Keine Rechnungen gefunden.</p>
          )}
        </div>
        <div className="bg-slate-50/75 border-t border-slate-100 p-3 flex justify-between items-center text-xs text-slate-500">
          <span>{filtered.length} von {invoices.length} Rechnungen angezeigt</span>
        </div>
      </section>
    </div>
  );
}
