import { NavLink } from "react-router-dom";

const tabs = [
  { key: "profil", to: "/einstellungen/profil", label: "Profil" },
  { key: "sicherheit", to: "/einstellungen/sicherheit", label: "Sicherheit" },
  { key: "storedaten", to: "/einstellungen/storedaten", label: "Storedaten" },
  { key: "konten", to: "/einstellungen/konten", label: "Konten" },
  { key: "app", to: "/einstellungen/app", label: "App-Einstellungen" },
];

// Kleine Tab-Leiste, ergaenzend zum Sidebar-Untermenue, damit man auch innerhalb der
// Einstellungen schnell zwischen den 5 Bereichen wechseln kann.
export default function EinstellungenTabs({ active }) {
  return (
    <div className="flex flex-wrap gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs w-fit">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.to}
          className={`premium-transit text-[11px] font-semibold px-3 py-1.5 rounded-lg ${
            active === tab.key ? "bg-slate-900 text-white shadow-xs" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
