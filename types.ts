export interface DifferentiatedTasks {
  level1: string[]; // Pradedantysis
  level2: string[]; // Vidutinis
  level3: string[]; // Pažengęs
}

export interface TeacherResource {
  name: string;
  type: 'link' | 'file';
  url?: string;
}

export interface LessonPlan {
  topic: string;
  grade: string;
  duration: string;
  introduction: string;
  goal: string;
  theoryContent: string;
  consolidationTasks: DifferentiatedTasks;
  practicalTasks: DifferentiatedTasks;
  controlQuestions: string[];
  careerIntegration: string;
  teacherResources?: TeacherResource[];
}

export interface SavedLessonPlan extends LessonPlan {
  id: string;
  createdAt: number;
}

export interface GeneratorParams {
  topic: string;
  grade: string;
  context?: string;
  additionalLinks?: string[];
  uploadedFiles?: { name: string, data: string, mimeType: string }[];
}