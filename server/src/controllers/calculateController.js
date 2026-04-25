import { calculateStress, calculateBeamDeflection, calculateTorsion } from "../services/calculationService.js";

export const postStressCalculation = (req, res) => {
  const result = calculateStress(req.body ?? {});
  res.json(result);
};

export const postBeamCalculation = (req, res) => {
  const result = calculateBeamDeflection(req.body ?? {});
  res.json(result);
};

export const postTorsionCalculation = (req, res) => {
  const result = calculateTorsion(req.body ?? {});
  res.json(result);
};
