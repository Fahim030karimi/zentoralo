import { useMemo, useState } from "react";
import { useSettings } from "../context/SettingsContext.jsx";

// Ausgangspreise - in Phase 1 ersetzt durch echte Rechnungsdaten (OCR/KI-Extraktion),
// aktuell wie in der Demo noch hartcodiert.
const ingredients = {
  fleischKiloPreis: 14.5,
  avocadoStueckPreis: 1.2,
  bunStueckPreis: 0.45,
};

const eur = (value) => `${value.toFixed(2).replace(".", ",")} €`;

function RezepturCard() {
  const { targetFoodCost, lossSurcharge } = useSettings();
  const [grammFleisch, setGrammFleisch] = useState(180);
  const [stkAvocado, setStkAvocado] = useState(0.5);
  const [stkBun, setStkBun] = useState(1);
  const [vkPreis, setVkPreis] = useState(14.9);

  const calc = useMemo(() => {
    const kostenFleisch = (grammFleisch / 1000) * ingredients.fleischKiloPreis;
    const kostenAvocado = stkAvocado * ingredients.avocadoStueckPreis;
    const kostenBun = stkBun * ingredients.bunStueckPreis;
    const reineWarenkosten = kostenFleisch + kostenAvocado + kostenBun;
    const finaleWarenkosten = reineWarenkosten * (1 + lossSurcharge / 100);
    const nettoUmsatz = vkPreis / 1.19; // 19% MwSt. im Haus
    const foodCostPercentage = nettoUmsatz > 0 ? (finaleWarenkosten / nettoUmsatz) * 100 : 0;
    const rohgewinn = Math.max(0, nettoUmsatz - finaleWarenkosten);
    return { kostenFleisch, kostenAvocado, kostenBun, finaleWarenkosten, foodCostPercentage, rohgewinn };
  }, [grammFleisch, stkAvocado, stkBun, vkPreis, lossSurcharge]);

  const limitUeberschritten = calc.foodCostPercentage > targetFoodCost;

  return (
    <section
      className={`border rounded-2xl shadow-sm p-5 space-y-4 premium-transit ${
        limitUeberschritten ? "bg-rose-50/60 border-rose-200" : "bg-white border-slate-100"
      }`}
    >
      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>🍳</span> Interaktiver Rezeptur- & Margenrechner
          </h2>
          <p className="text-[11px] text-slate-400">
            Verändere Mengen oder Preise – das System berechnet Margen und schlägt bei
            Limit-Überschreitung Alarm.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-medium">Ziel-Wareneinsatz</span>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            max. {targetFoodCost}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <input
            type="text"
            defaultValue="Premium Avocado Burger (1 Portion)"
            className="bg-slate-50 text-xs font-bold text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 w-full focus:outline-none"
          />

          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Zutaten & Mengen
            </p>

            <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-xs">
              <div className="w-1/3 font-semibold text-slate-700">Rinder-Patty (Gourmet)</div>
              <div className="flex items-center gap-1 w-1/4">
                <input
                  type="number"
                  value={grammFleisch}
                  onChange={(e) => setGrammFleisch(parseFloat(e.target.value) || 0)}
                  className="w-14 bg-white border border-slate-200 rounded px-1 py-0.5 text-center font-medium"
                />
                <span className="text-slate-400 text-[11px]">g</span>
              </div>
              <div className="text-[11px] text-slate-400 w-1/4">
                <span className="bg-indigo-50 text-indigo-700 font-semibold px-1 rounded text-[10px]">
                  OCR
                </span>{" "}
                14,50 €/kg
              </div>
              <div className="w-1/6 text-right font-bold text-slate-800">{eur(calc.kostenFleisch)}</div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-xs">
              <div className="w-1/3 font-semibold text-slate-700">Avocado Fresh</div>
              <div className="flex items-center gap-1 w-1/4">
                <input
                  type="number"
                  step="0.1"
                  value={stkAvocado}
                  onChange={(e) => setStkAvocado(parseFloat(e.target.value) || 0)}
                  className="w-14 bg-white border border-slate-200 rounded px-1 py-0.5 text-center font-medium"
                />
                <span className="text-slate-400 text-[11px]">Stk</span>
              </div>
              <div className="text-[11px] text-slate-400 w-1/4">
                <span className="bg-indigo-50 text-indigo-700 font-semibold px-1 rounded text-[10px]">
                  OCR
                </span>{" "}
                1,20 €/Stk
              </div>
              <div className="w-1/6 text-right font-bold text-slate-800">{eur(calc.kostenAvocado)}</div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100 text-xs">
              <div className="w-1/3 font-semibold text-slate-700">Brioche Burger Bun</div>
              <div className="flex items-center gap-1 w-1/4">
                <input
                  type="number"
                  value={stkBun}
                  onChange={(e) => setStkBun(parseFloat(e.target.value) || 0)}
                  className="w-14 bg-white border border-slate-200 rounded px-1 py-0.5 text-center font-medium"
                />
                <span className="text-slate-400 text-[11px]">Stk</span>
              </div>
              <div className="text-[11px] text-slate-400 w-1/4">
                <span className="bg-indigo-50 text-indigo-700 font-semibold px-1 rounded text-[10px]">
                  OCR
                </span>{" "}
                0,45 €/Stk
              </div>
              <div className="w-1/6 text-right font-bold text-slate-800">{eur(calc.kostenBun)}</div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between shadow-md">
          <div className="space-y-3">
            <p className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
              Kalkulation
            </p>
            <div>
              <span className="text-[11px] text-slate-400 block">Wareneinsatz (+ Schwund)</span>
              <span className="text-lg font-bold text-white">{eur(calc.finaleWarenkosten)}</span>
            </div>
            <div className="pt-2 border-t border-white/10">
              <span className="text-[11px] text-slate-400 block">Verkaufspreis (Brutto)</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  step="0.1"
                  value={vkPreis}
                  onChange={(e) => setVkPreis(parseFloat(e.target.value) || 0)}
                  className="bg-white/10 border border-white/20 text-white font-bold rounded px-2 py-1 w-24 text-sm focus:outline-none"
                />
                <span className="text-xs font-bold">€</span>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block">Einsatz in %</span>
                <span
                  className={`text-sm font-bold ${
                    limitUeberschritten ? "text-rose-500" : "text-emerald-400"
                  }`}
                >
                  {calc.foodCostPercentage.toFixed(1).replace(".", ",")} %
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Rohgewinn (€)</span>
                <span className="text-sm font-bold text-white">{eur(calc.rohgewinn)}</span>
              </div>
            </div>
          </div>
          {limitUeberschritten && (
            <p className="text-[11px] text-rose-400 font-bold mt-2">
              🚨 Ziel von {targetFoodCost}% überschritten!
            </p>
          )}
          <button
            onClick={() => alert("Gericht gespeichert! (Phase 1: echte Persistenz in recipes-Tabelle)")}
            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-xl premium-transit"
          >
            💾 Speichern
          </button>
        </div>
      </div>
    </section>
  );
}

