export function PageHeader({ title, description }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{description}</p> : null}
    </header>
  );
}
