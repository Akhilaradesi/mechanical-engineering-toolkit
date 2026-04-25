import { useState } from "react";
import { apiClient } from "../api/apiClient";
import { NumberInput } from "../components/common/NumberInput";
import { PageHeader } from "../components/common/PageHeader";
import { ResultPanel } from "../components/common/ResultPanel";
import { useExportPdf } from "../hooks/useExportPdf";
import { copyText } from "../utils/clipboard";
import { formatResult } from "../utils/engineering";
import { lengthUnits } from "../utils/unitSystems";


const areaInM2Units = [
  { value: "m^2", label: "m^2", toBase: 1 },
  { value: "cm^2", label: "cm^2", toBase: 0.0001 },
  { value: "mm^2", label: "mm^2", toBase: 0.000001 },
  { value: "in^2", label: "in^2", toBase: 0.00064516 }
];

const volumeUnits = [
  { value: "m^3", label: "m^3", toBase: 1 },
  { value: "L", label: "L", toBase: 0.001 },
  { value: "cm^3", label: "cm^3", toBase: 0.000001 },
  { value: "mm^3", label: "mm^3", toBase: 0.000000001 }
];

const thermalConductivityUnits = [
  { value: "W/m.K", label: "W/m.K", toBase: 1 },
  { value: "kW/m.K", label: "kW/m.K", toBase: 1000 },
  { value: "W/cm.K", label: "W/cm.K", toBase: 100 }
];

const convectionCoefficientUnits = [
  { value: "W/m^2.K", label: "W/m^2.K", toBase: 1 },
  { value: "kW/m^2.K", label: "kW/m^2.K", toBase: 1000 },
  { value: "W/cm^2.K", label: "W/cm^2.K", toBase: 10000 }
];

const temperatureUnits = [
  { value: "degC", label: "degC" },
  { value: "K", label: "K" },
  { value: "degF", label: "degF" }
];

const densityUnits = [
  { value: "kg/m^3", label: "kg/m^3", toBase: 1 },
  { value: "g/cm^3", label: "g/cm^3", toBase: 1000 },
  { value: "lb/ft^3", label: "lb/ft^3", toBase: 16.0184634 }
];

const specificHeatUnits = [
  { value: "J/kg.K", label: "J/kg.K", toBase: 1 },
  { value: "kJ/kg.K", label: "kJ/kg.K", toBase: 1000 },
  { value: "cal/kg.K", label: "cal/kg.K", toBase: 4.1868 }
];

const timeUnits = [
  { value: "s", label: "s", toBase: 1 },
  { value: "min", label: "min", toBase: 60 },
  { value: "hr", label: "hr", toBase: 3600 }
];

const convertByOptionList = (value, optionList, selectedUnit) => {
  const numeric = Number(value);
  const factor = optionList.find((option) => option.value === selectedUnit)?.toBase;
  if (!Number.isFinite(numeric) || !Number.isFinite(factor)) return NaN;

  return numeric * factor;
};

const convertTemperatureToC = (value, unit) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return NaN;

  if (unit === "degC") return numeric;
  if (unit === "K") return numeric - 273.15;
  if (unit === "degF") return ((numeric - 32) * 5) / 9;

  return NaN;
};
const toPositive = (value, name) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return numeric;
};

