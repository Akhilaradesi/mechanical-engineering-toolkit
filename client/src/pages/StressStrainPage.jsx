import { useState } from "react";
import { apiClient } from "../api/apiClient";
import { EngineeringLineChart } from "../components/charts/EngineeringLineChart";
import { FormulaCard } from "../components/common/FormulaCard";
import { NumberInput } from "../components/common/NumberInput";
import { PageHeader } from "../components/common/PageHeader";
import { ResultPanel } from "../components/common/ResultPanel";
import { useExportPdf } from "../hooks/useExportPdf";
import { copyText } from "../utils/clipboard";
import { formatResult, generateStressCurve, stressPreview, validatePositiveValues } from "../utils/engineering";
import {
  areaUnits,
  convertFromBase,
  convertToBase,
  forceUnits,
  modulusInMPaUnits,
  stressOutputUnits
} from "../utils/unitSystems";

export function StressStrainPage() {
  const [form, setForm] = useState({
    force: "",
    area: "",
    youngModulus: ""
  });
  const [units, setUnits] = useState({
    force: "N",
    area: "mm^2",
    youngModulus: "MPa",
    stressOutput: "MPa"
  });
  const [errors, setErrors] = useState({});
  const [serverResult, setServerResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const { exportElementAsPdf } = useExportPdf();

  const normalizedForm = {
    force: convertToBase(form.force, "force", units.force),
    area: convertToBase(form.area, "area", units.area),
    youngModulus:
      form.youngModulus === "" ? "" : convertToBase(form.youngModulus, "modulusMPa", units.youngModulus)
  };

  const preview = stressPreview(normalizedForm);
  const curve = generateStressCurve(normalizedForm.force, normalizedForm.area);
  const displayCurveLabels = curve.labels.map((value) => formatResult(convertFromBase(value, "force", units.force), 2));
  const displayPreviewStress = convertFromBase(preview.stress, "stressOutput", units.stressOutput);
  const displayServerStress = convertFromBase(serverResult?.stress, "stressOutput", units.stressOutput);
  const displayCurveValues = curve.values.map((value) => convertFromBase(value, "stressOutput", units.stressOutput));
  const dynamicFormulaNote = `Current units: F (${units.force}), A (${units.area}), E (${units.youngModulus}), output stress (${units.stressOutput}).`;

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
      force: form.force,
      area: form.area,
      ...(form.youngModulus ? { youngModulus: form.youngModulus } : {})
    });

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsCalculating(true);
    setFeedback("");

    try {
      const result = await apiClient.calculateStress(normalizedForm);
      setServerResult(result);
      setFeedback("Calculation successful.");
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!serverResult) return;

    setIsSaving(true);
    setFeedback("");

    try {
      await apiClient.saveCalculation({
        tool: "Stress & Strain Calculator",
        inputs: {
          ...serverResult.inputs,
          units
        },
        result: {
          stressBaseMPa: serverResult.stress,
          stressDisplay: displayServerStress,
          stressUnit: units.stressOutput,
          stress: serverResult.stress,
          strain: serverResult.strain,
          formula: serverResult.formula
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
      await exportElementAsPdf("stress-result-export", "stress-strain-report.pdf");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const handleCopyResult = async () => {
    if (!serverResult) return;

    try {
      await copyText(
        [
          "Stress & Strain Calculator",
          `Force: ${form.force} ${units.force}`,
          `Area: ${form.area} ${units.area}`,
          `Young's Modulus: ${form.youngModulus || "N/A"} ${units.youngModulus}`,
          `Stress: ${formatResult(displayServerStress)} ${units.stressOutput}`,
          `Strain: ${Number.isFinite(serverResult.strain) ? formatResult(serverResult.strain) : "N/A"}`,
          `Formula: ${serverResult.formula}`
        ].join("\n")
      );
      setFeedback("Result copied to clipboard.");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Stress & Strain Calculator"
        description="Compute normal stress from applied force and cross-sectional area. Optionally estimate strain using Hooke's law when Young's modulus is provided."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
        <form className="app-surface space-y-4" onSubmit={handleCalculate}>
          <NumberInput
            id="force"
            label="Force"
            name="force"
            value={form.force}
            onChange={onInputChange}
            unitValue={units.force}
            unitOptions={forceUnits}
            onUnitChange={onUnitChange("force")}
            error={errors.force}
            placeholder="e.g. 2500"
          />
          <NumberInput
            id="area"
            label="Area"
            name="area"
            value={form.area}
            onChange={onInputChange}
            unitValue={units.area}
            unitOptions={areaUnits}
            onUnitChange={onUnitChange("area")}
            error={errors.area}
            placeholder="e.g. 320"
          />
          <NumberInput
            id="youngModulus"
            label="Young's Modulus (optional)"
            name="youngModulus"
            value={form.youngModulus}
            onChange={onInputChange}
            unitValue={units.youngModulus}
            unitOptions={modulusInMPaUnits}
            onUnitChange={onUnitChange("youngModulus")}
            error={errors.youngModulus}
            placeholder="e.g. 210000"
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
              disabled={!serverResult || isSaving}
              onClick={handleSave}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {isSaving ? "Saving..." : "Save Result"}
            </button>
            <button
              type="button"
              disabled={!serverResult}
              onClick={handleCopyResult}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Copy Result
            </button>
            <button
              type="button"
              disabled={!serverResult}
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
            formula="sigma = F / A | epsilon = sigma / E"
            note={dynamicFormulaNote}
          />
          <ResultPanel title="Real-time Preview" subtitle="Updates instantly as you enter values.">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="stressOutputUnit" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Stress Unit
              </label>
              <select
                id="stressOutputUnit"
                value={units.stressOutput}
                onChange={onUnitChange("stressOutput")}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
              >
                {stressOutputUnits.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/80">
                <p className="text-sm text-slate-500 dark:text-slate-300">Stress</p>
                <p className="mono mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {preview.isValid ? `${formatResult(displayPreviewStress)} ${units.stressOutput}` : "--"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/80">
                <p className="text-sm text-slate-500 dark:text-slate-300">Strain</p>
                <p className="mono mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {Number.isFinite(preview.strain) ? formatResult(preview.strain) : "Optional"}
                </p>
              </div>
            </div>
          </ResultPanel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr,1fr]">
        <ResultPanel
          id="stress-result-export"
          title="Stress Trend Chart"
          subtitle="Linear relationship between force and stress for a fixed area."
        >
          <EngineeringLineChart
            labels={displayCurveLabels}
            values={displayCurveValues}
            label={`Stress (${units.stressOutput})`}
            unit={units.stressOutput}
          />
        </ResultPanel>

        <ResultPanel title="Server Result" subtitle="Values returned by REST API endpoint `/calculate/stress`.">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <dt>Stress</dt>
              <dd className="mono">{serverResult ? `${formatResult(displayServerStress)} ${units.stressOutput}` : "--"}</dd>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <dt>Strain</dt>
              <dd className="mono">{Number.isFinite(serverResult?.strain) ? formatResult(serverResult.strain) : "--"}</dd>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <dt>Formula</dt>
              <dd className="mono mt-1 text-xs">{serverResult?.formula || "--"}</dd>
            </div>
          </dl>
        </ResultPanel>
      </div>
    </div>
  );
}
