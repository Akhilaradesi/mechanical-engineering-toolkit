const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NaN;
};

export const formatResult = (value, precision = 6) => {
  if (!Number.isFinite(value)) return "--";
  if (value === 0) return "0";

  const absolute = Math.abs(value);
  if (absolute >= 1e4 || absolute < 1e-3) {
    return value.toExponential(4);
  }

  return value.toFixed(precision).replace(/\.?0+$/, "");
};

export const stressPreview = ({ force, area, youngModulus }) => {
  const parsedForce = toNumber(force);
  const parsedArea = toNumber(area);
  const parsedYoung = youngModulus === "" ? NaN : toNumber(youngModulus);

  if (parsedForce <= 0 || parsedArea <= 0) {
    return { isValid: false, stress: NaN, strain: NaN };
  }

  const stress = parsedForce / parsedArea;
  const strain = parsedYoung > 0 ? stress / parsedYoung : NaN;

  return { isValid: true, stress, strain };
};

export const beamPreview = ({ type, load, length, youngModulus, momentOfInertia }) => {
  const p = toNumber(load);
  const l = toNumber(length);
  const e = toNumber(youngModulus);
  const i = toNumber(momentOfInertia);
  if (p <= 0 || l <= 0 || e <= 0 || i <= 0) {
    return { isValid: false, deflection: NaN };
  }

  const denominator = type === "cantilever" ? 3 * e * i : 48 * e * i;
  return { isValid: true, deflection: (p * Math.pow(l, 3)) / denominator };
};

export const torsionPreview = ({ torque, radius, polarMoment }) => {
  const t = toNumber(torque);
  const r = toNumber(radius);
  const j = toNumber(polarMoment);
  if (t <= 0 || r <= 0 || j <= 0) {
    return { isValid: false, shearStress: NaN };
  }

  return { isValid: true, shearStress: (t * r) / j };
};

export const generateStressCurve = (force, area, points = 8) => {
  const parsedArea = toNumber(area);
  if (parsedArea <= 0) return { labels: [], values: [] };

  const maxForce = Math.max(toNumber(force), 10);
  const labels = [];
  const values = [];
  const step = maxForce / points;

  for (let index = 1; index <= points; index += 1) {
    const currentForce = step * index;
    labels.push(formatResult(currentForce, 2));
    values.push(currentForce / parsedArea);
  }

  return { labels, values };
};

export const generateBeamCurve = (type, load, length, youngModulus, momentOfInertia, points = 24) => {
  const p = toNumber(load);
  const l = toNumber(length);
  const e = toNumber(youngModulus);
  const i = toNumber(momentOfInertia);

  if (p <= 0 || l <= 0 || e <= 0 || i <= 0) {
    return { labels: [], values: [] };
  }

  const labels = [];
  const values = [];

  for (let point = 0; point <= points; point += 1) {
    const x = (l * point) / points;
    let y = 0;

    if (type === "cantilever") {
      y = (p * x * x * (3 * l - x)) / (6 * e * i);
    } else {
      const mirrorX = x <= l / 2 ? x : l - x;
      y = (p * mirrorX * (3 * l * l - 4 * mirrorX * mirrorX)) / (48 * e * i);
    }

    labels.push(formatResult(x, 3));
    values.push(y);
  }

  return { labels, values };
};

export const generateTorsionCurve = (torque, radius, polarMoment, points = 10) => {
  const t = toNumber(torque);
  const rMax = toNumber(radius);
  const j = toNumber(polarMoment);

  if (t <= 0 || rMax <= 0 || j <= 0) {
    return { labels: [], values: [] };
  }

  const labels = [];
  const values = [];

  for (let point = 0; point <= points; point += 1) {
    const currentRadius = (rMax * point) / points;
    labels.push(formatResult(currentRadius, 3));
    values.push((t * currentRadius) / j);
  }

  return { labels, values };
};

export const validatePositiveValues = (inputMap) => {
  const errors = {};

  Object.entries(inputMap).forEach(([name, rawValue]) => {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) {
      errors[name] = "Enter a positive number.";
    }
  });

  return errors;
};
