export function FormulaCard({ title, formula, note }) {
  return (
    <section className="app-surface engineering-grid">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mono mt-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-cyan-200 dark:bg-slate-950">
        {formula}
      </p>
      {note ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{note}</p> : null}
    </section>
  );
}
