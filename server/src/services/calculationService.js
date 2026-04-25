import { HttpError } from "../utils/httpError.js";
import { toPositiveNumber } from "../utils/validation.js";

export const calculateStress = (payload) => {
  const force = toPositiveNumber(payload.force, "Force");
  const area = toPositiveNumber(payload.area, "Area");

  // Core axial stress relation.
  const stress = force / area;
  let strain = null;

  // Optional strain estimate from Hooke's law if E is supplied.
  if (payload.youngModulus !== undefined && payload.youngModulus !== "") {
    const youngModulus = toPositiveNumber(payload.youngModulus, "Young's modulus");
    strain = stress / youngModulus;
  }

  return {
    inputs: { force, area, youngModulus: payload.youngModulus ? Number(payload.youngModulus) : null },
    formula: "sigma = F / A",
    stress,
    strain
  };
};

export const calculateBeamDeflection = (payload) => {
  const type = String(payload.type || "").trim().toLowerCase();
  const load = toPositiveNumber(payload.load, "Load");
  const length = toPositiveNumber(payload.length, "Length");
  const youngModulus = toPositiveNumber(payload.youngModulus, "Young's modulus");
  const momentOfInertia = toPositiveNumber(payload.momentOfInertia, "Moment of inertia");

  if (type !== "cantilever" && type !== "simply-supported") {
    throw new HttpError(400, "Beam type must be either 'cantilever' or 'simply-supported'.");
  }

  const numerator = load * Math.pow(length, 3);
  // Endpoint supports both common beam cases through denominator selection.
  const denominator = type === "cantilever" ? 3 * youngModulus * momentOfInertia : 48 * youngModulus * momentOfInertia;
  const deflection = numerator / denominator;

  return {
    inputs: { type, load, length, youngModulus, momentOfInertia },
    formula: type === "cantilever" ? "delta = P L^3 / (3 E I)" : "delta = P L^3 / (48 E I)",
    deflection
  };
};

export const calculateTorsion = (payload) => {
  const torque = toPositiveNumber(payload.torque, "Torque");
  const radius = toPositiveNumber(payload.radius, "Radius");
  const polarMoment = toPositiveNumber(payload.polarMoment, "Polar moment");

  // Maximum shear stress occurs at the outer radius for circular shafts.
  const shearStress = (torque * radius) / polarMoment;

  return {
    inputs: { torque, radius, polarMoment },
    formula: "tau = T r / J",
    shearStress
  };
};
