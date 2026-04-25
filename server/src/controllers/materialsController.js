import { listMaterials, recommendMaterial } from "../services/materialService.js";

export const getMaterials = (_, res) => {
  res.json({ materials: listMaterials() });
};

export const getMaterialRecommendation = (req, res) => {
  const recommendation = recommendMaterial(req.body ?? {});
  res.json(recommendation);
};
