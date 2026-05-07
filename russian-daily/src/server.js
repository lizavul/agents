import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { runAgent } from "./agent.js";
import { getEntries, getEntryByDate, getLatestEntry } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "../public");

const app = express();
app.use(express.static(PUBLIC_DIR));

// ─── API: all entries (for the frontend) ─────────────────────────────────────
app.get("/api/entries", (req, res) => {
  try {
    res.json(getEntries());
  } catch {
    res.json([]);
  }
});

// ─── API: today only ──────────────────────────────────────────────────────────
app.get("/api/today", (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const entry = getEntryByDate(today) || getLatestEntry() || null;
    res.json(entry);
  } catch {
    res.json(null);
  }
});

// ─── API: manual trigger (useful for testing) ─────────────────────────────────
app.post("/api/run", async (req, res) => {
  const secret = req.headers["x-secret"];
  if (secret !== process.env.RUN_SECRET) {
    return res.status(401).json({ error: "Unauthorised" });
  }
  res.json({ status: "started" });
  runAgent().catch(console.error);
});

// ─── Cron: runs every day at 7:00 AM server time ─────────────────────────────
cron.schedule("0 7 * * *", () => {
  console.log("⏰ Cron triggered");
  runAgent().catch(console.error);
});

// ─── Serve SPA for all other routes ──────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Platform running at http://localhost:${PORT}`);

  // Auto-run on startup if no entry for today
  const today = new Date().toISOString().split("T")[0];
  if (!getEntryByDate(today)) {
    console.log("No entry for today — running agent now...");
    runAgent().catch(console.error);
  }
});
