import { useState } from "react";
import { apiClient } from "../api/apiClient";
import { EngineeringLineChart } from "../components/charts/EngineeringLineChart";
import { FormulaCard } from "../components/common/FormulaCard";
import { NumberInput } from "../components/common/NumberInput";
import { PageHeader } from "../components/common/PageHeader";
import { ResultPanel } from "../components/common/ResultPanel";
import { useExportPdf } from "../hooks/useExportPdf";
import { copyText } from "../utils/clipboard";
import { beamPreview, formatResult, generateBeamCurve, validatePositiveValues } from "../utils/engineering";
import {
  convertFromBase,
  convertToBase,
  deflectionUnits,
  forceUnits,
  lengthUnits,
  modulusInPaUnits,
  momentInertiaUnits
} from "../utils/unitSystems";

export function BeamDeflectionPage() {
  const [form, setForm] = useState({
    type: "cantilever",
    load: "",
    length: "",
    youngModulus: "",
    momentOfInertia: ""
  });
  const [units, setUnits] = useState({
    load: "N",
    length: "m",
    youngModulus: "Pa",
    momentOfInertia: "m^4",
    deflectionOutput: "m"
  });
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const { exportElementAsPdf } = useExportPdf();

  const normalizedForm = {
    type: form.type,
    load: convertToBase(form.load, "force", units.load),
    length: convertToBase(form.length, "length", units.length),
    youngModulus: convertToBase(form.youngModulus, "modulusPa", units.youngModulus),
    momentOfInertia: convertToBase(form.momentOfInertia, "momentInertia", units.momentOfInertia)
  };

  const preview = beamPreview(normalizedForm);
  const previewDeflection = convertFromBase(preview.deflection, "deflection", units.deflectionOutput);
  const resultDeflection = convertFromBase(result?.deflection, "deflection", units.deflectionOutput);
  const beamCurve = generateBeamCurve(
    normalizedForm.type,
    normalizedForm.load,
    normalizedForm.length,
    normalizedForm.youngModulus,
    normalizedForm.momentOfInertia
  );
  const displayCurveLabels = beamCurve.labels.map((value) => formatResult(convertFromBase(value, "length", units.length), 3));
  const displayCurveValues = beamCurve.values.map((value) =>
    convertFromBase(value, "deflection", units.deflectionOutput)
  );

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFeedback("");
  };

  const onUnitChange = (field) => (event) => {
    const { value } = event.target;
    setUnits((current) => ({ ...current, [field]: value }));
    setFeedback("");
  };

  const handleCalculate = async (event) => {
    event.preventDefault();
    const nextErrors = validatePositiveValues({
      load: form.load,
      length: form.length,
      youngModulus: form.youngModulus,
      momentOfInertia: form.momentOfInertia
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsCalculating(true);
    setFeedback("");

    try {
      const payload = await apiClient.calculateBeam(normalizedForm);
      setResult(payload);
      setFeedback("Deflection computed successfully.");
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;

    setIsSaving(true);
    setFeedback("");

    try {
      await apiClient.saveCalculation({
        tool: "Beam Deflection Calculator",
        inputs: {
          ...result.inputs,
          units
        },
        result: {
          deflectionBaseM: result.deflection,
          deflectionDisplay: resultDeflection,
          deflectionUnit: units.deflectionOutput,
          deflection: result.deflection,
          formula: result.formula
        }
      });
      setFeedback("Result saved to history.");
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportElementAsPdf("beam-result-export", "beam-deflection-report.pdf");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;

    try {
      await copyText(
        [
          "Beam Deflection Calculator",
          `Beam Type: ${form.type}`,
          `Load: ${form.load} ${units.load}`,
          `Length: ${form.length} ${units.length}`,
          `Young's Modulus: ${form.youngModulus} ${units.youngModulus}`,
          `Moment of Inertia: ${form.momentOfInertia} ${units.momentOfInertia}`,
          `Deflection: ${formatResult(resultDeflection)} ${units.deflectionOutput}`,
          `Formula: ${result.formula}`
        ].join("\n")
      );
      setFeedback("Result copied to clipboard.");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const formula = form.type === "cantilever" ? "delta = P L^3 / (3 E I)" : "delta = P L^3 / (48 E I)";
  const dynamicFormulaNote = `Current units: P (${units.load}), L (${units.length}), E (${units.youngModulus}), I (${units.momentOfInertia}), output (${units.deflectionOutput}).`;

  return (
    <div>
      <PageHeader
        title="Beam Deflection Calculator"
        description="Analyze maximum elastic deflection for cantilever and simply supported beams under point loading."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
        <form className="app-surface space-y-4" onSubmit={handleCalculate}>
          <div className="space-y-2">
            <label htmlFor="type" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Beam Type
            </label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={onInputChange}
              className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
            >
              <option value="cantilever">Cantilever</option>
              <option value="simply-supported">Simply Supported</option>
            </select>
          </div>

          <NumberInput
            id="load"
            label="Load"
            name="load"
            value={form.load}
            onChange={onInputChange}
            unitValue={units.load}
            unitOptions={forceUnits}
            onUnitChange={onUnitChange("load")}
            error={errors.load}
            placeholder="e.g. 2000"
          />
          <NumberInput
            id="length"
            label="Length"
            name="length"
            value={form.length}
            onChange={onInputChange}
            unitValue={units.length}
            unitOptions={lengthUnits}
            onUnitChange={onUnitChange("length")}
            error={errors.length}
            placeholder="e.g. 1.8"
          />
          <NumberInput
            id="youngModulus"
            label="Young's Modulus"
            name="youngModulus"
            value={form.youngModulus}
            onChange={onInputChange}
            unitValue={units.youngModulus}
            unitOptions={modulusInPaUnits}
            onUnitChange={onUnitChange("youngModulus")}
            error={errors.youngModulus}
            placeholder="e.g. 200000000000"
          />
          <NumberInput
            id="momentOfInertia"
            label="Moment of Inertia"
            name="momentOfInertia"
            value={form.momentOfInertia}
            onChange={onInputChange}
            unitValue={units.momentOfInertia}
            unitOptions={momentInertiaUnits}
            onUnitChange={onUnitChange("momentOfInertia")}
            error={errors.momentOfInertia}
            placeholder="e.g. 0.000005"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isCalculating}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCalculating ? "Calculating..." : "Run Calculation"}
            </button>
            <button
              type="button"
              disabled={!result || isSaving}
              onClick={handleSave}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {isSaving ? "Saving..." : "Save Result"}
            </button>
            <button
              type="button"
              disabled={!result}
              onClick={handleCopyResult}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Copy Result
            </button>
            <button
              type="button"
              disabled={!result}
              onClick={handleExport}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Export PDF
            </button>
          </div>
          {feedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{feedback}</p> : null}
        </form>

        <div className="space-y-4">
          <FormulaCard
            title="Formula"
            formula={formula}
            note={dynamicFormulaNote}
          />

          <ResultPanel title="Real-time Preview" subtitle="Max deflection estimate from current inputs.">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="beamDeflectionUnit" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Deflection Unit
              </label>
              <select
                id="beamDeflectionUnit"
                value={units.deflectionOutput}
                onChange={onUnitChange("deflectionOutput")}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
              >
                {deflectionUnits.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/80">
              <p className="text-sm text-slate-500 dark:text-slate-300">Max Deflection</p>
              <p className="mono mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {preview.isValid ? `${formatResult(previewDeflection)} ${units.deflectionOutput}` : "--"}
              </p>
            </div>
          </ResultPanel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr,1fr]">
        <ResultPanel
          id="beam-result-export"
          title="Deflection Profile"
          subtitle="Approximated elastic curve along beam span."
        >
          <EngineeringLineChart
            labels={displayCurveLabels}
            values={displayCurveValues}
            label={`Deflection (${units.deflectionOutput})`}
            unit={units.deflectionOutput}
          />
        </ResultPanel>

        <ResultPanel title="Server Result" subtitle="Values returned by REST API endpoint `/calculate/beam`.">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <dt>Beam Type</dt>
              <dd className="mono uppercase">{result?.inputs?.type || "--"}</dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <dt>Max Deflection</dt>
              <dd className="mono">{result ? `${formatResult(resultDeflection)} ${units.deflectionOutput}` : "--"}</dd>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <dt>Formula</dt>
              <dd className="mono mt-1 text-xs">{result?.formula || "--"}</dd>
            </div>
          </dl>
        </ResultPanel>
      </div>
    </div>
  );
}
