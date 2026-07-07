import { NavLink } from "react-router-dom";

// Gleiche Struktur/Optik wie die urspruengliche statische Demo, nur dass die
// Seiten-Umschaltung jetzt ueber react-router (NavLink) statt switchPage() laeuft.
const navItemBase =
  "nav-item premium-transit flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs";

function navClass({ isActive }) {
  return isActive
    ? `${navItemBase} text-indigo-400 bg-white/5 font-semibold`
    : `${navItemBase} text-slate-400 hover:text-white hover:bg-white/5`;
}

function subNavClass({ isActive }) {
  const base = "nav-item block text-[11px] py-1.5 px-3 rounded-lg premium-transit";
  return isActive
    ? `${base} text-indigo-400 bg-white/5 font-semibold`
    : `${base} text-slate-400 hover:text-slate-200`;
}

export default function Sidebar() {
  return (
    <aside className="w-64 fixed h-screen sidebar-gradient flex flex-col justify-between p-6 shadow-2xl z-50">
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
          <NavLink to="/" end className={navClass}>
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Zentrale
          </NavLink>

          <NavLink to="/finanzen" className={navClass}>
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Finanzen
          </NavLink>

          <div className="space-y-1 pt-2">
            <div className="flex items-center gap-3.5 text-slate-400 px-3 py-2 text-xs font-semibold">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Store
            </div>
            <div className="pl-6 space-y-1 mt-1">
              <NavLink to="/personal" className={subNavClass}>
                1. Personal
              </NavLink>
              <NavLink to="/warenwirtschaft" className={subNavClass}>
                2. Warenwirtschaft
              </NavLink>
              <NavLink to="/werkzeuge" className={subNavClass}>
                3. Werkzeuge
              </NavLink>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-4">
            <NavLink to="/einstellungen" className={navClass}>
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Einstellungen
            </NavLink>
          </div>
        </nav>
      </div>
    </aside>
  );
}
