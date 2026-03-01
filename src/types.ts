export type MasteryLevel = 'Weak' | 'Moderate' | 'Strong';

export interface TopicData {
  scores: number[];
  mastery: MasteryLevel;
  attempts: number;
}

export interface StudentProfile {
  name: string;
  topics: Record<string, TopicData>;
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

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
