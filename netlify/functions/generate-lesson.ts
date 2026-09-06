import { executeLessonPlanGeneration } from "../../services/generatorCore";
import { GeneratorParams } from "../../types";

export const handler = async (event: any, _context: any) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body: GeneratorParams = JSON.parse(event.body || "{}");
    if (!body || !body.topic || !body.grade) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Trūksta privalomų parametrų (topic, grade)." }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Netlify aplinkoje nerastas GEMINI_API_KEY kintamasis. Įsitikinkite, kad Netlify Environment variables nustatėte GEMINI_API_KEY.",
        }),
      };
    }

    const plan = await executeLessonPlanGeneration(body, apiKey);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(plan),
    };
  } catch (error: any) {
    console.error("Netlify function error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error?.message || "Nepavyko sugeneruoti pamokos plano Netlify funkcijoje.",
      }),
    };
  }
};
