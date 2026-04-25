import { getHistory, saveHistoryItem } from "../services/historyService.js";

export const postSaveHistory = async (req, res, next) => {
  try {
    const item = await saveHistoryItem(req.body ?? {});
    res.status(201).json({ saved: item });
  } catch (error) {
    next(error);
  }
};

export const getCalculationHistory = async (_, res, next) => {
  try {
    const history = await getHistory();
    res.json({ history });
  } catch (error) {
    next(error);
  }
};
