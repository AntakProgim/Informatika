import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LessonPlan, GeneratorParams } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const generateLessonPlan = async (params: GeneratorParams): Promise<LessonPlan> => {
  const model = "gemini-2.5-flash";
  
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

  if (params.uploadedFiles) {
    params.uploadedFiles.forEach(file => {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.data
        }
      });
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: lessonPlanSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response text from Gemini");
    }

    const plan = JSON.parse(text) as LessonPlan;
    
    // Append user resources to the plan object so they can be displayed/exported
    plan.teacherResources = [];
    if (params.additionalLinks) {
      plan.teacherResources.push(...params.additionalLinks.map(l => ({ name: l, type: 'link' as const, url: l })));
    }
    if (params.uploadedFiles) {
      plan.teacherResources.push(...params.uploadedFiles.map(f => ({ name: f.name, type: 'file' as const })));
    }

    return plan;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};