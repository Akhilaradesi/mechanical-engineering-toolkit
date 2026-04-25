export function NumberInput({
  id,
  name,
  label,
  value,
  onChange,
  unit,
  unitValue,
  unitOptions,
  onUnitChange,
  placeholder,
  error,
  step = "any",
  min = "0"
}) {
  const hasUnitOptions = Array.isArray(unitOptions) && unitOptions.length > 0;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <div className={hasUnitOptions ? "grid grid-cols-1 gap-2 sm:grid-cols-[1fr,92px]" : "relative"}>
        <input
          id={id}
          name={name || id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          min={min}
          step={step}
          className={`w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100 ${
            hasUnitOptions ? "" : "pr-16"
          }`}
        />

        {hasUnitOptions ? (
          <select
            aria-label={`${label} unit`}
            value={unitValue}
            onChange={onUnitChange}
            className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            {unitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : unit ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {unit}
          </span>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
    </div>
  );
}
