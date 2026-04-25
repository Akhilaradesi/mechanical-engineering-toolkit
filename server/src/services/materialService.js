import { materials } from "../data/materials.js";
import { toBoolean } from "../utils/validation.js";

export const listMaterials = () => materials;

export const recommendMaterial = (payload) => {
  const preferences = {
    highStrength: toBoolean(payload.highStrength),
    lowWeight: toBoolean(payload.lowWeight),
    lowCost: toBoolean(payload.lowCost)
  };

  const activePreferenceCount = Object.values(preferences).filter(Boolean).length;

  const ranked = materials
    .map((material) => {
      let score = 0;

      if (preferences.highStrength) score += material.strengthScore;
      if (preferences.lowWeight) score += material.weightScore;
      if (preferences.lowCost) score += material.costScore;

      if (activePreferenceCount === 0) score = material.strengthScore + material.weightScore + material.costScore;

      return { ...material, score };
    })
    .sort((a, b) => b.score - a.score);

  return {
    preferences,
    recommended: ranked[0],
    rankedMaterials: ranked
  };
};
