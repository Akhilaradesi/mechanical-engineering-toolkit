import { Router } from "express";
import { postStressCalculation, postBeamCalculation, postTorsionCalculation } from "../controllers/calculateController.js";

export const calculateRouter = Router();

calculateRouter.post("/stress", postStressCalculation);
calculateRouter.post("/beam", postBeamCalculation);
calculateRouter.post("/torsion", postTorsionCalculation);
