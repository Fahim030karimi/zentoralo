import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import Zentrale from "./pages/Zentrale.jsx";
import Finanzen from "./pages/Finanzen.jsx";
import Personal from "./pages/Personal.jsx";
import Warenwirtschaft from "./pages/Warenwirtschaft.jsx";
import Werkzeuge from "./pages/Werkzeuge.jsx";
import Einstellungen from "./pages/Einstellungen.jsx";

export default function App() {
  return (
    <SettingsProvider>
      <div className="min-h-screen flex antialiased">
        <Sidebar />
        <main className="flex-1 p-8 ml-64 max-w-5xl space-y-6">
          <Routes>
            <Route path="/" element={<Zentrale />} />
            <Route path="/finanzen" element={<Finanzen />} />
            <Route path="/personal" element={<Personal />} />
            <Route path="/warenwirtschaft" element={<Warenwirtschaft />} />
            <Route path="/werkzeuge" element={<Werkzeuge />} />
            <Route path="/einstellungen" element={<Einstellungen />} />
          </Routes>
        </main>
      </div>
    </SettingsProvider>
  );
}
