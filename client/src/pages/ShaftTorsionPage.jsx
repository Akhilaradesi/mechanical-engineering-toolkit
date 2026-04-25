import { useState } from "react";
import { apiClient } from "../api/apiClient";
import { EngineeringLineChart } from "../components/charts/EngineeringLineChart";
import { FormulaCard } from "../components/common/FormulaCard";
import { NumberInput } from "../components/common/NumberInput";
import { PageHeader } from "../components/common/PageHeader";
import { ResultPanel } from "../components/common/ResultPanel";
import { useExportPdf } from "../hooks/useExportPdf";
import { copyText } from "../utils/clipboard";
import { formatResult, generateTorsionCurve, torsionPreview, validatePositiveValues } from "../utils/engineering";
import {
  convertFromBase,
  convertToBase,
  lengthUnits,
  momentInertiaUnits,
  shearStressUnits,
  torqueUnits
} from "../utils/unitSystems";

export function ShaftTorsionPage() {
  const [form, setForm] = useState({
    torque: "",
    radius: "",
    polarMoment: ""
  });
  const [units, setUnits] = useState({
    torque: "N*m",
    radius: "m",
    polarMoment: "m^4",
    shearOutput: "Pa"
  });
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { exportElementAsPdf } = useExportPdf();

  const normalizedForm = {
    torque: convertToBase(form.torque, "torque", units.torque),
    radius: convertToBase(form.radius, "length", units.radius),
    polarMoment: convertToBase(form.polarMoment, "momentInertia", units.polarMoment)
  };

  const preview = torsionPreview(normalizedForm);
  const previewShearStress = convertFromBase(preview.shearStress, "shearStress", units.shearOutput);
  const resultShearStress = convertFromBase(result?.shearStress, "shearStress", units.shearOutput);
  const curve = generateTorsionCurve(normalizedForm.torque, normalizedForm.radius, normalizedForm.polarMoment);
  const displayCurveLabels = curve.labels.map((value) => formatResult(convertFromBase(value, "length", units.radius), 3));
  const displayCurveValues = curve.values.map((value) => convertFromBase(value, "shearStress", units.shearOutput));

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
    const nextErrors = validatePositiveValues(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsCalculating(true);
    setFeedback("");

    try {
      const payload = await apiClient.calculateTorsion(normalizedForm);
      setResult(payload);
      setFeedback("Shear stress calculated successfully.");
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
        tool: "Shaft Torsion Calculator",
        inputs: {
          ...result.inputs,
          units
        },
        result: {
          shearStressBasePa: result.shearStress,
          shearStressDisplay: resultShearStress,
          shearStressUnit: units.shearOutput,
          shearStress: result.shearStress,
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
      await exportElementAsPdf("torsion-result-export", "shaft-torsion-report.pdf");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const handleCopyResult = async () => {
    if (!result) return;

    try {
      await copyText(
        [
          "Shaft Torsion Calculator",
          `Torque: ${form.torque} ${units.torque}`,
          `Radius: ${form.radius} ${units.radius}`,
          `Polar Moment: ${form.polarMoment} ${units.polarMoment}`,
          `Shear Stress: ${formatResult(resultShearStress)} ${units.shearOutput}`,
          `Formula: ${result.formula}`
        ].join("\n")
      );
      setFeedback("Result copied to clipboard.");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const dynamicFormulaNote = `Current units: T (${units.torque}), r (${units.radius}), J (${units.polarMoment}), output (${units.shearOutput}).`;

  return (
    <div>
      <PageHeader
        title="Shaft Torsion Calculator"
        description="Estimate maximum shear stress in circular shafts under torsional loading conditions."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr,1fr]">
        <form className="app-surface space-y-4" onSubmit={handleCalculate}>
          <NumberInput
            id="torque"
            name="torque"
            label="Torque"
            value={form.torque}
            onChange={onInputChange}
            unitValue={units.torque}
            unitOptions={torqueUnits}
            onUnitChange={onUnitChange("torque")}
            error={errors.torque}
            placeholder="e.g. 1200"
          />
          <NumberInput
            id="radius"
            name="radius"
            label="Radius"
            value={form.radius}
            onChange={onInputChange}
            unitValue={units.radius}
            unitOptions={lengthUnits}
            onUnitChange={onUnitChange("radius")}
            error={errors.radius}
            placeholder="e.g. 0.04"
          />
          <NumberInput
            id="polarMoment"
            name="polarMoment"
            label="Polar Moment"
            value={form.polarMoment}
            onChange={onInputChange}
            unitValue={units.polarMoment}
            unitOptions={momentInertiaUnits}
            onUnitChange={onUnitChange("polarMoment")}
            error={errors.polarMoment}
            placeholder="e.g. 1.2e-6"
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
            formula="tau = (T * r) / J"
            note={dynamicFormulaNote}
          />

          <ResultPanel title="Real-time Preview" subtitle="Calculated from live form values.">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="torsionOutputUnit" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Shear Unit
              </label>
              <select
                id="torsionOutputUnit"
                value={units.shearOutput}
                onChange={onUnitChange("shearOutput")}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
              >
                {shearStressUnits.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/80">
              <p className="text-sm text-slate-500 dark:text-slate-300">Shear Stress</p>
              <p className="mono mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {preview.isValid ? `${formatResult(previewShearStress)} ${units.shearOutput}` : "--"}
              </p>
            </div>
          </ResultPanel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr,1fr]">
        <ResultPanel
          id="torsion-result-export"
          title="Radial Shear Distribution"
          subtitle="Shear stress increases linearly from shaft center to outer radius."
        >
          <EngineeringLineChart
            labels={displayCurveLabels}
            values={displayCurveValues}
            label={`Shear Stress (${units.shearOutput})`}
            unit={units.shearOutput}
          />
        </ResultPanel>

        <ResultPanel title="Server Result" subtitle="Values returned by REST API endpoint `/calculate/torsion`.">
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <dt>Shear Stress</dt>
              <dd className="mono">{result ? `${formatResult(resultShearStress)} ${units.shearOutput}` : "--"}</dd>
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