function BreakEvenCard() {
  const [fixkosten, setFixkosten] = useState(18500);
  const [durchschnittsBon, setDurchschnittsBon] = useState(22.5);

  const calc = useMemo(() => {
    const deckungsbeitragProGast = durchschnittsBon * 0.7;
    const benoetigteGaeste = Math.ceil(fixkosten / deckungsbeitragProGast);
    const benoetigterUmsatz = benoetigteGaeste * durchschnittsBon;
    const tagesZielUmsatz = benoetigterUmsatz / 26;
    return { benoetigteGaeste, benoetigterUmsatz, tagesZielUmsatz };
  }, [fixkosten, durchschnittsBon]);

  return (
    <section className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
      <div className="border-b border-slate-100 pb-3 mb-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>📉</span> Break-Even & Mindestumsatz-Planer
        </h2>
        <p className="text-[11px] text-slate-400">
          Ermittle den nötigen Mindestumsatz anhand deiner Fixkosten-Struktur.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-4 text-xs">
          <div>
            <div className="flex justify-between text-slate-600 font-medium mb-1">
              <span>Monatliche Fixkosten (Miete, Personal, Strom)</span>
              <span className="font-bold text-slate-900">
                {fixkosten.toLocaleString("de-DE")} €
              </span>
            </div>
            <input
              type="range"
              min="5000"
              max="50000"
              step="500"
              value={fixkosten}
              onChange={(e) => setFixkosten(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
          <div>
            <div className="flex justify-between text-slate-600 font-medium mb-1">
              <span>Durchschnittlicher Bon (Umsatz pro Gast)</span>
              <span className="font-bold text-slate-900">
                {durchschnittsBon.toFixed(2).replace(".", ",")} €
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="0.5"
              value={durchschnittsBon}
              onChange={(e) => setDurchschnittsBon(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-700 font-semibold">Nötiger Monatsumsatz:</span>
            <span className="text-sm font-bold text-indigo-700">
              {Math.round(calc.benoetigterUmsatz).toLocaleString("de-DE")} €
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-indigo-100 pt-2 text-[11px]">
            <span className="text-slate-500">Gäste pro Monat nötig:</span>
            <span className="font-bold text-slate-800">
              {calc.benoetigteGaeste.toLocaleString("de-DE")} Personen
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Tagesziel (bei 26 Öffnungstagen):</span>
            <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {Math.round(calc.tagesZielUmsatz).toLocaleString("de-DE")} € / Tag
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Werkzeuge() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            3. Gastro-Werkzeuge & Rechner
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Smarte Werkzeuge zur Break-Even-Berechnung und exakten Rezeptur-Kalkulation.
          </p>
        </div>
        <div className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1">
          <span>⚡ Rechnungs-OCR aktiv: Einkaufspreise verknüpft</span>
        </div>
      </header>

      <RezepturCard />
      <BreakEvenCard />
    </div>
  );
}
