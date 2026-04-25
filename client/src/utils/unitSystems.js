const toFactorMap = (unitList) => Object.fromEntries(unitList.map((item) => [item.value, item.toBase]));

export const forceUnits = [
  { value: "N", label: "N", toBase: 1 },
  { value: "kN", label: "kN", toBase: 1000 },
  { value: "lbf", label: "lbf", toBase: 4.44822 }
];

export const lengthUnits = [
  { value: "m", label: "m", toBase: 1 },
  { value: "mm", label: "mm", toBase: 0.001 },
  { value: "cm", label: "cm", toBase: 0.01 },
  { value: "in", label: "in", toBase: 0.0254 },
  { value: "ft", label: "ft", toBase: 0.3048 }
];

export const areaUnits = [
  { value: "mm^2", label: "mm^2", toBase: 1 },
  { value: "cm^2", label: "cm^2", toBase: 100 },
  { value: "m^2", label: "m^2", toBase: 1000000 },
  { value: "in^2", label: "in^2", toBase: 645.16 }
];

export const modulusInMPaUnits = [
  { value: "MPa", label: "MPa", toBase: 1 },
  { value: "GPa", label: "GPa", toBase: 1000 },
  { value: "Pa", label: "Pa", toBase: 0.000001 },
  { value: "psi", label: "psi", toBase: 0.00689476 }
];

export const stressOutputUnits = [
  { value: "MPa", label: "MPa", toBase: 1 },
  { value: "Pa", label: "Pa", toBase: 0.000001 },
  { value: "psi", label: "psi", toBase: 0.00689476 }
];

export const modulusInPaUnits = [
  { value: "Pa", label: "Pa", toBase: 1 },
  { value: "MPa", label: "MPa", toBase: 1000000 },
  { value: "GPa", label: "GPa", toBase: 1000000000 },
  { value: "psi", label: "psi", toBase: 6894.76 }
];

export const momentInertiaUnits = [
  { value: "m^4", label: "m^4", toBase: 1 },
  { value: "cm^4", label: "cm^4", toBase: 0.00000001 },
  { value: "mm^4", label: "mm^4", toBase: 0.000000000001 },
  { value: "in^4", label: "in^4", toBase: 0.000000416231 }
];

export const deflectionUnits = [
  { value: "m", label: "m", toBase: 1 },
  { value: "mm", label: "mm", toBase: 0.001 },
  { value: "in", label: "in", toBase: 0.0254 }
];

export const torqueUnits = [
  { value: "N*m", label: "N*m", toBase: 1 },
  { value: "kN*m", label: "kN*m", toBase: 1000 },
  { value: "lb*ft", label: "lb*ft", toBase: 1.35582 }
];

export const shearStressUnits = [
  { value: "Pa", label: "Pa", toBase: 1 },
  { value: "MPa", label: "MPa", toBase: 1000000 },
  { value: "psi", label: "psi", toBase: 6894.76 }
];

const unitFactors = {
  force: toFactorMap(forceUnits),
  length: toFactorMap(lengthUnits),
  area: toFactorMap(areaUnits),
  modulusMPa: toFactorMap(modulusInMPaUnits),
  modulusPa: toFactorMap(modulusInPaUnits),
  momentInertia: toFactorMap(momentInertiaUnits),
  deflection: toFactorMap(deflectionUnits),
  torque: toFactorMap(torqueUnits),
  stressOutput: toFactorMap(stressOutputUnits),
  shearStress: toFactorMap(shearStressUnits)
};

export const convertToBase = (value, family, unit) => {
  const numeric = Number(value);
  const factor = unitFactors[family]?.[unit];
  if (!Number.isFinite(numeric) || !Number.isFinite(factor)) return NaN;

  return numeric * factor;
};

export const convertFromBase = (value, family, unit) => {
  const numeric = Number(value);
  const factor = unitFactors[family]?.[unit];
  if (!Number.isFinite(numeric) || !Number.isFinite(factor) || factor === 0) return NaN;

  return numeric / factor;
};
