import { Router } from "express";
import { getCalculationHistory, postSaveHistory } from "../controllers/historyController.js";

export const historyRouter = Router();

historyRouter.post("/save", postSaveHistory);
historyRouter.get("/history", getCalculationHistory);
