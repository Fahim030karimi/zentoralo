import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api.js";

// Haelt Ziel-Wareneinsatz/Verlustaufschlag global (Einstellungen + Werkzeuge bleiben
// live synchron). Seit Phase 6 werden die Werte beim Start aus /api/store geladen
// (store_profile-Tabelle) statt nur im Client-State zu leben; schlaegt der Fetch fehl
// (z.B. Backend im Cold-Start), bleiben die bisherigen Client-Defaults erhalten.
const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [targetFoodCost, setTargetFoodCost] = useState(25);
  const [lossSurcharge, setLossSurcharge] = useState(2);
  const [storeName, setStoreName] = useState("Zentoralo Gastro Hub");
  const [storeAddress, setStoreAddress] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get("/api/store")
      .then((store) => {
        setTargetFoodCost(Number(store.target_food_cost_percent));
        setLossSurcharge(Number(store.loss_surcharge_percent));
        setStoreName(store.store_name || "Zentoralo Gastro Hub");
        setStoreAddress(store.address || "");
      })
      .catch(() => {
        // Backend evtl. noch im Cold-Start - Client-Defaults bleiben aktiv.
      })
      .finally(() => setLoaded(true));
  }, []);

  async function persistStoreSettings(patch) {
    const updated = await api.put("/api/store", patch);
    setTargetFoodCost(Number(updated.target_food_cost_percent));
    setLossSurcharge(Number(updated.loss_surcharge_percent));
    setStoreName(updated.store_name || "Zentoralo Gastro Hub");
    setStoreAddress(updated.address || "");
    return updated;
  }

  return (
    <SettingsContext.Provider
      value={{
        targetFoodCost,
        setTargetFoodCost,
        lossSurcharge,
        setLossSurcharge,
        storeName,
        storeAddress,
        loaded,
        persistStoreSettings,
      }}
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
