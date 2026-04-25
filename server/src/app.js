import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { materialsRouter } from "./routes/materialsRoutes.js";
import { calculateRouter } from "./routes/calculateRoutes.js";
import { historyRouter } from "./routes/historyRoutes.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST_PATH = path.resolve(__dirname, "../../client/dist");
const CLIENT_INDEX_PATH = path.join(CLIENT_DIST_PATH, "index.html");

export const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/materials", materialsRouter);
app.use("/calculate", calculateRouter);
app.use("/", historyRouter);

if (existsSync(CLIENT_DIST_PATH)) {
  app.use(express.static(CLIENT_DIST_PATH));

  app.get("*", (req, res, next) => {
    const isApiRoute =
      req.path === "/health" ||
      req.path === "/save" ||
      req.path === "/history" ||
      req.path.startsWith("/materials") ||
      req.path.startsWith("/calculate");

    if (isApiRoute) {
      next();
      return;
    }

    res.sendFile(CLIENT_INDEX_PATH);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
