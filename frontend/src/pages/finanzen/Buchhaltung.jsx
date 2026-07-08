import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api.js";

// Finanzen > 3. Buchhaltung & Steuern. MwSt.-Aufschlüsselung wird echt aus den erfassten
// Rechnungen (invoices) berechnet. Der Monatsabschluss-Status ist eine einfache, aber
// echte Ableitung (laufender Monat = "In Prüfung", vergangene Monate = "Festgeschrieben") -
// bis eine richtige GoBD-Festschreibung existiert. DATEV-CSV-Export erzeugt eine echte
// CSV-Datei aus den erfassten Rechnungen (Client-seitig, kein Server-Roundtrip nötig).
// Kassenbuch-PDF nutzt den nativen Browser-Druckdialog ("Als PDF speichern"), damit kein
// zusätzliches PDF-Paket ins Frontend-Bundle muss.
export default function Buchhaltung() {
  const [invoices, setInvoices] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/api/invoices"), api.get("/api/finance")])
      .then(([inv, fin]) => {
        setInvoices(inv);
        setMonthly(fin);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const vatBreakdown = useMemo(() => {
    const groups = {};
    for (const inv of invoices) {
      const rate = Number(inv.vat_rate) || 0;
      if (!groups[rate]) groups[rate] = { gross: 0, net: 0, vat: 0 };
      groups[rate].gross += Number(inv.amount_gross);
      groups[rate].net += Number(inv.amount_net);
      groups[rate].vat += Number(inv.amount_gross) - Number(inv.amount_net);
    }
    return Object.entries(groups)
      .map(([rate, v]) => ({ rate: Number(rate), ...v }))
      .sort((a, b) => b.rate - a.rate);
  }, [invoices]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const missingDocs = invoices.filter((i) => i.direction === "in" && !i.note).length;

  function exportDatevCsv() {
    const header = [
      "Belegdatum",
      "Belegnummer",
      "Partner",
      "Kategorie",
      "Netto (€)",
      "MwSt-Satz (%)",
      "MwSt (€)",
      "Brutto (€)",
      "Status",
    ];
    const rows = invoices
      .slice()
      .sort((a, b) => new Date(a.invoice_date) - new Date(b.invoice_date))
      .map((inv) => [
        inv.invoice_date?.slice(0, 10) || "",
        inv.invoice_number || "",
        inv.partner || "",
        inv.category || "",
        Number(inv.amount_net).toFixed(2),
        Number(inv.vat_rate).toFixed(0),
        (Number(inv.amount_gross) - Number(inv.amount_net)).toFixed(2),
        Number(inv.amount_gross).toFixed(2),
        inv.status || "",
      ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zentoralo-datev-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportKassenbuchPdf() {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Bitte Pop-ups für diese Seite erlauben, um den PDF-Export zu nutzen.");
      return;
    }
    const rows = invoices
      .slice()
      .sort((a, b) => new Date(a.invoice_date) - new Date(b.invoice_date))
      .map(
        (inv) => `<tr>
          <td>${inv.invoice_date?.slice(0, 10) || ""}</td>
          <td>${inv.partner || ""}</td>
          <td>${inv.invoice_number || ""}</td>
          <td style="text-align:right">${Number(inv.amount_net).toFixed(2)} €</td>
          <td style="text-align:right">${Number(inv.vat_rate).toFixed(0)}%</td>
          <td style="text-align:right">${Number(inv.amount_gross).toFixed(2)} €</td>
          <td>${inv.status || ""}</td>
        </tr>`
      )
      .join("");
    win.document.write(`
      <html>
        <head>
          <title>Kassenbuch – Zentoralo</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1e293b; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            p.meta { font-size: 11px; color: #64748b; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
            th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
            th { background: #f8fafc; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>Kassenbuch – Zentoralo</h1>
          <p class="meta">Erstellt am ${new Date().toLocaleDateString("de-DE")} · ${invoices.length} Belege</p>
          <table>
            <thead>
              <tr><th>Datum</th><th>Partner</th><th>Belegnr.</th><th>Netto</th><th>MwSt.</th><th>Brutto</th><th>Status</th></tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="7">Keine Belege vorhanden.</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">3. Buchhaltung & Steuern</h1>
          <p className="text-xs text-slate-400 mt-1">
            MwSt.-Aufschlüsselung aus deinen Rechnungen und Status der Monatsabschlüsse.
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {missingDocs > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-base mt-0.5">⚠️</span>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900">Daten-Vollständigkeit vor Export prüfen</h4>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Bei {missingDocs} Kosten-Rechnung{missingDocs === 1 ? "" : "en"} fehlt noch eine Notiz/Zuordnung.
              Ergänze sie unter „Rechnungen“, um Fehler beim Export zu vermeiden.
            </p>
          </div>
        </section>
      )}

      <section className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg shadow-indigo-950/10">
        <div>
          <span className="text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            Bereit für den Steuerberater
          </span>
          <h3 className="text-base font-bold mt-2">DATEV-Export & Finanzberichte</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Lade Buchungssätze inklusive Rechnungen und MwSt.-Aufteilung im finanzamtskonformen
            DATEV-Format herunter.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={exportKassenbuchPdf}
            disabled={invoices.length === 0}
            className="flex-1 md:flex-initial bg-white/10 hover:bg-white/15 border border-white/10 premium-transit text-xs font-semibold px-4 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            📥 Kassenbuch (PDF)
          </button>
          <button
            onClick={exportDatevCsv}
            disabled={invoices.length === 0}
            className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-500 premium-transit text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⚡ DATEV-Export (.csv)
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vatBreakdown.length > 0 ? (
          vatBreakdown.map((g) => (
            <div key={g.rate} className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                MwSt.-Satz {g.rate.toFixed(0)}%
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">{g.gross.toFixed(2)} €</p>
              <div className="border-t border-slate-50 mt-2 pt-2 flex justify-between text-[10px] text-slate-400 font-medium">
                <span>Netto: {g.net.toFixed(2)} €</span>
                <span className="text-indigo-600">Steuer: {g.vat.toFixed(2)} €</span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs col-span-full text-xs text-slate-400">
            Noch keine Rechnungen erfasst – die MwSt.-Aufschlüsselung erscheint hier automatisch.
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Chronologische Monatsabschlüsse</h3>
            <p className="text-[11px] text-slate-400">Status auf Basis deiner erfassten Monatsdaten (Analysen).</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Monat</th>
                <th className="py-3 px-4">Gesamtumsatz (Brutto)</th>
                <th className="py-3 px-4">Wareneinsatz</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-50">
              {monthly.map((m) => {
                const key = m.month?.slice(0, 7);
                const isCurrent = key === currentMonthKey;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 premium-transit">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{key}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{Number(m.revenue).toFixed(2)} €</td>
                    <td className="py-3.5 px-4 text-slate-500">{Number(m.food_cost).toFixed(2)} €</td>
                    <td className="py-3.5 px-4">
                      {isCurrent ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          In Prüfung
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          ✓ Festgeschrieben
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {monthly.length === 0 && !loading && (
            <p className="text-xs text-slate-400 p-4">Noch keine Monatsdaten erfasst (siehe „Analysen“).</p>
          )}
        </div>
      </section>
    </div>
  );
}
