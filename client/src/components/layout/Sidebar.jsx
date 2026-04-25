import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", short: "DB" },
  { to: "/stress-strain", label: "Stress & Strain", short: "SS" },
  { to: "/beam-deflection", label: "Beam Deflection", short: "BD" },
  { to: "/shaft-torsion", label: "Shaft Torsion", short: "ST" },
  { to: "/heat-transfer", label: "Heat Transfer", short: "HT" },
  { to: "/finite-element", label: "Finite Element", short: "FE" },
  { to: "/material-selector", label: "Material Selector", short: "MS" },
  { to: "/unit-converter", label: "Unit Converter", short: "UC" },
  { to: "/history", label: "History", short: "HI" }
];

function NavItem({ to, label, short, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
            : "text-slate-700 hover:bg-slate-200/80 dark:text-slate-200 dark:hover:bg-slate-700/60"
        }`
      }
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-900/10 text-xs font-bold dark:bg-slate-100/10">
        {short}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

export function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-slate-300/60 bg-white/70 p-4 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/70 lg:flex lg:flex-col">
        <div className="mb-6 rounded-xl bg-slate-900 px-4 py-4 text-white dark:bg-cyan-900/50">
          <p className="mono text-xs uppercase tracking-[0.24em] text-cyan-200">ME Toolkit</p>
          <h2 className="mt-2 text-lg font-semibold">Mechanical Engineering</h2>
          <p className="mt-1 text-xs text-slate-300">Design and analysis workspace</p>
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-300/60 bg-white/95 p-4 backdrop-blur-xl transition-transform dark:border-slate-700/60 dark:bg-slate-900/95 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="mono text-xs uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">ME Toolkit</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mechanical Engineering</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:text-slate-100"
          >
            Close
          </button>
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={onClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}
