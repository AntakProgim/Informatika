import { LessonPlan, GeneratorParams } from "../types";
import { executeLessonPlanGeneration } from "./generatorCore";

export const generateLessonPlan = async (params: GeneratorParams): Promise<LessonPlan> => {
  const endpoints = ["/api/generate-lesson", "/.netlify/functions/generate-lesson"];
  let lastError = "";

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const contentType = response.headers.get("content-type") || "";

      // If it returned an HTML page (like index.html fallback), this endpoint is not active
      if (contentType.includes("text/html")) {
        continue;
      }

      if (response.ok && contentType.includes("application/json")) {
        const plan: LessonPlan = await response.json();
        return plan;
      }

      // If response has error JSON
      if (contentType.includes("application/json")) {
        const errData = await response.json();
        if (errData?.error) {
          throw new Error(errData.error);
        }
      }

      if (response.status === 413) {
        throw new Error("Įkelti failai yra per dideli (viršija leistiną limitą).");
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
      // If the error was explicitly thrown above (like bad params or quota), rethrow
      if (
        lastError.includes("Trūksta") ||
        lastError.includes("API raktas") ||
        lastError.includes("GEMINI_API_KEY") ||
        lastError.includes("per dideli")
      ) {
        throw new Error(lastError);
      }
    }
  }

  // If server / Netlify functions are not responding, check for client-side API key
  const clientKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  if (clientKey) {
    try {
      return await executeLessonPlanGeneration(params, clientKey);
    } catch (clientErr: any) {
      throw new Error(clientErr?.message || "Nepavyko sugeneruoti pamokos plano.");
    }
  }

  throw new Error(
    lastError ||
      "Nepavyko susisiekti su DI serveriu. Įsitikinkite, kad Netlify Environment variables nustatytas GEMINI_API_KEY ir atliktas naujas 'Clear cache and deploy site'."
  );
};

