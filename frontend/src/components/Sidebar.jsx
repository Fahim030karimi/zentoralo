import { NavLink, useLocation } from "react-router-dom";

// Neue Navigationsstruktur (Phase 6): Zentrale, Finanzen (5 Unterseiten), Store
// (3 Unterseiten), Einstellungen (5 Unterseiten). Optik 1:1 aus den neuen Mockups
// uebernommen (active-glow-Klasse in theme.css).

const topActive =
  "premium-transit flex items-center gap-3.5 active-glow text-white font-medium px-3 py-2.5 rounded-r-lg text-xs";
const topInactive =
  "premium-transit flex items-center gap-3.5 text-slate-400 hover:text-white hover:bg-white/5 px-3 py-2.5 rounded-lg text-xs";
const subActive = "block text-[11px] text-indigo-400 font-semibold py-1.5 px-3 rounded-lg bg-white/5";
const subInactive =
  "block text-[11px] text-slate-500 hover:text-slate-300 py-1.5 px-3 rounded-lg premium-transit";

function subNavClass({ isActive }) {
  return isActive ? subActive : subInactive;
}

function SectionHeader({ to, active, icon, label }) {
  return (
    <NavLink to={to} className={active ? topActive : topInactive}>
      <svg
        className={`w-4 h-4 ${active ? "text-indigo-400" : "text-slate-500"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        {icon}
      </svg>
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const inFinanzen = location.pathname.startsWith("/finanzen");
  const inStore = location.pathname.startsWith("/store");
  const inEinstellungen = location.pathname.startsWith("/einstellungen");

  return (
    <aside className="w-64 fixed h-screen sidebar-gradient flex flex-col justify-between p-6 shadow-2xl z-50 overflow-y-auto">
      <div>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-md shadow-indigo-500/20">
            Z
          </div>
          <span className="font-bold text-base tracking-tight text-white">
            zentoralo
            <span className="text-indigo-400 font-light text-xs ml-0.5">.com</span>
          </span>
        </div>

        <p className="text-[9px] font-bold tracking-widest text-slate-500 uppercase px-3 mb-4">
          Navigation
        </p>

        <nav className="space-y-1">
          <SectionHeader
            to="/"
            active={location.pathname === "/"}
            label="Zentrale"
            icon={<path d="M4 6h16M4 12h16M4 18h7" />}
          />

          <div className="space-y-1 pt-2">
            <SectionHeader
              to="/finanzen/analysen"
              active={inFinanzen}
              label="Finanzen"
              icon={
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              }
            />
            <div className="pl-6 space-y-1 mt-1">
              <NavLink to="/finanzen/analysen" className={subNavClass}>
                1. Analysen
              </NavLink>
              <NavLink to="/finanzen/rechnungen" className={subNavClass}>
                2. Rechnungen
              </NavLink>
              <NavLink to="/finanzen/buchhaltung" className={subNavClass}>
                3. Buchhaltung & Steuern
              </NavLink>
              <NavLink to="/finanzen/tresor" className={subNavClass}>
                4. Tresor & Kassenbestand
              </NavLink>
              <NavLink to="/finanzen/cashflow" className={subNavClass}>
                5. Cashflow & Liquidität
              </NavLink>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <SectionHeader
              to="/store/personal"
              active={inStore}
              label="Store"
              icon={
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              }
            />
            <div className="pl-6 space-y-1 mt-1">
              <NavLink to="/store/personal" className={subNavClass}>
                1. Personal
              </NavLink>
              <NavLink to="/store/warenwirtschaft" className={subNavClass}>
                2. Warenwirtschaft
              </NavLink>
              <NavLink to="/store/werkzeuge" className={subNavClass}>
                3. Werkzeuge
              </NavLink>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4 space-y-1">
            <SectionHeader
              to="/einstellungen/profil"
              active={inEinstellungen}
              label="Einstellungen"
              icon={
                <>
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </>
              }
            />
            {inEinstellungen && (
              <div className="pl-6 space-y-1 mt-1">
                <NavLink to="/einstellungen/profil" className={subNavClass}>
                  1. Profil
                </NavLink>
                <NavLink to="/einstellungen/sicherheit" className={subNavClass}>
                  2. Sicherheit
                </NavLink>
                <NavLink to="/einstellungen/storedaten" className={subNavClass}>
                  3. Storedaten
                </NavLink>
                <NavLink to="/einstellungen/konten" className={subNavClass}>
                  4. Konten
                </NavLink>
                <NavLink to="/einstellungen/app" className={subNavClass}>
                  5. App-Einstellungen
                </NavLink>
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="border-t border-slate-900 pt-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-3 truncate">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-300">
            GL
          </div>
          <div className="truncate">
            <p className="text-[11px] font-semibold text-slate-200 truncate">Geschäftsleitung</p>
            <p className="text-[9px] text-slate-500 truncate">Premium-Konto</p>
          </div>
        </div>
        <NavLink
          to="/einstellungen/profil"
          className="text-[10px] text-indigo-400 font-medium cursor-pointer hover:text-indigo-300 premium-transit"
        >
          ⚙️
        </NavLink>
      </div>
    </aside>
  );
}
