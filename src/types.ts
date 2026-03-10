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

export interface StudentProfile {
  name: string;
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
  concept: string;
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