const toFinite = (value, name) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${name} must be a valid number.`);
  }

  return numeric;
};

const getConductionModelLabel = (model) => {
  if (model === "plane") return "Plane Slab";
  if (model === "composite") return "Composite Slab (2-Layer)";
  if (model === "cylinder") return "Cylinder (Radial)";
  return "Critical Insulation Thickness";
};

const calculateConduction = (model, form) => {
  if (model === "plane") {
    const k = toPositive(form.k, "Thermal conductivity");
    const area = toPositive(form.area, "Area");
    const thickness = toPositive(form.thickness, "Thickness");
    const hotTemp = toFinite(form.hotTemp, "Hot-side temperature");
    const coldTemp = toFinite(form.coldTemp, "Cold-side temperature");
    const resistance = thickness / (k * area);
    const heatRate = (hotTemp - coldTemp) / resistance;

    return {
      formula: "q = k A (T_hot - T_cold) / L",
      inputs: { k, area, thickness, hotTemp, coldTemp, model: getConductionModelLabel(model) },
      outputs: { thermalResistance: resistance, heatTransferRate: heatRate }
    };
  }

  if (model === "composite") {
    const area = toPositive(form.area, "Area");
    const l1 = toPositive(form.l1, "Layer-1 thickness");
    const k1 = toPositive(form.k1, "Layer-1 conductivity");
    const l2 = toPositive(form.l2, "Layer-2 thickness");
    const k2 = toPositive(form.k2, "Layer-2 conductivity");
    const hotTemp = toFinite(form.hotTemp, "Hot-side temperature");
    const coldTemp = toFinite(form.coldTemp, "Cold-side temperature");

    const r1 = l1 / (k1 * area);
    const r2 = l2 / (k2 * area);
    const totalResistance = r1 + r2;
    const heatRate = (hotTemp - coldTemp) / totalResistance;
    const interfaceTemperature = hotTemp - heatRate * r1;

    return {
      formula: "q = (T_hot - T_cold) / (L1/(k1A) + L2/(k2A))",
      inputs: { area, l1, k1, l2, k2, hotTemp, coldTemp, model: getConductionModelLabel(model) },
      outputs: { resistanceLayer1: r1, resistanceLayer2: r2, totalResistance, heatTransferRate: heatRate, interfaceTemperature }
    };
  }

  if (model === "cylinder") {
    const k = toPositive(form.k, "Thermal conductivity");
    const length = toPositive(form.cylinderLength, "Cylinder length");
    const innerRadius = toPositive(form.innerRadius, "Inner radius");
    const outerRadius = toPositive(form.outerRadius, "Outer radius");
    const hotTemp = toFinite(form.hotTemp, "Inner-wall temperature");
    const coldTemp = toFinite(form.coldTemp, "Outer-wall temperature");
    if (outerRadius <= innerRadius) throw new Error("Outer radius must be greater than inner radius.");

    const resistance = Math.log(outerRadius / innerRadius) / (2 * Math.PI * k * length);
    const heatRate = (hotTemp - coldTemp) / resistance;

    return {
      formula: "q = 2 pi k L (T_i - T_o) / ln(r_o/r_i)",
      inputs: { k, length, innerRadius, outerRadius, hotTemp, coldTemp, model: getConductionModelLabel(model) },
      outputs: { thermalResistance: resistance, heatTransferRate: heatRate }
    };
  }

  const insulationK = toPositive(form.insulationK, "Insulation conductivity");
  const ambientH = toPositive(form.ambientH, "Convection coefficient");
  const currentRadius = toPositive(form.currentRadius, "Current outer radius");
  const criticalRadius = insulationK / ambientH;
  const condition = currentRadius < criticalRadius
    ? "Below critical radius: adding insulation increases heat loss."
    : "Above critical radius: adding insulation reduces heat loss.";

  return {
    formula: "r_critical(cylinder) = k_insulation / h",
    inputs: { insulationK, ambientH, currentRadius, model: getConductionModelLabel(model) },
    outputs: { criticalRadius, condition }
  };
};

const calculateFin = (form) => {
  const h = toPositive(form.h, "Convection coefficient");
  const perimeter = toPositive(form.perimeter, "Perimeter");
  const k = toPositive(form.k, "Conductivity");
  const area = toPositive(form.area, "Cross-section area");
  const length = toPositive(form.length, "Length");
  const baseTemp = toFinite(form.baseTemp, "Base temperature");
  const ambientTemp = toFinite(form.ambientTemp, "Ambient temperature");
  const theta = baseTemp - ambientTemp;

  const m = Math.sqrt((h * perimeter) / (k * area));
  const mL = m * length;
  const efficiency = mL === 0 ? NaN : Math.tanh(mL) / mL;
  const heatRate = Math.sqrt(h * perimeter * k * area) * theta * Math.tanh(mL);
  const effectiveness = theta === 0 ? NaN : heatRate / (h * area * theta);

  return {
    formula: "m = sqrt(hP/(kA_c)), eta_f = tanh(mL)/(mL), q_f = sqrt(hPkA_c)(T_b-T_inf)tanh(mL)",
    inputs: { h, perimeter, k, area, length, baseTemp, ambientTemp },
    outputs: { m, efficiency, heatRate, effectiveness }
  };
};

const calculateLumped = (form) => {
  const rho = toPositive(form.rho, "Density");
  const cp = toPositive(form.cp, "Specific heat");
  const volume = toPositive(form.volume, "Volume");
  const area = toPositive(form.area, "Surface area");
  const h = toPositive(form.h, "Convection coefficient");
  const k = toPositive(form.k, "Thermal conductivity");
  const characteristicLength = toPositive(form.characteristicLength, "Characteristic length");
  const initialTemp = toFinite(form.initialTemp, "Initial temperature");
  const ambientTemp = toFinite(form.ambientTemp, "Ambient temperature");
  const time = toPositive(form.time, "Time");

  const biot = (h * characteristicLength) / k;
  const tau = (rho * cp * volume) / (h * area);
  const temperature = ambientTemp + (initialTemp - ambientTemp) * Math.exp(-time / tau);

  return {
    formula: "T(t) = T_inf + (T_i-T_inf) exp(-hAt/(rho c_p V)), valid when Bi <= 0.1",
    inputs: { rho, cp, volume, area, h, k, characteristicLength, initialTemp, ambientTemp, time },
    outputs: { biot, timeConstant: tau, temperature, lumpedValid: biot <= 0.1 }
  };
};

export function HeatTransferPage() {
  const { exportElementAsPdf } = useExportPdf();
  const [conductionModel, setConductionModel] = useState("plane");
  const [conductionForm, setConductionForm] = useState({
    k: "",
    area: "",
    thickness: "",
    hotTemp: "",
    coldTemp: "",
    innerRadius: "",
    outerRadius: "",
    cylinderLength: "",
    k1: "",
    l1: "",
    k2: "",
    l2: "",
    insulationK: "",
    ambientH: "",
    currentRadius: ""
  });
  const [conductionUnits, setConductionUnits] = useState({
    k: "W/m.K",
    area: "m^2",
    thickness: "m",
    hotTemp: "degC",
    coldTemp: "degC",
    innerRadius: "m",
    outerRadius: "m",
    cylinderLength: "m",
    k1: "W/m.K",
    l1: "m",
    k2: "W/m.K",
    l2: "m",
    insulationK: "W/m.K",
    ambientH: "W/m^2.K",
    currentRadius: "m"
  });
  const [conductionResult, setConductionResult] = useState(null);
  const [conductionFeedback, setConductionFeedback] = useState("");
  const [finForm, setFinForm] = useState({
    h: "",
    perimeter: "",
    k: "",
    area: "",
    length: "",
    baseTemp: "",
    ambientTemp: ""
  });
  const [finUnits, setFinUnits] = useState({
    h: "W/m^2.K",
    perimeter: "m",
    k: "W/m.K",
    area: "m^2",
    length: "m",
    baseTemp: "degC",
    ambientTemp: "degC"
  });
  const [finResult, setFinResult] = useState(null);
  const [finFeedback, setFinFeedback] = useState("");
  const [lumpedForm, setLumpedForm] = useState({
    rho: "",
    cp: "",
    volume: "",
    area: "",
    h: "",
    k: "",
    characteristicLength: "",
    initialTemp: "",
    ambientTemp: "",
    time: ""
  });
  const [lumpedUnits, setLumpedUnits] = useState({
    rho: "kg/m^3",
    cp: "J/kg.K",
    volume: "m^3",
    area: "m^2",
    h: "W/m^2.K",
    k: "W/m.K",
    characteristicLength: "m",
    initialTemp: "degC",
    ambientTemp: "degC",
    time: "s"
  });
  const [lumpedResult, setLumpedResult] = useState(null);
  const [lumpedFeedback, setLumpedFeedback] = useState("");

  const onConductionChange = (event) => {
    const { name, value } = event.target;
    setConductionForm((current) => ({ ...current, [name]: value }));
  };

  const onFinChange = (event) => {
    const { name, value } = event.target;
    setFinForm((current) => ({ ...current, [name]: value }));
  };

  const onLumpedChange = (event) => {
    const { name, value } = event.target;
    setLumpedForm((current) => ({ ...current, [name]: value }));
  };

  const onConductionUnitChange = (field) => (event) => {
    const { value } = event.target;
    setConductionUnits((current) => ({ ...current, [field]: value }));
  };

  const onFinUnitChange = (field) => (event) => {
    const { value } = event.target;
    setFinUnits((current) => ({ ...current, [field]: value }));
  };

  const onLumpedUnitChange = (field) => (event) => {
    const { value } = event.target;
    setLumpedUnits((current) => ({ ...current, [field]: value }));
  };

  const normalizeConductionForm = () => ({
    k: convertByOptionList(conductionForm.k, thermalConductivityUnits, conductionUnits.k),
    area: convertByOptionList(conductionForm.area, areaInM2Units, conductionUnits.area),
    thickness: convertByOptionList(conductionForm.thickness, lengthUnits, conductionUnits.thickness),
    hotTemp: convertTemperatureToC(conductionForm.hotTemp, conductionUnits.hotTemp),
    coldTemp: convertTemperatureToC(conductionForm.coldTemp, conductionUnits.coldTemp),
    innerRadius: convertByOptionList(conductionForm.innerRadius, lengthUnits, conductionUnits.innerRadius),
    outerRadius: convertByOptionList(conductionForm.outerRadius, lengthUnits, conductionUnits.outerRadius),
    cylinderLength: convertByOptionList(conductionForm.cylinderLength, lengthUnits, conductionUnits.cylinderLength),
    k1: convertByOptionList(conductionForm.k1, thermalConductivityUnits, conductionUnits.k1),
    l1: convertByOptionList(conductionForm.l1, lengthUnits, conductionUnits.l1),
    k2: convertByOptionList(conductionForm.k2, thermalConductivityUnits, conductionUnits.k2),
    l2: convertByOptionList(conductionForm.l2, lengthUnits, conductionUnits.l2),
    insulationK: convertByOptionList(conductionForm.insulationK, thermalConductivityUnits, conductionUnits.insulationK),
    ambientH: convertByOptionList(conductionForm.ambientH, convectionCoefficientUnits, conductionUnits.ambientH),
    currentRadius: convertByOptionList(conductionForm.currentRadius, lengthUnits, conductionUnits.currentRadius)
  });

  const normalizeFinForm = () => ({
    h: convertByOptionList(finForm.h, convectionCoefficientUnits, finUnits.h),
    perimeter: convertByOptionList(finForm.perimeter, lengthUnits, finUnits.perimeter),
    k: convertByOptionList(finForm.k, thermalConductivityUnits, finUnits.k),
    area: convertByOptionList(finForm.area, areaInM2Units, finUnits.area),
    length: convertByOptionList(finForm.length, lengthUnits, finUnits.length),
    baseTemp: convertTemperatureToC(finForm.baseTemp, finUnits.baseTemp),
    ambientTemp: convertTemperatureToC(finForm.ambientTemp, finUnits.ambientTemp)
  });

  const normalizeLumpedForm = () => ({
    rho: convertByOptionList(lumpedForm.rho, densityUnits, lumpedUnits.rho),
    cp: convertByOptionList(lumpedForm.cp, specificHeatUnits, lumpedUnits.cp),
    volume: convertByOptionList(lumpedForm.volume, volumeUnits, lumpedUnits.volume),
    area: convertByOptionList(lumpedForm.area, areaInM2Units, lumpedUnits.area),
    h: convertByOptionList(lumpedForm.h, convectionCoefficientUnits, lumpedUnits.h),
    k: convertByOptionList(lumpedForm.k, thermalConductivityUnits, lumpedUnits.k),
    characteristicLength: convertByOptionList(lumpedForm.characteristicLength, lengthUnits, lumpedUnits.characteristicLength),
    initialTemp: convertTemperatureToC(lumpedForm.initialTemp, lumpedUnits.initialTemp),
    ambientTemp: convertTemperatureToC(lumpedForm.ambientTemp, lumpedUnits.ambientTemp),
    time: convertByOptionList(lumpedForm.time, timeUnits, lumpedUnits.time)
  });
  const formulaGroups = [
    {
      title: "Basic Modes and Governing Equations",
      lines: [
        "Conduction: q = -k A dT/dx",
        "Convection: q = h A (T_s - T_inf)",
        "General conduction (Cartesian): dT/dt = alpha (d2T/dx2 + d2T/dy2 + d2T/dz2) + q'''/(rho c_p)",
        "General conduction (Cylindrical): dT/dt = alpha [1/r d/dr(r dT/dr) + 1/r^2 d2T/dtheta2 + d2T/dz2] + q'''/(rho c_p)"
      ]
    },
    {
      title: "Steady Conduction and Fins",
      lines: [
        "Plane slab: q = k A DeltaT / L",
        "Composite slab: q = DeltaT / sum(L_i/(k_i A))",
        "Cylinder: q = 2 pi k L DeltaT / ln(r_o/r_i)",
        "Critical insulation (cylinder): r_critical = k/h",
        "Fin efficiency: eta_f = tanh(mL)/(mL),  m = sqrt(hP/(kA_c))"
      ]
    },
    {
      title: "Transient, Convection, Boiling, and Heat Exchangers",
      lines: [
        "Lumped system: T(t) = T_inf + (T_i-T_inf)exp(-hAt/(rho c_p V)); use when Bi <= 0.1",
        "Free convection uses Rayleigh-Prandtl empirical Nu relations",
        "Forced internal flow: Dittus-Boelter Nu = 0.023 Re^0.8 Pr^n",
        "Boiling regimes: nucleate, transition, film boiling",
        "Heat exchangers: q = U A DeltaT_lm and NTU-effectiveness method"
      ]
    }
  ];

  const saveToHistory = async (tool, payload, setFeedback) => {
    try {
      await apiClient.saveCalculation({
        tool,
        inputs: payload.inputs,
        result: { ...payload.outputs, formula: payload.formula }
      });
      setFeedback("Saved to history.");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  const copyPayload = async (title, payload, setFeedback) => {
    try {
      await copyText(
        `${title}\nFormula: ${payload.formula}\nInputs: ${JSON.stringify(payload.inputs, null, 2)}\nResult: ${JSON.stringify(payload.outputs, null, 2)}`
      );
      setFeedback("Result copied to clipboard.");
    } catch (error) {
      setFeedback(error.message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Heat Transfer Toolkit"
        description="Syllabus-aligned formulas and calculators for conduction, transient analysis, convection, fins, boiling/condensation references, and heat exchangers."
      />

      <section className="grid gap-4 xl:grid-cols-3">
        {formulaGroups.map((group) => (
          <article key={group.title} className="app-surface">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{group.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {group.lines.map((line) => (
                <li key={line} className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
                  <span className="mono text-xs">{line}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="app-surface" id="ht-conduction-export">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Steady Conduction Calculator</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Plane slab, composite slab, radial cylinder, and critical insulation radius.</p>

          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <label htmlFor="conductionModel" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Model
              </label>
              <select
                id="conductionModel"
                value={conductionModel}
                onChange={(event) => setConductionModel(event.target.value)}
                className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100"
              >
                <option value="plane">Plane Slab</option>
                <option value="composite">Composite Slab (2 Layers)</option>
                <option value="cylinder">Cylinder (Radial)</option>
                <option value="critical">Critical Insulation Radius</option>
              </select>
            </div>

            {conductionModel === "plane" || conductionModel === "cylinder" ? (
              <>
                <NumberInput id="k" name="k" label="Thermal Conductivity" value={conductionForm.k} onChange={onConductionChange} unitValue={conductionUnits.k} unitOptions={thermalConductivityUnits} onUnitChange={onConductionUnitChange("k")} />
                <NumberInput id="hotTemp" name="hotTemp" label="Hot Temperature" value={conductionForm.hotTemp} onChange={onConductionChange} unitValue={conductionUnits.hotTemp} unitOptions={temperatureUnits} onUnitChange={onConductionUnitChange("hotTemp")} min="-1000" />
                <NumberInput id="coldTemp" name="coldTemp" label="Cold Temperature" value={conductionForm.coldTemp} onChange={onConductionChange} unitValue={conductionUnits.coldTemp} unitOptions={temperatureUnits} onUnitChange={onConductionUnitChange("coldTemp")} min="-1000" />
              </>
            ) : null}

            {conductionModel === "plane" ? (
              <>
                <NumberInput id="area" name="area" label="Area" value={conductionForm.area} onChange={onConductionChange} unitValue={conductionUnits.area} unitOptions={areaInM2Units} onUnitChange={onConductionUnitChange("area")} />
                <NumberInput id="thickness" name="thickness" label="Thickness" value={conductionForm.thickness} onChange={onConductionChange} unitValue={conductionUnits.thickness} unitOptions={lengthUnits} onUnitChange={onConductionUnitChange("thickness")} />
              </>
            ) : null}

            {conductionModel === "composite" ? (
              <>
                <NumberInput id="hotTemp" name="hotTemp" label="Hot Temperature" value={conductionForm.hotTemp} onChange={onConductionChange} unitValue={conductionUnits.hotTemp} unitOptions={temperatureUnits} onUnitChange={onConductionUnitChange("hotTemp")} min="-1000" />
                <NumberInput id="coldTemp" name="coldTemp" label="Cold Temperature" value={conductionForm.coldTemp} onChange={onConductionChange} unitValue={conductionUnits.coldTemp} unitOptions={temperatureUnits} onUnitChange={onConductionUnitChange("coldTemp")} min="-1000" />
                <NumberInput id="area" name="area" label="Area" value={conductionForm.area} onChange={onConductionChange} unitValue={conductionUnits.area} unitOptions={areaInM2Units} onUnitChange={onConductionUnitChange("area")} />
                <NumberInput id="k1" name="k1" label="Layer-1 Conductivity" value={conductionForm.k1} onChange={onConductionChange} unitValue={conductionUnits.k1} unitOptions={thermalConductivityUnits} onUnitChange={onConductionUnitChange("k1")} />
                <NumberInput id="l1" name="l1" label="Layer-1 Thickness" value={conductionForm.l1} onChange={onConductionChange} unitValue={conductionUnits.l1} unitOptions={lengthUnits} onUnitChange={onConductionUnitChange("l1")} />
                <NumberInput id="k2" name="k2" label="Layer-2 Conductivity" value={conductionForm.k2} onChange={onConductionChange} unitValue={conductionUnits.k2} unitOptions={thermalConductivityUnits} onUnitChange={onConductionUnitChange("k2")} />
                <NumberInput id="l2" name="l2" label="Layer-2 Thickness" value={conductionForm.l2} onChange={onConductionChange} unitValue={conductionUnits.l2} unitOptions={lengthUnits} onUnitChange={onConductionUnitChange("l2")} />
              </>
            ) : null}

            {conductionModel === "cylinder" ? (
              <>
                <NumberInput id="cylinderLength" name="cylinderLength" label="Length" value={conductionForm.cylinderLength} onChange={onConductionChange} unitValue={conductionUnits.cylinderLength} unitOptions={lengthUnits} onUnitChange={onConductionUnitChange("cylinderLength")} />
                <NumberInput id="innerRadius" name="innerRadius" label="Inner Radius" value={conductionForm.innerRadius} onChange={onConductionChange} unitValue={conductionUnits.innerRadius} unitOptions={lengthUnits} onUnitChange={onConductionUnitChange("innerRadius")} />
                <NumberInput id="outerRadius" name="outerRadius" label="Outer Radius" value={conductionForm.outerRadius} onChange={onConductionChange} unitValue={conductionUnits.outerRadius} unitOptions={lengthUnits} onUnitChange={onConductionUnitChange("outerRadius")} />
              </>
            ) : null}

            {conductionModel === "critical" ? (
              <>
                <NumberInput id="insulationK" name="insulationK" label="Insulation Conductivity" value={conductionForm.insulationK} onChange={onConductionChange} unitValue={conductionUnits.insulationK} unitOptions={thermalConductivityUnits} onUnitChange={onConductionUnitChange("insulationK")} />
                <NumberInput id="ambientH" name="ambientH" label="External h" value={conductionForm.ambientH} onChange={onConductionChange} unitValue={conductionUnits.ambientH} unitOptions={convectionCoefficientUnits} onUnitChange={onConductionUnitChange("ambientH")} />
                <NumberInput id="currentRadius" name="currentRadius" label="Current Outer Radius" value={conductionForm.currentRadius} onChange={onConductionChange} unitValue={conductionUnits.currentRadius} unitOptions={lengthUnits} onUnitChange={onConductionUnitChange("currentRadius")} />
              </>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    const payload = calculateConduction(conductionModel, normalizeConductionForm());
                    setConductionResult(payload);
                    setConductionFeedback("Conduction calculation complete.");
                  } catch (error) {
                    setConductionFeedback(error.message);
                  }
                }}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
              >
                Run
              </button>
              <button
                type="button"
                disabled={!conductionResult}
                onClick={() => saveToHistory("Heat Transfer - Conduction", { ...conductionResult, inputs: { ...conductionResult.inputs, units: conductionUnits } }, setConductionFeedback)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Save
              </button>
              <button
                type="button"
                disabled={!conductionResult}
                onClick={() => copyPayload("Heat Transfer - Conduction", { ...conductionResult, inputs: { ...conductionResult.inputs, units: conductionUnits } }, setConductionFeedback)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Copy Result
              </button>
              <button
                type="button"
                disabled={!conductionResult}
                onClick={async () => {
                  try {
                    await exportElementAsPdf("ht-conduction-export", "heat-transfer-conduction.pdf");
                  } catch (error) {
                    setConductionFeedback(error.message);
                  }
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Export PDF
              </button>
            </div>

            {conductionFeedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{conductionFeedback}</p> : null}

            {conductionResult ? (
              <ResultPanel title="Conduction Result" subtitle={conductionResult.formula}>
                <pre className="mono overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                  {JSON.stringify(conductionResult.outputs, null, 2)}
                </pre>
              </ResultPanel>
            ) : null}
          </div>
        </article>

        <article className="app-surface">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Boiling and Condensation Quick Reference</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Boiling Regimes</p>
              <p className="mono mt-1 text-xs">Nucleate -&gt; Transition -&gt; Film boiling</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Boiling Heat Flux</p>
              <p className="mono mt-1 text-xs">q'' = h_b (T_wall - T_sat)</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Film Condensation (Vertical Surface)</p>
              <p className="mono mt-1 text-xs">h_bar = 0.943 [rho_l(rho_l-rho_v) g h_fg k_l^3 /(mu_l L DeltaT)]^(1/4)</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800/80">
              Dropwise condensation typically provides much higher heat-transfer coefficients than filmwise condensation.
            </div>
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="app-surface" id="ht-fin-export">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Fin Calculator (Uniform Cross Section)</h2>
          <div className="mt-3 space-y-4">
            <NumberInput id="fin-h" name="h" label="h" value={finForm.h} onChange={onFinChange} unitValue={finUnits.h} unitOptions={convectionCoefficientUnits} onUnitChange={onFinUnitChange("h")} />
            <NumberInput id="fin-perimeter" name="perimeter" label="Perimeter" value={finForm.perimeter} onChange={onFinChange} unitValue={finUnits.perimeter} unitOptions={lengthUnits} onUnitChange={onFinUnitChange("perimeter")} />
            <NumberInput id="fin-k" name="k" label="k" value={finForm.k} onChange={onFinChange} unitValue={finUnits.k} unitOptions={thermalConductivityUnits} onUnitChange={onFinUnitChange("k")} />
            <NumberInput id="fin-area" name="area" label="A_c" value={finForm.area} onChange={onFinChange} unitValue={finUnits.area} unitOptions={areaInM2Units} onUnitChange={onFinUnitChange("area")} />
            <NumberInput id="fin-length" name="length" label="Length" value={finForm.length} onChange={onFinChange} unitValue={finUnits.length} unitOptions={lengthUnits} onUnitChange={onFinUnitChange("length")} />
            <NumberInput id="fin-baseTemp" name="baseTemp" label="Base Temperature" value={finForm.baseTemp} onChange={onFinChange} unitValue={finUnits.baseTemp} unitOptions={temperatureUnits} onUnitChange={onFinUnitChange("baseTemp")} min="-1000" />
            <NumberInput id="fin-ambientTemp" name="ambientTemp" label="Ambient Temperature" value={finForm.ambientTemp} onChange={onFinChange} unitValue={finUnits.ambientTemp} unitOptions={temperatureUnits} onUnitChange={onFinUnitChange("ambientTemp")} min="-1000" />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    const payload = calculateFin(normalizeFinForm());
                    setFinResult(payload);
                    setFinFeedback("Fin calculation complete.");
                  } catch (error) {
                    setFinFeedback(error.message);
                  }
                }}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
              >
                Run
              </button>
              <button
                type="button"
                disabled={!finResult}
                onClick={() => saveToHistory("Heat Transfer - Fin", { ...finResult, inputs: { ...finResult.inputs, units: finUnits } }, setFinFeedback)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Save
              </button>
              <button
                type="button"
                disabled={!finResult}
                onClick={() => copyPayload("Heat Transfer - Fin", { ...finResult, inputs: { ...finResult.inputs, units: finUnits } }, setFinFeedback)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Copy Result
              </button>
            </div>
            {finFeedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{finFeedback}</p> : null}
            {finResult ? (
              <ResultPanel title="Fin Result" subtitle={finResult.formula}>
                <pre className="mono overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                  {JSON.stringify(finResult.outputs, null, 2)}
                </pre>
              </ResultPanel>
            ) : null}
          </div>
        </article>

        <article className="app-surface">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Lumped Transient Calculator</h2>
          <div className="mt-3 space-y-4">
            <NumberInput id="lumped-rho" name="rho" label="Density" value={lumpedForm.rho} onChange={onLumpedChange} unitValue={lumpedUnits.rho} unitOptions={densityUnits} onUnitChange={onLumpedUnitChange("rho")} />
            <NumberInput id="lumped-cp" name="cp" label="Specific Heat" value={lumpedForm.cp} onChange={onLumpedChange} unitValue={lumpedUnits.cp} unitOptions={specificHeatUnits} onUnitChange={onLumpedUnitChange("cp")} />
            <NumberInput id="lumped-volume" name="volume" label="Volume" value={lumpedForm.volume} onChange={onLumpedChange} unitValue={lumpedUnits.volume} unitOptions={volumeUnits} onUnitChange={onLumpedUnitChange("volume")} />
            <NumberInput id="lumped-area" name="area" label="Surface Area" value={lumpedForm.area} onChange={onLumpedChange} unitValue={lumpedUnits.area} unitOptions={areaInM2Units} onUnitChange={onLumpedUnitChange("area")} />
            <NumberInput id="lumped-h" name="h" label="h" value={lumpedForm.h} onChange={onLumpedChange} unitValue={lumpedUnits.h} unitOptions={convectionCoefficientUnits} onUnitChange={onLumpedUnitChange("h")} />
            <NumberInput id="lumped-k" name="k" label="k" value={lumpedForm.k} onChange={onLumpedChange} unitValue={lumpedUnits.k} unitOptions={thermalConductivityUnits} onUnitChange={onLumpedUnitChange("k")} />
            <NumberInput id="lumped-characteristicLength" name="characteristicLength" label="Characteristic Length" value={lumpedForm.characteristicLength} onChange={onLumpedChange} unitValue={lumpedUnits.characteristicLength} unitOptions={lengthUnits} onUnitChange={onLumpedUnitChange("characteristicLength")} />
            <NumberInput id="lumped-initialTemp" name="initialTemp" label="Initial Temperature" value={lumpedForm.initialTemp} onChange={onLumpedChange} unitValue={lumpedUnits.initialTemp} unitOptions={temperatureUnits} onUnitChange={onLumpedUnitChange("initialTemp")} min="-1000" />
            <NumberInput id="lumped-ambientTemp" name="ambientTemp" label="Ambient Temperature" value={lumpedForm.ambientTemp} onChange={onLumpedChange} unitValue={lumpedUnits.ambientTemp} unitOptions={temperatureUnits} onUnitChange={onLumpedUnitChange("ambientTemp")} min="-1000" />
            <NumberInput id="lumped-time" name="time" label="Time" value={lumpedForm.time} onChange={onLumpedChange} unitValue={lumpedUnits.time} unitOptions={timeUnits} onUnitChange={onLumpedUnitChange("time")} />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  try {
                    const payload = calculateLumped(normalizeLumpedForm());
                    setLumpedResult(payload);
                    setLumpedFeedback("Lumped analysis complete.");
                  } catch (error) {
                    setLumpedFeedback(error.message);
                  }
                }}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
              >
                Run
              </button>
              <button
                type="button"
                disabled={!lumpedResult}
                onClick={() => saveToHistory("Heat Transfer - Lumped", { ...lumpedResult, inputs: { ...lumpedResult.inputs, units: lumpedUnits } }, setLumpedFeedback)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Save
              </button>
              <button
                type="button"
                disabled={!lumpedResult}
                onClick={() => copyPayload("Heat Transfer - Lumped", { ...lumpedResult, inputs: { ...lumpedResult.inputs, units: lumpedUnits } }, setLumpedFeedback)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                Copy Result
              </button>
            </div>
            {lumpedFeedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{lumpedFeedback}</p> : null}
            {lumpedResult ? (
              <ResultPanel title="Transient Result" subtitle={lumpedResult.formula}>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/70">
                    <dt>Biot Number</dt>
                    <dd className="mono">{formatResult(lumpedResult.outputs.biot)}</dd>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/70">
                    <dt>Temperature at t</dt>
                    <dd className="mono">{formatResult(lumpedResult.outputs.temperature)} degC</dd>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800/70">
                    {lumpedResult.outputs.lumpedValid
                      ? "Bi <= 0.1: Lumped method valid."
                      : "Bi > 0.1: Use Heisler charts / detailed transient solution."}
                  </div>
                </dl>
              </ResultPanel>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}




