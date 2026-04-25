import { useTheme } from "../../context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300/70 bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      aria-label="Toggle dark mode"
    >
      <span>{theme === "dark" ? "Light" : "Dark"} Mode</span>
    </button>
  );
}
