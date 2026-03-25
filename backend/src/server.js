import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

import { apiRouter } from "./routes/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const app = express();
app.use(compression());
const port = Number(process.env.PORT || 3000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api", apiRouter);

// Serve React frontend (if built)
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback — all non-API routes serve index.html
  app.get("*", (_req, res) => {
    res.sendFile(join(publicDir, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.send("Server is running");
  });
}

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal Server Error"
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;

