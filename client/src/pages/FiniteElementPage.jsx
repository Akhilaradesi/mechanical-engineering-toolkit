import { useState } from "react";
import { apiClient } from "../api/apiClient";
import { NumberInput } from "../components/common/NumberInput";
import { PageHeader } from "../components/common/PageHeader";
import { ResultPanel } from "../components/common/ResultPanel";
import { useExportPdf } from "../hooks/useExportPdf";
import { copyText } from "../utils/clipboard";
import { formatResult } from "../utils/engineering";
import { convertToBase, forceUnits, lengthUnits, modulusInPaUnits } from "../utils/unitSystems";

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

const transpose = (matrix) => matrix[0].map((_, col) => matrix.map((row) => row[col]));

const multiply = (left, right) => {
  const rows = left.length;
  const cols = right[0].length;
  const inner = right.length;
  const out = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      for (let index = 0; index < inner; index += 1) {
        out[row][col] += left[row][index] * right[index][col];
      }
    }
  }

  return out;
};

const scaleMatrix = (matrix, factor) => matrix.map((row) => row.map((value) => value * factor));

const multiplyMatrixVector = (matrix, vector) =>
  matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));

const solve2x2 = (matrix, vector) => {
  const [[a, b], [c, d]] = matrix;
  const [e, f] = vector;
  const determinant = a * d - b * c;

  if (Math.abs(determinant) < 1e-12) {
    throw new Error("Singular matrix encountered while solving.");
  }

  const x = (e * d - b * f) / determinant;
  const y = (a * f - e * c) / determinant;

  return [x, y];
};

