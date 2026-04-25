export function ResultPanel({ id, title, subtitle, children }) {
  return (
    <section id={id} className="app-surface">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
