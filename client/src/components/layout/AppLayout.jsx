import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "../common/ThemeToggle";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="min-h-screen flex-1 px-4 pb-8 pt-4 sm:px-6 lg:px-10 lg:pt-8">
        <header className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 lg:hidden"
          >
            Menu
          </button>
          <div className="hidden lg:block" />
          <ThemeToggle />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
