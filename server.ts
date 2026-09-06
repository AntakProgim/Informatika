import express from "express";
import path from "path";
import { executeLessonPlanGeneration } from "./services/generatorCore";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser with sufficient limit for uploaded PDF files
  app.use(express.json({ limit: "25mb" }));

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/generate-lesson", async (req, res) => {
    try {
      const params = req.body;
      if (!params || !params.topic || !params.grade) {
        return res.status(400).json({ error: "Trūksta privalomų parametrų (topic, grade)." });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
      if (!apiKey) {
        return res.status(500).json({ error: "API raktas nerastas. Nustatykite GEMINI_API_KEY aplinkos kintamąjį." });
      }

      const plan = await executeLessonPlanGeneration(params, apiKey);
      return res.json(plan);
    } catch (error: any) {
      console.error("Server-side Gemini generation error:", error);
      return res.status(500).json({
        error: error?.message || "Nepavyko sugeneruoti pamokos plano.",
      });
    }
  });

  // Vite middleware in dev or static serving in prod
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

