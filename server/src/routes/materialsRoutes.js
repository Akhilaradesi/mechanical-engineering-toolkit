import { Router } from "express";
import { getMaterials, getMaterialRecommendation } from "../controllers/materialsController.js";

export const materialsRouter = Router();

materialsRouter.get("/", getMaterials);
materialsRouter.post("/recommend", getMaterialRecommendation);
