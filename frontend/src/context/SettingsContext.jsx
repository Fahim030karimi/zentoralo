import { createContext, useContext, useState } from "react";

// Ersetzt den globalen appState aus der statischen Demo. Ziel-Wareneinsatz und
// Verlustaufschlag werden hier gehalten, damit Einstellungen- und Werkzeuge-Seite
// weiterhin live synchron sind (wie im Original ueber appState + Event-Listener).
// TODO Phase 0 (Rest): sobald /api/auth + company_settings-Tabelle laufen, diese
// Werte beim Login aus der DB laden statt nur im Client-State zu halten.
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [targetFoodCost, setTargetFoodCost] = useState(25);
  const [lossSurcharge, setLossSurcharge] = useState(2);

  return (
    <SettingsContext.Provider
      value={{ targetFoodCost, setTargetFoodCost, lossSurcharge, setLossSurcharge }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings muss innerhalb von SettingsProvider verwendet werden.");
  }
  return ctx;
}
