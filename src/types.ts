export type MasteryLevel = 'Weak' | 'Moderate' | 'Strong';

export interface ConceptPerformance {
  concept: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface TopicData {
  scores: number[];
  mastery: MasteryLevel;
  attempts: number;
  concepts?: Record<string, ConceptPerformance>;
}

export interface StudentAnswer {
  quizId: string;
  questionIndex: number;
  selectedOption: number;
  isCorrect: boolean;
}

export interface QuizHistoryItem {
  id: string;
  topic: string;
  difficulty: string;
  createdAt: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  quiz: Quiz;
  answers: number[];
}

export type UserRole = 'school_student' | 'college_student' | 'professor' | 'self_learner';
export type EducationLevel = 'school' | 'undergraduate' | 'postgraduate' | 'professional';
export type Goal = 'placements' | 'exam preparation' | 'concept learning' | 'teaching support';

export interface OnboardingProfile {
  role: UserRole;
  educationLevel: EducationLevel;
  goals: Goal[];
  targetTopics: string[];
  selfRatedLevels: Record<string, string>;
}

export interface LearningPlanStep {
  type: 'lesson' | 'practice' | 'checkpoint_quiz';
  concept: string;
  topic?: string;
}

export interface LearningPlan {
  topic: string;
  currentLevel: string;
  targetLevel: string;
  weakConcepts: string[];
  steps: LearningPlanStep[];
}

export interface StudentProfile {
  name: string;
  onboarding?: OnboardingProfile;
  learningPlans?: Record<string, LearningPlan>;
  topics: Record<string, TopicData>;
  quizzes?: QuizHistoryItem[];
}

export interface AgentLog {
  agent: string;
  message: string;
  timestamp: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  concept?: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}

export interface Video {
  title: string;
  url: string;
  reason: string;
}

export interface Recommendation {
  mode: string;
  explanation: string;
  recommendedVideos: Video[];
}

export interface AnalyticsData {
  averageScore: number;
  totalAttempts: number;
  trend: { topic: string; score: number }[];
  progression: { attempt: number; score: number }[];
}

export interface MentorFeedback {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}