import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type, Schema } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const differentiatedTasksSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    level1: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Pradedantysis lygis (1 lygis)" 
    },
    level2: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Vidutinis lygis (2 lygis)" 
    },
    level3: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Pažengęs lygis (3 lygis)" 
    },
  },
  required: ["level1", "level2", "level3"],
};

const lessonPlanSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING },
    grade: { type: Type.STRING },
    duration: { type: Type.STRING, description: "Usually 45 min" },
    introduction: { type: Type.STRING, description: "Įžanga (5-7 min), sudominimas" },
    goal: { type: Type.STRING, description: "Pamokos uždavinys/tikslas" },
    theoryContent: { type: Type.STRING, description: "Labai išsami teorinė medžiaga su pavyzdžiais ir paaiškinimais (konspektas)" },
    consolidationTasks: differentiatedTasksSchema,
    practicalTasks: differentiatedTasksSchema,
    controlQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-5 kontroliniai klausimai pamokos pabaigai arba greitam patikrinimui"
    },
    careerIntegration: { type: Type.STRING, description: "Kaip ši tema susijusi su realiomis profesijomis ir karjera" },
  },
  required: [
    "topic",
    "grade",
    "duration",
    "introduction",
    "goal",
    "theoryContent",
    "consolidationTasks",
    "practicalTasks",
    "controlQuestions",
    "careerIntegration"
  ],
};

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API raktas nerastas. Nustatykite GEMINI_API_KEY aplinkos kintamąjį.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

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

      const ai = getGeminiClient();

      let promptText = `
Tu esi ekspertas Lietuvos informatikos mokytojas ir švietimo konsultantas.

Tavo užduotis: Sukurti detalią 45 min. informatikos pamoką (metodinę medžiagą) remiantis Lietuvos Bendrąja Programa (BP).
Tema: ${params.topic}
Klasė: ${params.grade}
Papildomas kontekstas: ${params.context || "Nėra"}

Šaltiniai ir metodika:
1. Pradinėms klasėms (1-4 kl.) remkis Raspberry Pi Curriculum Key Stage 2, Experience AI bei Bebras uždaviniais.
2. Vyresnėms klasėms remkis Key Stage 4, Ada Computer Science, SMP eMokykla (Informatika) bei VU eMokymai.
3. Taip pat naudok metodiką iš TeachAI (https://www.teachai.org/cs).
4. Naudok užduotis ir metodiką iš Code.org (https://studio.code.org/catalog).
5. Naudok šaltinius iš The Achievery (https://www.theachievery.com/en).
6. Remkis Raspberry Pi UK Curriculum (https://www.raspberrypi.org/curriculum/gb).
7. Struktūra turi atitikti šiuolaikinės pamokos reikalavimus (įžanga, tikslas, teorija, įtvirtinimas, praktika, refleksija).

Reikalavimai turiniui:
1. Teorinė medžiaga privalo būti ITIN IŠSAMI, gili ir akademiškai tvarkinga. Tai turi būti pilnavertis mokomojo konspekto tekstas, tinkamas dalijamajai medžiagai. Joje privalo būti:
   - Išsamūs, aiškūs sąvokų apibrėžimai ir jų etimologija (jei aktualu).
   - Gilūs paaiškinimai „kodėl tai veikia“, o ne tik „kaip tai veikia“.
   - Bent 3-4 konkretūs, skirtingo pobūdžio pavyzdžiai iš realaus pasaulio ar kasdienybės.
   - Gausūs kodo pavyzdžiai (jei tema programavimas) su komentarais kiekvienoje eilutėje.
   - Palyginimai, analogijos (pvz., kintamasis kaip dėžutė), padedantys suprasti sudėtingas koncepcijas.
   - Markdown formatavimas (antraštės, sąrašai, paryškinimai, kodo blokai) struktūrai užtikrinti.
   
2. Įtvirtinimas (Teorijos suvokimas):
   Pateik užduotis/klausimus 3 lygiais, kad mokytojas galėtų patikrinti, kaip mokiniai suprato teoriją.
   - 1 lygis (Pradedantysis): Bent 2 paprasti klausimai/užduotys.
   - 2 lygis (Vidutinis): Bent 2 vidutinio sunkumo klausimai/užduotys.
   - 3 lygis (Pažengęs): Bent 2 sudėtingesni, mąstymą skatinantys klausimai.

3. Praktinės užduotys (Savarankiškas darbas):
   Pateik diferencijuotas praktines užduotis 3 lygiais savarankiškam darbui (praktikai ir išmokimo stebėjimui).
   - 1 lygis (Pradedantysis): 1-2 užduotys (lengvesnės, su pagalba).
   - 2 lygis (Vidutinis): 1-2 užduotys (standartinės).
   - 3 lygis (Pažengęs): 1-2 užduotys (kūrybinės/sunkios).

4. Vertinimas:
   - VERTINIMO KRITERIJŲ LENTELĖS NERENGTI.
   - Mokytojas vertins stebėdamas, kaip mokiniai atlieka diferencijuotas užduotis.
   
5. Kontroliniai klausimai (Refleksija):
   - Pateik 3-5 konkrečius, esminius klausimus, kuriuos mokytojas gali užduoti pamokos pabaigoje ("Exit tickets"), kad įsitikintų, ar pasiektas pamokos tikslas.

6. Ugdymas karjerai:
   - Trumpai, bet įkvepiančiai aprašyk, kaip ši konkreti tema siejasi su realiomis profesijomis (ne tik programuotojo), darbo rinka ar ateities įgūdžiais.

7. Kalba: Lietuvių.
`;

      if (params.additionalLinks && params.additionalLinks.length > 0) {
        promptText += `\n\nTaip pat atsižvelk į šias mokytojo pateiktas nuorodas kaip į papildomą kontekstą:\n${params.additionalLinks.join('\n')}`;
      }

      if (params.uploadedFiles && params.uploadedFiles.length > 0) {
        promptText += `\n\nTaip pat išanalizuok pateiktus PDF failus ir naudok jų turinį pamokos kūrimui.`;
      }

      const parts: any[] = [{ text: promptText }];

      if (params.uploadedFiles && Array.isArray(params.uploadedFiles)) {
        params.uploadedFiles.forEach((file: { mimeType: string; data: string }) => {
          if (file.mimeType && file.data) {
            parts.push({
              inlineData: {
                mimeType: file.mimeType,
                data: file.data,
              },
            });
          }
        });
      }

      // Try gemini-3.8-flash first, fallback to gemini-2.5-flash if needed
      let model = "gemini-3.8-flash";
      let response;
      try {
        response = await ai.models.generateContent({
          model: model,
          contents: { parts: parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: lessonPlanSchema,
            temperature: 0.7,
          },
        });
      } catch (err: any) {
        console.warn(`Model ${model} failed, attempting gemini-2.5-flash fallback:`, err?.message || err);
        model = "gemini-2.5-flash";
        response = await ai.models.generateContent({
          model: model,
          contents: { parts: parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: lessonPlanSchema,
            temperature: 0.7,
          },
        });
      }

      const text = response.text;
      if (!text) {
        return res.status(500).json({ error: "Gautas tuščias atsakymas iš DI modelio." });
      }

      const plan = JSON.parse(text);

      plan.teacherResources = [];
      if (params.additionalLinks) {
        plan.teacherResources.push(...params.additionalLinks.map((l: string) => ({ name: l, type: "link", url: l })));
      }
      if (params.uploadedFiles) {
        plan.teacherResources.push(...params.uploadedFiles.map((f: { name: string }) => ({ name: f.name, type: "file" })));
      }

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
