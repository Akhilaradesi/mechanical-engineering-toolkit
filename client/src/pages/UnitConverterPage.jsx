import { useState } from "react";
import { apiClient } from "../api/apiClient";
import { PageHeader } from "../components/common/PageHeader";
import { ResultPanel } from "../components/common/ResultPanel";
import { unitCategories } from "../data/unitCategories";
import { formatResult } from "../utils/engineering";

const getDefaultUnits = (category) => {
  const [fromUnit, toUnit] = Object.keys(category.units);
  return { fromUnit, toUnit: toUnit || fromUnit };
};

export function UnitConverterPage() {
  const [categoryId, setCategoryId] = useState(unitCategories[0].id);
  const [inputValue, setInputValue] = useState("1");
  const currentCategory = unitCategories.find((category) => category.id === categoryId) || unitCategories[0];
  const [units, setUnits] = useState(() => getDefaultUnits(currentCategory));
  const [feedback, setFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const value = Number(inputValue);
  const fromFactor = currentCategory.units[units.fromUnit];
  const toFactor = currentCategory.units[units.toUnit];
  const convertedValue =
    Number.isFinite(value) && Number.isFinite(fromFactor) && Number.isFinite(toFactor)
      ? (value * fromFactor) / toFactor
      : NaN;

  const onCategoryChange = (event) => {
    const nextCategory = unitCategories.find((category) => category.id === event.target.value) || unitCategories[0];
    setCategoryId(nextCategory.id);
    setUnits(getDefaultUnits(nextCategory));
    setFeedback("");
  };

  const onSwapUnits = () => {
    setUnits((current) => ({ fromUnit: current.toUnit, toUnit: current.fromUnit }));
    setFeedback("");
  };

  const handleSave = async () => {
    if (!Number.isFinite(convertedValue)) {
      setFeedback("Enter a valid numeric value before saving.");
      return;
    }

    setIsSaving(true);
    setFeedback("");

    try {
      await apiClient.saveCalculation({
        tool: "Unit Converter",
        inputs: {
          category: currentCategory.name,
          value: Number(inputValue),
          fromUnit: units.fromUnit,
          toUnit: units.toUnit
        },
        result: {
          convertedValue
        }
      });
      setFeedback("Conversion saved to history.");
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Engineering Unit Converter"
        description="Convert commonly used mechanical engineering units with category-aware factors and clear traceability."
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
        <section className="app-surface space-y-4">
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Category
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={onCategoryChange}
              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
            >
              {unitCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fromUnit" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                From
              </label>
              <select
                id="fromUnit"
                value={units.fromUnit}
                onChange={(event) => setUnits((current) => ({ ...current, fromUnit: event.target.value }))}
                className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
              >
                {Object.keys(currentCategory.units).map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="toUnit" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                To
              </label>
              <select
                id="toUnit"
                value={units.toUnit}
                onChange={(event) => setUnits((current) => ({ ...current, toUnit: event.target.value }))}
                className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
              >
                {Object.keys(currentCategory.units).map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="value" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Value
            </label>
            <input
              id="value"
              type="number"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
              placeholder="Enter value"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSwapUnits}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
            >
              Swap Units
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {isSaving ? "Saving..." : "Save Conversion"}
            </button>
          </div>
          {feedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{feedback}</p> : null}
        </section>

        <ResultPanel title="Converted Output" subtitle="Computed in real time using base-unit normalization.">
          <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/80">
            <p className="text-sm text-slate-500 dark:text-slate-300">Result</p>
            <p className="mono mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {Number.isFinite(convertedValue) ? `${formatResult(convertedValue)} ${units.toUnit}` : "--"}
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {`Formula: value_in_base = input * factor(from), output = value_in_base / factor(to)`}
            </p>
          </div>
        </ResultPanel>
      </div>
    </div>
  );
}
