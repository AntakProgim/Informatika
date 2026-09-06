import { LessonPlan, GeneratorParams } from "../types";

export const generateLessonPlan = async (params: GeneratorParams): Promise<LessonPlan> => {
  const response = await fetch("/api/generate-lesson", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errorMessage = "Nepavyko sugeneruoti pamokos plano.";
    try {
      const errorData = await response.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use fallback status text if JSON parsing fails
      if (response.status === 413) {
        errorMessage = "Įkelti failai yra per dideli. Pabandykite įkelti mažesnį PDF failą.";
      } else if (response.status === 504 || response.status === 408) {
        errorMessage = "Užklausos laikas baigėsi. Bandykite dar kartą.";
      }
    }
    throw new Error(errorMessage);
  }

  const plan: LessonPlan = await response.json();
  return plan;
};
