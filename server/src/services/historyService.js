import path from "node:path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { HttpError } from "../utils/httpError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HISTORY_FILE_PATH = path.resolve(__dirname, "../../storage/history.json");

const ensureHistoryFile = async () => {
  try {
    await fs.access(HISTORY_FILE_PATH);
  } catch {
    await fs.mkdir(path.dirname(HISTORY_FILE_PATH), { recursive: true });
    await fs.writeFile(HISTORY_FILE_PATH, "[]", "utf-8");
  }
};

const readHistoryFromDisk = async () => {
  await ensureHistoryFile();
  const fileBuffer = await fs.readFile(HISTORY_FILE_PATH, "utf-8");
  const parsed = JSON.parse(fileBuffer);

  if (!Array.isArray(parsed)) {
    throw new HttpError(500, "History file is corrupted.");
  }

  return parsed;
};

const writeHistoryToDisk = async (historyItems) => {
  await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(historyItems, null, 2), "utf-8");
};

export const getHistory = async () => {
  const historyItems = await readHistoryFromDisk();

  return historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const saveHistoryItem = async (payload) => {
  const tool = String(payload.tool || "").trim();
  const inputs = payload.inputs;
  const result = payload.result;

  if (!tool) {
    throw new HttpError(400, "Tool is required.");
  }
  if (!inputs || typeof inputs !== "object") {
    throw new HttpError(400, "Inputs are required.");
  }
  if (!result || typeof result !== "object") {
    throw new HttpError(400, "Result is required.");
  }

  const historyItems = await readHistoryFromDisk();
  const nextItem = {
    id: randomUUID(),
    tool,
    inputs,
    result,
    timestamp: new Date().toISOString()
  };

  // Keep storage bounded so the JSON file remains lightweight for demos.
  const updated = [nextItem, ...historyItems].slice(0, 500);
  await writeHistoryToDisk(updated);

  return nextItem;
};
