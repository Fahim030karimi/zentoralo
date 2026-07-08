import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import Zentrale from "./pages/Zentrale.jsx";
import Analysen from "./pages/finanzen/Analysen.jsx";
import Rechnungen from "./pages/finanzen/Rechnungen.jsx";
import Buchhaltung from "./pages/finanzen/Buchhaltung.jsx";
import Tresor from "./pages/finanzen/Tresor.jsx";
import Cashflow from "./pages/finanzen/Cashflow.jsx";
import Personal from "./pages/Personal.jsx";
import Warenwirtschaft from "./pages/Warenwirtschaft.jsx";
import Werkzeuge from "./pages/Werkzeuge.jsx";
import Profil from "./pages/einstellungen/Profil.jsx";
import Sicherheit from "./pages/einstellungen/Sicherheit.jsx";
import Storedaten from "./pages/einstellungen/Storedaten.jsx";
import Konten from "./pages/einstellungen/Konten.jsx";
import AppEinstellungen from "./pages/einstellungen/AppEinstellungen.jsx";

export default function App() {
  return (
    <SettingsProvider>
      <div className="min-h-screen flex antialiased">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 max-w-5xl space-y-6">
          <Routes>
            <Route path="/" element={<Zentrale />} />

            <Route path="/finanzen" element={<Navigate to="/finanzen/analysen" replace />} />
            <Route path="/finanzen/analysen" element={<Analysen />} />
            <Route path="/finanzen/rechnungen" element={<Rechnungen />} />
            <Route path="/finanzen/buchhaltung" element={<Buchhaltung />} />
            <Route path="/finanzen/tresor" element={<Tresor />} />
            <Route path="/finanzen/cashflow" element={<Cashflow />} />

            <Route path="/store" element={<Navigate to="/store/personal" replace />} />
            <Route path="/store/personal" element={<Personal />} />
            <Route path="/store/warenwirtschaft" element={<Warenwirtschaft />} />
            <Route path="/store/werkzeuge" element={<Werkzeuge />} />
            {/* Alte Pfade (vor der Store-Umstrukturierung) bleiben als Redirect gültig */}
            <Route path="/personal" element={<Navigate to="/store/personal" replace />} />
            <Route path="/warenwirtschaft" element={<Navigate to="/store/warenwirtschaft" replace />} />
            <Route path="/werkzeuge" element={<Navigate to="/store/werkzeuge" replace />} />

            <Route path="/einstellungen" element={<Navigate to="/einstellungen/profil" replace />} />
            <Route path="/einstellungen/profil" element={<Profil />} />
            <Route path="/einstellungen/sicherheit" element={<Sicherheit />} />
            <Route path="/einstellungen/storedaten" element={<Storedaten />} />
            <Route path="/einstellungen/konten" element={<Konten />} />
            <Route path="/einstellungen/app" element={<AppEinstellungen />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </SettingsProvider>
  );
}