const MatrixView = ({ title, matrix }) => (
  <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800/70">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">{title}</p>
    <div className="overflow-x-auto">
      <table className="mono min-w-full text-xs">
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr key={`${title}-row-${rowIndex}`}>
              {row.map((value, cellIndex) => (
                <td
                  key={`${title}-cell-${rowIndex}-${cellIndex}`}
                  className="border border-slate-300 px-2 py-1 text-right dark:border-slate-700"
                >
                  {formatResult(value, 6)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const saveToHistory = async (tool, payload, setFeedback) => {
  try {
    await apiClient.saveCalculation({
      tool,
      inputs: payload.inputs,
      result: payload.outputs
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

const areaInM2Units = [
  { value: "m^2", label: "m^2", toBase: 1 },
  { value: "cm^2", label: "cm^2", toBase: 0.0001 },
  { value: "mm^2", label: "mm^2", toBase: 0.000001 },
  { value: "in^2", label: "in^2", toBase: 0.00064516 }
];

const densityUnits = [
  { value: "kg/m^3", label: "kg/m^3", toBase: 1 },
  { value: "g/cm^3", label: "g/cm^3", toBase: 1000 },
  { value: "lb/ft^3", label: "lb/ft^3", toBase: 16.0184634 }
];

const stiffnessPerLengthUnits = [
  { value: "N/m", label: "N/m", toBase: 1 },
  { value: "kN/m", label: "kN/m", toBase: 1000 },
  { value: "MN/m", label: "MN/m", toBase: 1000000 },
  { value: "lbf/in", label: "lbf/in", toBase: 175.1268369864 }
];

const thermalConductivityUnits = [
  { value: "W/m.K", label: "W/m.K", toBase: 1 },
  { value: "kW/m.K", label: "kW/m.K", toBase: 1000 },
  { value: "W/mm.K", label: "W/mm.K", toBase: 1000 }
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

const convertByOptionList = (value, optionList, selectedUnit) => {
  const numeric = Number(value);
  const factor = optionList.find((option) => option.value === selectedUnit)?.toBase;
  if (!Number.isFinite(numeric) || !Number.isFinite(factor)) {
    return NaN;
  }

  return numeric * factor;
};

const convertFromTemperatureUnit = (value, unit) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return NaN;

  if (unit === "degC") return numeric;
  if (unit === "K") return numeric - 273.15;
  if (unit === "degF") return ((numeric - 32) * 5) / 9;
  return NaN;
};

const toBase = (value, family, unit) => convertToBase(value, family, unit);
const toBaseWithOptions = (value, optionList, unit) => convertByOptionList(value, optionList, unit);
const calculateBarElement = (form) => {
  const elasticModulus = toPositive(form.elasticModulus, "Elastic modulus");
  const area = toPositive(form.area, "Area");
  const length = toPositive(form.length, "Length");
  const nodalLoad = toFinite(form.nodalLoad, "Nodal load");
  const penaltyFactor = toPositive(form.penaltyFactor, "Penalty factor");

  const stiffness = (elasticModulus * area) / length;
  const matrix = [
    [stiffness, -stiffness],
    [-stiffness, stiffness]
  ];
  const eliminationU2 = nodalLoad / stiffness;
  const eliminationReactionNode1 = -nodalLoad;
  const penaltyMatrix = [
    [stiffness + penaltyFactor, -stiffness],
    [-stiffness, stiffness]
  ];
  const [u1Penalty, u2Penalty] = solve2x2(penaltyMatrix, [0, nodalLoad]);
  const penaltyReactionNode1 = penaltyFactor * u1Penalty;
  const strain = eliminationU2 / length;
  const stress = elasticModulus * strain;

  return {
    formula: "k_bar = (AE/L)[[1,-1],[-1,1]], BC by elimination and penalty",
    inputs: { elasticModulus, area, length, nodalLoad, penaltyFactor },
    outputs: {
      stiffness,
      elementMatrix: matrix,
      elimination: { u1: 0, u2: eliminationU2, reactionNode1: eliminationReactionNode1 },
      penalty: { u1: u1Penalty, u2: u2Penalty, reactionNode1: penaltyReactionNode1 },
      strain,
      stress
    }
  };
};

const calculateTrussElement = (form) => {
  const elasticModulus = toPositive(form.elasticModulus, "Elastic modulus");
  const area = toPositive(form.area, "Area");
  const x1 = toFinite(form.x1, "x1");
  const y1 = toFinite(form.y1, "y1");
  const x2 = toFinite(form.x2, "x2");
  const y2 = toFinite(form.y2, "y2");

  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length <= 0) throw new Error("Truss element length must be positive.");

  const c = dx / length;
  const s = dy / length;
  const coefficient = (elasticModulus * area) / length;
  const localStiffnessMatrix = scaleMatrix(
    [
      [1, -1],
      [-1, 1]
    ],
    coefficient
  );
  const transformationMatrix = [
    [c, s, 0, 0],
    [0, 0, c, s]
  ];
  const matrix = multiply(multiply(transpose(transformationMatrix), localStiffnessMatrix), transformationMatrix);

  let axialForce = null;
  let axialStress = null;

  if (
    form.u1 !== "" &&
    form.v1 !== "" &&
    form.u2 !== "" &&
    form.v2 !== "" &&
    [form.u1, form.v1, form.u2, form.v2].every((value) => Number.isFinite(Number(value)))
  ) {
    const displacements = [Number(form.u1), Number(form.v1), Number(form.u2), Number(form.v2)];
    const axialExtension = -c * displacements[0] - s * displacements[1] + c * displacements[2] + s * displacements[3];
    const strain = axialExtension / length;
    axialStress = elasticModulus * strain;
    axialForce = axialStress * area;
  }

  return {
    formula: "k_local = (AE/L)[[1,-1],[-1,1]], K_global = T^T k_local T",
    inputs: { elasticModulus, area, x1, y1, x2, y2, u1: form.u1, v1: form.v1, u2: form.u2, v2: form.v2 },
    outputs: {
      length,
      directionCosineC: c,
      directionCosineS: s,
      localStiffnessMatrix,
      transformationMatrix,
      globalStiffnessMatrix: matrix,
      axialForce,
      axialStress
    }
  };
};

const calculateCSTElement = (form) => {
  const elasticModulus = toPositive(form.elasticModulus, "Elastic modulus");
  const poisson = toFinite(form.poisson, "Poisson ratio");
  const thickness = toPositive(form.thickness, "Thickness");
  const x1 = toFinite(form.x1, "x1");
  const y1 = toFinite(form.y1, "y1");
  const x2 = toFinite(form.x2, "x2");
  const y2 = toFinite(form.y2, "y2");
  const x3 = toFinite(form.x3, "x3");
  const y3 = toFinite(form.y3, "y3");

  const twiceArea = x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2);
  const area = Math.abs(twiceArea) / 2;
  if (area <= 0) {
    throw new Error("CST area must be positive.");
  }

  const b1 = y2 - y3;
  const b2 = y3 - y1;
  const b3 = y1 - y2;
  const c1 = x3 - x2;
  const c2 = x1 - x3;
  const c3 = x2 - x1;

  const bMatrix = scaleMatrix(
    [
      [b1, 0, b2, 0, b3, 0],
      [0, c1, 0, c2, 0, c3],
      [c1, b1, c2, b2, c3, b3]
    ],
    1 / (2 * area)
  );

  const dMatrix = scaleMatrix(
    [
      [1, poisson, 0],
      [poisson, 1, 0],
      [0, 0, (1 - poisson) / 2]
    ],
    elasticModulus / (1 - poisson * poisson)
  );

  const elementStiffnessMatrix = scaleMatrix(multiply(multiply(transpose(bMatrix), dMatrix), bMatrix), thickness * area);

  return {
    formula: "k_CST = tA(B^TDB)",
    inputs: { elasticModulus, poisson, thickness, x1, y1, x2, y2, x3, y3 },
    outputs: { area, bMatrix, dMatrix, elementStiffnessMatrix }
  };
};

const calculateDynamicBar = (form) => {
  const density = toPositive(form.density, "Density");
  const area = toPositive(form.area, "Area");
  const length = toPositive(form.length, "Length");
  const elasticModulus = toPositive(form.elasticModulus, "Elastic modulus");

  const consistentMassMatrix = scaleMatrix(
    [
      [2, 1],
      [1, 2]
    ],
    (density * area * length) / 6
  );
  const lumpedMassMatrix = scaleMatrix(
    [
      [1, 0],
      [0, 1]
    ],
    (density * area * length) / 2
  );

  const stiffness = (elasticModulus * area) / length;
  const effectiveMass = (density * area * length) / 3;
  const naturalFrequencyRad = Math.sqrt(stiffness / effectiveMass);
  const naturalFrequencyHz = naturalFrequencyRad / (2 * Math.PI);

  return {
    formula: "M_consistent = rho A L / 6 [[2,1],[1,2]], omega = sqrt(k/m_eff)",
    inputs: { density, area, length, elasticModulus },
    outputs: { consistentMassMatrix, lumpedMassMatrix, stiffness, naturalFrequencyRad, naturalFrequencyHz }
  };
};

const calculateHeatFem1D = (form) => {
  const mode = form.mode;
  const conductivity = toPositive(form.conductivity, "Conductivity");
  const area = toPositive(form.area, "Area");
  const length = toPositive(form.length, "Length");
  const t1 = toFinite(form.t1, "T1");
  const t2 = toFinite(form.t2, "T2");

  const conductionMatrix = scaleMatrix(
    [
      [1, -1],
      [-1, 1]
    ],
    (conductivity * area) / length
  );

  if (mode === "wall") {
    const nodalHeatVector = multiplyMatrixVector(conductionMatrix, [t1, t2]);
    const heatRate = (conductivity * area * (t1 - t2)) / length;

    return {
      formula: "k_e(wall) = (kA/L)[[1,-1],[-1,1]]",
      inputs: { mode, conductivity, area, length, t1, t2 },
      outputs: { conductionMatrix, nodalHeatVector, heatRate }
    };
  }

  const convectionCoeff = toPositive(form.convectionCoeff, "Convection coefficient");
  const perimeter = toPositive(form.perimeter, "Perimeter");
  const ambientTemp = toFinite(form.ambientTemp, "Ambient temperature");

  const convectionMatrix = scaleMatrix(
    [
      [2, 1],
      [1, 2]
    ],
    (convectionCoeff * perimeter * length) / 6
  );
  const totalElementMatrix = [
    [conductionMatrix[0][0] + convectionMatrix[0][0], conductionMatrix[0][1] + convectionMatrix[0][1]],
    [conductionMatrix[1][0] + convectionMatrix[1][0], conductionMatrix[1][1] + convectionMatrix[1][1]]
  ];
  const loadVector = [(convectionCoeff * perimeter * ambientTemp * length) / 2, (convectionCoeff * perimeter * ambientTemp * length) / 2];
  const nodalResidual = multiplyMatrixVector(totalElementMatrix, [t1, t2]).map((value, index) => value - loadVector[index]);

  return {
    formula: "k_e(fin) = (kA/L)[[1,-1],[-1,1]] + (hPL/6)[[2,1],[1,2]]",
    inputs: { mode, conductivity, area, length, t1, t2, convectionCoeff, perimeter, ambientTemp },
    outputs: { conductionMatrix, convectionMatrix, totalElementMatrix, loadVector, nodalResidual }
  };
};

export function FiniteElementPage() {
  const { exportElementAsPdf } = useExportPdf();

  const [barForm, setBarForm] = useState({
    elasticModulus: "",
    area: "",
    length: "",
    nodalLoad: "",
    penaltyFactor: "1000000000000"
  });
  const [barUnits, setBarUnits] = useState({
    elasticModulus: "Pa",
    area: "m^2",
    length: "m",
    nodalLoad: "N",
    penaltyFactor: "N/m"
  });
  const [barResult, setBarResult] = useState(null);
  const [barFeedback, setBarFeedback] = useState("");

  const [trussForm, setTrussForm] = useState({
    elasticModulus: "",
    area: "",
    x1: "0",
    y1: "0",
    x2: "",
    y2: "",
    u1: "",
    v1: "",
    u2: "",
    v2: ""
  });
  const [trussUnits, setTrussUnits] = useState({
    elasticModulus: "Pa",
    area: "m^2",
    coordinate: "m",
    displacement: "m"
  });
  const [trussResult, setTrussResult] = useState(null);
  const [trussFeedback, setTrussFeedback] = useState("");
  const [cstForm, setCstForm] = useState({
    elasticModulus: "",
    poisson: "0.3",
    thickness: "",
    x1: "0",
    y1: "0",
    x2: "",
    y2: "",
    x3: "",
    y3: ""
  });
  const [cstUnits, setCstUnits] = useState({
    elasticModulus: "Pa",
    thickness: "m",
    coordinate: "m"
  });
  const [cstResult, setCstResult] = useState(null);
  const [cstFeedback, setCstFeedback] = useState("");
  const [dynamicForm, setDynamicForm] = useState({
    density: "",
    area: "",
    length: "",
    elasticModulus: ""
  });
  const [dynamicUnits, setDynamicUnits] = useState({
    density: "kg/m^3",
    area: "m^2",
    length: "m",
    elasticModulus: "Pa"
  });
  const [dynamicResult, setDynamicResult] = useState(null);
  const [dynamicFeedback, setDynamicFeedback] = useState("");
  const [heatForm, setHeatForm] = useState({
    mode: "wall",
    conductivity: "",
    area: "",
    length: "",
    t1: "",
    t2: "",
    convectionCoeff: "",
    perimeter: "",
    ambientTemp: ""
  });
  const [heatUnits, setHeatUnits] = useState({
    conductivity: "W/m.K",
    area: "m^2",
    length: "m",
    temperature: "degC",
    convectionCoeff: "W/m^2.K",
    perimeter: "m"
  });
  const [heatResult, setHeatResult] = useState(null);
  const [heatFeedback, setHeatFeedback] = useState("");


  const onBarUnitChange = (field) => (event) => {
    const { value } = event.target;
    setBarUnits((current) => ({ ...current, [field]: value }));
  };

  const onTrussUnitChange = (field) => (event) => {
    const { value } = event.target;
    setTrussUnits((current) => ({ ...current, [field]: value }));
  };

  const onCstUnitChange = (field) => (event) => {
    const { value } = event.target;
    setCstUnits((current) => ({ ...current, [field]: value }));
  };

  const onDynamicUnitChange = (field) => (event) => {
    const { value } = event.target;
    setDynamicUnits((current) => ({ ...current, [field]: value }));
  };

  const onHeatUnitChange = (field) => (event) => {
    const { value } = event.target;
    setHeatUnits((current) => ({ ...current, [field]: value }));
  };

  const normalizeBarForm = () => ({
    elasticModulus: toBase(barForm.elasticModulus, "modulusPa", barUnits.elasticModulus),
    area: toBaseWithOptions(barForm.area, areaInM2Units, barUnits.area),
    length: toBase(barForm.length, "length", barUnits.length),
    nodalLoad: toBase(barForm.nodalLoad, "force", barUnits.nodalLoad),
    penaltyFactor: toBaseWithOptions(barForm.penaltyFactor, stiffnessPerLengthUnits, barUnits.penaltyFactor)
  });

  const normalizeTrussForm = () => ({
    elasticModulus: toBase(trussForm.elasticModulus, "modulusPa", trussUnits.elasticModulus),
    area: toBaseWithOptions(trussForm.area, areaInM2Units, trussUnits.area),
    x1: toBase(trussForm.x1, "length", trussUnits.coordinate),
    y1: toBase(trussForm.y1, "length", trussUnits.coordinate),
    x2: toBase(trussForm.x2, "length", trussUnits.coordinate),
    y2: toBase(trussForm.y2, "length", trussUnits.coordinate),
    u1: trussForm.u1 === "" ? "" : toBase(trussForm.u1, "length", trussUnits.displacement),
    v1: trussForm.v1 === "" ? "" : toBase(trussForm.v1, "length", trussUnits.displacement),
    u2: trussForm.u2 === "" ? "" : toBase(trussForm.u2, "length", trussUnits.displacement),
    v2: trussForm.v2 === "" ? "" : toBase(trussForm.v2, "length", trussUnits.displacement)
  });

  const normalizeCstForm = () => ({
    elasticModulus: toBase(cstForm.elasticModulus, "modulusPa", cstUnits.elasticModulus),
    poisson: cstForm.poisson,
    thickness: toBase(cstForm.thickness, "length", cstUnits.thickness),
    x1: toBase(cstForm.x1, "length", cstUnits.coordinate),
    y1: toBase(cstForm.y1, "length", cstUnits.coordinate),
    x2: toBase(cstForm.x2, "length", cstUnits.coordinate),
    y2: toBase(cstForm.y2, "length", cstUnits.coordinate),
    x3: toBase(cstForm.x3, "length", cstUnits.coordinate),
    y3: toBase(cstForm.y3, "length", cstUnits.coordinate)
  });

  const normalizeDynamicForm = () => ({
    density: toBaseWithOptions(dynamicForm.density, densityUnits, dynamicUnits.density),
    area: toBaseWithOptions(dynamicForm.area, areaInM2Units, dynamicUnits.area),
    length: toBase(dynamicForm.length, "length", dynamicUnits.length),
    elasticModulus: toBase(dynamicForm.elasticModulus, "modulusPa", dynamicUnits.elasticModulus)
  });

  const normalizeHeatForm = () => ({
    mode: heatForm.mode,
    conductivity: toBaseWithOptions(heatForm.conductivity, thermalConductivityUnits, heatUnits.conductivity),
    area: toBaseWithOptions(heatForm.area, areaInM2Units, heatUnits.area),
    length: toBase(heatForm.length, "length", heatUnits.length),
    t1: convertFromTemperatureUnit(heatForm.t1, heatUnits.temperature),
    t2: convertFromTemperatureUnit(heatForm.t2, heatUnits.temperature),
    convectionCoeff:
      heatForm.convectionCoeff === ""
        ? ""
        : toBaseWithOptions(heatForm.convectionCoeff, convectionCoefficientUnits, heatUnits.convectionCoeff),
    perimeter: heatForm.perimeter === "" ? "" : toBase(heatForm.perimeter, "length", heatUnits.perimeter),
    ambientTemp: heatForm.ambientTemp === "" ? "" : convertFromTemperatureUnit(heatForm.ambientTemp, heatUnits.temperature)
  });
  const formulaSections = [
    {
      title: "FEM Fundamentals",
      items: [
        "Workflow: discretize -> element equations -> assemble global matrices -> apply BC -> solve.",
        "Advantages: handles complex geometry, mixed loads, and multi-material domains.",
        "Applications: structural stress, vibration, and steady heat transfer."
      ]
    },
    {
      title: "Discretization and Model Formulation",
      items: [
        "Domain is split into finite elements connected at nodes.",
        "Element matrices are assembled into [K]{u} = {F}.",
        "Element families used here: bar, 2D truss, and CST."
      ]
    },
    {
      title: "Shape Functions and Coordinates",
      items: [
        "Linear bar shape functions: N1 = 1 - x/L, N2 = x/L.",
        "Natural coordinate form (xi): N1 = (1 - xi)/2, N2 = (1 + xi)/2.",
        "Global mapping example: x = N1 x1 + N2 x2."
      ]
    },
    {
      title: "BCs and Element Matrices",
      items: [
        "Boundary condition methods: elimination and penalty approaches.",
        "Bar: k = (AE/L)[[1,-1],[-1,1]], Truss: K = T^T k_local T, CST: k = tA(B^TDB).",
        "Dynamic bar uses consistent/lumped mass matrices; 1D heat FEM covers wall and fin."
      ]
    }
  ];

  return (
    <div>
      <PageHeader
        title="Finite Element Technique"
        description="Syllabus-aligned FEM module with matrix-level calculators for bar, truss, CST, dynamic analysis, and 1D steady heat transfer."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {formulaSections.map((section) => (
          <article key={section.title} className="app-surface">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{section.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {section.items.map((item) => (
                <li key={item} className="rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800/80">
                  <span className="mono text-xs">{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="app-surface" id="fem-bar-export">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Bar Element + BC Treatment</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Fixed node-1 with nodal load at node-2, comparing elimination and penalty methods.</p>

          <div className="mt-3 space-y-4">
            <NumberInput id="bar-e" label="Elastic Modulus" value={barForm.elasticModulus} onChange={(event) => setBarForm((current) => ({ ...current, elasticModulus: event.target.value }))} unitValue={barUnits.elasticModulus} unitOptions={modulusInPaUnits} onUnitChange={onBarUnitChange("elasticModulus")} />
            <NumberInput id="bar-a" label="Area" value={barForm.area} onChange={(event) => setBarForm((current) => ({ ...current, area: event.target.value }))} unitValue={barUnits.area} unitOptions={areaInM2Units} onUnitChange={onBarUnitChange("area")} />
            <NumberInput id="bar-l" label="Length" value={barForm.length} onChange={(event) => setBarForm((current) => ({ ...current, length: event.target.value }))} unitValue={barUnits.length} unitOptions={lengthUnits} onUnitChange={onBarUnitChange("length")} />
            <NumberInput id="bar-f" label="Node-2 Load" value={barForm.nodalLoad} onChange={(event) => setBarForm((current) => ({ ...current, nodalLoad: event.target.value }))} unitValue={barUnits.nodalLoad} unitOptions={forceUnits} onUnitChange={onBarUnitChange("nodalLoad")} />
            <NumberInput id="bar-penalty" label="Penalty Factor" value={barForm.penaltyFactor} onChange={(event) => setBarForm((current) => ({ ...current, penaltyFactor: event.target.value }))} unitValue={barUnits.penaltyFactor} unitOptions={stiffnessPerLengthUnits} onUnitChange={onBarUnitChange("penaltyFactor")} />

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { try { const payload = calculateBarElement(normalizeBarForm()); setBarResult(payload); setBarFeedback("Bar solution ready."); } catch (error) { setBarFeedback(error.message); } }} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                Run
              </button>
              <button type="button" disabled={!barResult} onClick={() => saveToHistory("FEM - Bar Element", barResult, setBarFeedback)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Save
              </button>
              <button type="button" disabled={!barResult} onClick={() => copyPayload("FEM - Bar Element", barResult, setBarFeedback)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Copy Result
              </button>
              <button type="button" disabled={!barResult} onClick={async () => { try { await exportElementAsPdf("fem-bar-export", "fem-bar-element.pdf"); } catch (error) { setBarFeedback(error.message); } }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Export PDF
              </button>
            </div>
            {barFeedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{barFeedback}</p> : null}

            {barResult ? (
              <ResultPanel title="Bar Result" subtitle={barResult.formula}>
                <div className="space-y-3">
                  <MatrixView title="Element Stiffness Matrix" matrix={barResult.outputs.elementMatrix} />
                  <div className="rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800/70">
                    <p className="mono">Elimination: u2 = {formatResult(barResult.outputs.elimination.u2)} m, R1 = {formatResult(barResult.outputs.elimination.reactionNode1)} N</p>
                    <p className="mono mt-1">Penalty: u1 = {formatResult(barResult.outputs.penalty.u1)} m, u2 = {formatResult(barResult.outputs.penalty.u2)} m</p>
                    <p className="mono mt-1">Stress = {formatResult(barResult.outputs.stress)} Pa</p>
                  </div>
                </div>
              </ResultPanel>
            ) : null}
          </div>
        </article>

        <article className="app-surface" id="fem-truss-export">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">2D Truss Element Matrix</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Builds global element matrix and optional axial-force recovery from nodal displacements.</p>

          <div className="mt-3 space-y-4">
            <NumberInput id="truss-e" label="Elastic Modulus" value={trussForm.elasticModulus} onChange={(event) => setTrussForm((current) => ({ ...current, elasticModulus: event.target.value }))} unitValue={trussUnits.elasticModulus} unitOptions={modulusInPaUnits} onUnitChange={onTrussUnitChange("elasticModulus")} />
            <NumberInput id="truss-a" label="Area" value={trussForm.area} onChange={(event) => setTrussForm((current) => ({ ...current, area: event.target.value }))} unitValue={trussUnits.area} unitOptions={areaInM2Units} onUnitChange={onTrussUnitChange("area")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput id="truss-x1" label="x1" value={trussForm.x1} onChange={(event) => setTrussForm((current) => ({ ...current, x1: event.target.value }))} unitValue={trussUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onTrussUnitChange("coordinate")} />
              <NumberInput id="truss-y1" label="y1" value={trussForm.y1} onChange={(event) => setTrussForm((current) => ({ ...current, y1: event.target.value }))} unitValue={trussUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onTrussUnitChange("coordinate")} />
              <NumberInput id="truss-x2" label="x2" value={trussForm.x2} onChange={(event) => setTrussForm((current) => ({ ...current, x2: event.target.value }))} unitValue={trussUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onTrussUnitChange("coordinate")} />
              <NumberInput id="truss-y2" label="y2" value={trussForm.y2} onChange={(event) => setTrussForm((current) => ({ ...current, y2: event.target.value }))} unitValue={trussUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onTrussUnitChange("coordinate")} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Optional displacement inputs: u1, v1, u2, v2</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput id="truss-u1" label="u1" value={trussForm.u1} onChange={(event) => setTrussForm((current) => ({ ...current, u1: event.target.value }))} unitValue={trussUnits.displacement} unitOptions={lengthUnits} onUnitChange={onTrussUnitChange("displacement")} />
              <NumberInput id="truss-v1" label="v1" value={trussForm.v1} onChange={(event) => setTrussForm((current) => ({ ...current, v1: event.target.value }))} unitValue={trussUnits.displacement} unitOptions={lengthUnits} onUnitChange={onTrussUnitChange("displacement")} />
              <NumberInput id="truss-u2" label="u2" value={trussForm.u2} onChange={(event) => setTrussForm((current) => ({ ...current, u2: event.target.value }))} unitValue={trussUnits.displacement} unitOptions={lengthUnits} onUnitChange={onTrussUnitChange("displacement")} />
              <NumberInput id="truss-v2" label="v2" value={trussForm.v2} onChange={(event) => setTrussForm((current) => ({ ...current, v2: event.target.value }))} unitValue={trussUnits.displacement} unitOptions={lengthUnits} onUnitChange={onTrussUnitChange("displacement")} />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { try { const payload = calculateTrussElement(normalizeTrussForm()); setTrussResult(payload); setTrussFeedback("Truss matrix ready."); } catch (error) { setTrussFeedback(error.message); } }} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                Run
              </button>
              <button type="button" disabled={!trussResult} onClick={() => saveToHistory("FEM - Truss Element", trussResult, setTrussFeedback)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Save
              </button>
              <button type="button" disabled={!trussResult} onClick={() => copyPayload("FEM - Truss Element", trussResult, setTrussFeedback)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Copy Result
              </button>
            </div>
            {trussFeedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{trussFeedback}</p> : null}

            {trussResult ? (
              <ResultPanel title="Truss Result" subtitle={trussResult.formula}>
                <div className="space-y-3">
                  <MatrixView title="Local Stiffness Matrix (2x2)" matrix={trussResult.outputs.localStiffnessMatrix} />
                  <MatrixView title="Transformation Matrix T (2x4)" matrix={trussResult.outputs.transformationMatrix} />
                  <MatrixView title="Global Stiffness Matrix (4x4)" matrix={trussResult.outputs.globalStiffnessMatrix} />
                  <div className="rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800/70">
                    <p className="mono">L = {formatResult(trussResult.outputs.length)} m, c = {formatResult(trussResult.outputs.directionCosineC)}, s = {formatResult(trussResult.outputs.directionCosineS)}</p>
                    {Number.isFinite(trussResult.outputs.axialForce) ? (
                      <p className="mono mt-1">Axial force = {formatResult(trussResult.outputs.axialForce)} N, stress = {formatResult(trussResult.outputs.axialStress)} Pa</p>
                    ) : (
                      <p className="mono mt-1">Enter nodal displacements to recover axial force and stress.</p>
                    )}
                  </div>
                </div>
              </ResultPanel>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <article className="app-surface" id="fem-cst-export">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">CST Element (2D Stress)</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Constant strain triangle with plane-stress D matrix and full element stiffness computation.</p>

          <div className="mt-3 space-y-4">
            <NumberInput id="cst-e" label="Elastic Modulus" value={cstForm.elasticModulus} onChange={(event) => setCstForm((current) => ({ ...current, elasticModulus: event.target.value }))} unitValue={cstUnits.elasticModulus} unitOptions={modulusInPaUnits} onUnitChange={onCstUnitChange("elasticModulus")} />
            <NumberInput id="cst-nu" label="Poisson Ratio" value={cstForm.poisson} onChange={(event) => setCstForm((current) => ({ ...current, poisson: event.target.value }))} />
            <NumberInput id="cst-thickness" label="Thickness" value={cstForm.thickness} onChange={(event) => setCstForm((current) => ({ ...current, thickness: event.target.value }))} unitValue={cstUnits.thickness} unitOptions={lengthUnits} onUnitChange={onCstUnitChange("thickness")} />
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberInput id="cst-x1" label="x1" value={cstForm.x1} onChange={(event) => setCstForm((current) => ({ ...current, x1: event.target.value }))} unitValue={cstUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onCstUnitChange("coordinate")} />
              <NumberInput id="cst-y1" label="y1" value={cstForm.y1} onChange={(event) => setCstForm((current) => ({ ...current, y1: event.target.value }))} unitValue={cstUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onCstUnitChange("coordinate")} />
              <NumberInput id="cst-x2" label="x2" value={cstForm.x2} onChange={(event) => setCstForm((current) => ({ ...current, x2: event.target.value }))} unitValue={cstUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onCstUnitChange("coordinate")} />
              <NumberInput id="cst-y2" label="y2" value={cstForm.y2} onChange={(event) => setCstForm((current) => ({ ...current, y2: event.target.value }))} unitValue={cstUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onCstUnitChange("coordinate")} />
              <NumberInput id="cst-x3" label="x3" value={cstForm.x3} onChange={(event) => setCstForm((current) => ({ ...current, x3: event.target.value }))} unitValue={cstUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onCstUnitChange("coordinate")} />
              <NumberInput id="cst-y3" label="y3" value={cstForm.y3} onChange={(event) => setCstForm((current) => ({ ...current, y3: event.target.value }))} unitValue={cstUnits.coordinate} unitOptions={lengthUnits} onUnitChange={onCstUnitChange("coordinate")} />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => { try { const payload = calculateCSTElement(normalizeCstForm()); setCstResult(payload); setCstFeedback("CST matrices ready."); } catch (error) { setCstFeedback(error.message); } }} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                Run
              </button>
              <button type="button" disabled={!cstResult} onClick={() => saveToHistory("FEM - CST Element", cstResult, setCstFeedback)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Save
              </button>
              <button type="button" disabled={!cstResult} onClick={() => copyPayload("FEM - CST Element", cstResult, setCstFeedback)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Copy Result
              </button>
              <button type="button" disabled={!cstResult} onClick={async () => { try { await exportElementAsPdf("fem-cst-export", "fem-cst.pdf"); } catch (error) { setCstFeedback(error.message); } }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Export PDF
              </button>
            </div>
            {cstFeedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{cstFeedback}</p> : null}

            {cstResult ? (
              <ResultPanel title="CST Result" subtitle={cstResult.formula}>
                <div className="space-y-3">
                  <p className="mono rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800/70">Area = {formatResult(cstResult.outputs.area)} m^2</p>
                  <MatrixView title="B Matrix" matrix={cstResult.outputs.bMatrix} />
                  <MatrixView title="D Matrix" matrix={cstResult.outputs.dMatrix} />
                  <MatrixView title="Element Stiffness Matrix (6x6)" matrix={cstResult.outputs.elementStiffnessMatrix} />
                </div>
              </ResultPanel>
            ) : null}
          </div>
        </article>

        <article className="app-surface" id="fem-dynamic-export">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Dynamic Bar + 1D Heat FEM</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Mass matrix of bar element and steady-state 1D FEM matrices for wall/fin models.</p>

          <div className="mt-3 space-y-5">
            <div className="space-y-3 rounded-xl border border-slate-300/70 p-3 dark:border-slate-700/70">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Dynamic Bar Inputs</h3>
              <NumberInput id="dyn-rho" label="Density" value={dynamicForm.density} onChange={(event) => setDynamicForm((current) => ({ ...current, density: event.target.value }))} unitValue={dynamicUnits.density} unitOptions={densityUnits} onUnitChange={onDynamicUnitChange("density")} />
              <NumberInput id="dyn-a" label="Area" value={dynamicForm.area} onChange={(event) => setDynamicForm((current) => ({ ...current, area: event.target.value }))} unitValue={dynamicUnits.area} unitOptions={areaInM2Units} onUnitChange={onDynamicUnitChange("area")} />
              <NumberInput id="dyn-l" label="Length" value={dynamicForm.length} onChange={(event) => setDynamicForm((current) => ({ ...current, length: event.target.value }))} unitValue={dynamicUnits.length} unitOptions={lengthUnits} onUnitChange={onDynamicUnitChange("length")} />
              <NumberInput id="dyn-e" label="Elastic Modulus" value={dynamicForm.elasticModulus} onChange={(event) => setDynamicForm((current) => ({ ...current, elasticModulus: event.target.value }))} unitValue={dynamicUnits.elasticModulus} unitOptions={modulusInPaUnits} onUnitChange={onDynamicUnitChange("elasticModulus")} />
              <button type="button" onClick={() => { try { const payload = calculateDynamicBar(normalizeDynamicForm()); setDynamicResult(payload); setDynamicFeedback("Dynamic matrix ready."); } catch (error) { setDynamicFeedback(error.message); } }} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                Run Dynamic
              </button>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-300/70 p-3 dark:border-slate-700/70">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">1D Heat FEM Inputs</h3>
              <div className="space-y-2">
                <label htmlFor="heat-mode" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mode</label>
                <select id="heat-mode" value={heatForm.mode} onChange={(event) => setHeatForm((current) => ({ ...current, mode: event.target.value }))} className="w-full rounded-xl border border-slate-300/80 bg-white/90 px-3 py-2.5 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30 dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-100">
                  <option value="wall">Wall</option>
                  <option value="fin">Fin</option>
                </select>
              </div>
              <NumberInput id="heat-k" label="Conductivity" value={heatForm.conductivity} onChange={(event) => setHeatForm((current) => ({ ...current, conductivity: event.target.value }))} unitValue={heatUnits.conductivity} unitOptions={thermalConductivityUnits} onUnitChange={onHeatUnitChange("conductivity")} />
              <NumberInput id="heat-a" label="Area" value={heatForm.area} onChange={(event) => setHeatForm((current) => ({ ...current, area: event.target.value }))} unitValue={heatUnits.area} unitOptions={areaInM2Units} onUnitChange={onHeatUnitChange("area")} />
              <NumberInput id="heat-l" label="Length" value={heatForm.length} onChange={(event) => setHeatForm((current) => ({ ...current, length: event.target.value }))} unitValue={heatUnits.length} unitOptions={lengthUnits} onUnitChange={onHeatUnitChange("length")} />
              <NumberInput id="heat-t1" label="T1" value={heatForm.t1} onChange={(event) => setHeatForm((current) => ({ ...current, t1: event.target.value }))} unitValue={heatUnits.temperature} unitOptions={temperatureUnits} onUnitChange={onHeatUnitChange("temperature")} min="-1000" />
              <NumberInput id="heat-t2" label="T2" value={heatForm.t2} onChange={(event) => setHeatForm((current) => ({ ...current, t2: event.target.value }))} unitValue={heatUnits.temperature} unitOptions={temperatureUnits} onUnitChange={onHeatUnitChange("temperature")} min="-1000" />
              {heatForm.mode === "fin" ? (
                <>
                  <NumberInput id="heat-h" label="Convection Coefficient" value={heatForm.convectionCoeff} onChange={(event) => setHeatForm((current) => ({ ...current, convectionCoeff: event.target.value }))} unitValue={heatUnits.convectionCoeff} unitOptions={convectionCoefficientUnits} onUnitChange={onHeatUnitChange("convectionCoeff")} />
                  <NumberInput id="heat-p" label="Perimeter" value={heatForm.perimeter} onChange={(event) => setHeatForm((current) => ({ ...current, perimeter: event.target.value }))} unitValue={heatUnits.perimeter} unitOptions={lengthUnits} onUnitChange={onHeatUnitChange("perimeter")} />
                  <NumberInput id="heat-ta" label="Ambient Temperature" value={heatForm.ambientTemp} onChange={(event) => setHeatForm((current) => ({ ...current, ambientTemp: event.target.value }))} unitValue={heatUnits.temperature} unitOptions={temperatureUnits} onUnitChange={onHeatUnitChange("temperature")} min="-1000" />
                </>
              ) : null}
              <button type="button" onClick={() => { try { const payload = calculateHeatFem1D(normalizeHeatForm()); setHeatResult(payload); setHeatFeedback("Heat FEM matrix ready."); } catch (error) { setHeatFeedback(error.message); } }} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                Run Heat FEM
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" disabled={!dynamicResult} onClick={() => saveToHistory("FEM - Dynamic Bar", dynamicResult, setDynamicFeedback)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Save Dynamic
              </button>
              <button type="button" disabled={!heatResult} onClick={() => saveToHistory("FEM - 1D Heat", heatResult, setHeatFeedback)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Save Heat
              </button>
              <button type="button" disabled={!dynamicResult && !heatResult} onClick={async () => { try { await exportElementAsPdf("fem-dynamic-export", "fem-dynamic-heat.pdf"); } catch (error) { setDynamicFeedback(error.message); } }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700">
                Export PDF
              </button>
            </div>
            {dynamicFeedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{dynamicFeedback}</p> : null}
            {heatFeedback ? <p className="text-sm text-cyan-700 dark:text-cyan-300">{heatFeedback}</p> : null}

            {dynamicResult ? (
              <ResultPanel title="Dynamic Bar Result" subtitle={dynamicResult.formula}>
                <div className="space-y-3">
                  <MatrixView title="Consistent Mass Matrix" matrix={dynamicResult.outputs.consistentMassMatrix} />
                  <MatrixView title="Lumped Mass Matrix" matrix={dynamicResult.outputs.lumpedMassMatrix} />
                  <p className="mono rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800/70">
                    Natural frequency = {formatResult(dynamicResult.outputs.naturalFrequencyRad)} rad/s ({formatResult(dynamicResult.outputs.naturalFrequencyHz)} Hz)
                  </p>
                </div>
              </ResultPanel>
            ) : null}

            {heatResult ? (
              <ResultPanel title="1D Heat FEM Result" subtitle={heatResult.formula}>
                <div className="space-y-3">
                  <MatrixView title="Conduction Matrix" matrix={heatResult.outputs.conductionMatrix} />
                  {heatResult.outputs.convectionMatrix ? <MatrixView title="Convection Matrix" matrix={heatResult.outputs.convectionMatrix} /> : null}
                  {heatResult.outputs.totalElementMatrix ? <MatrixView title="Total Element Matrix" matrix={heatResult.outputs.totalElementMatrix} /> : null}
                  <pre className="mono overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800/70">
                    {JSON.stringify(heatResult.outputs, null, 2)}
                  </pre>
                </div>
              </ResultPanel>
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}








