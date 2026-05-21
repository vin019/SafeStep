import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Routing Proxy (OSRM)
  // This keeps the endpoint clean and hides upstream details if we switch to a paid provider later
  app.get("/api/route", async (req, res) => {
    const { start, end, alternatives } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: "Missing start or end coordinates" });
    }

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${start};${end}?overview=full&geometries=geojson&alternatives=${alternatives || "false"}`;
      const response = await fetch(osrmUrl);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Routing API error:", error);
      res.status(500).json({ error: "Failed to fetch route" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SafeStep] Production server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
