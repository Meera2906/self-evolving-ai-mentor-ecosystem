import { StudentProfile, AnalyticsData } from '../types';

export class AnalyticsAgent {
  private logs: string[] = [];

  private log(message: string) {
    const logMsg = `[Analytics Agent] ${message}`;
    console.log(logMsg);
    this.logs.push(logMsg);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  analyze(profile: StudentProfile): AnalyticsData {
    this.log('Calculating performance trend');
    
    let totalScore = 0;
    let totalAttempts = 0;
    const trend: { topic: string; score: number }[] = [];
    const allScores: number[] = [];

    Object.entries(profile.topics || {}).forEach(([topic, data]) => {
      if (!data || !data.scores || !Array.isArray(data.scores) || data.scores.length === 0) return;
      
      const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      totalScore += avg;
      totalAttempts += data.attempts || 0;
      trend.push({ topic, score: Math.round(avg) });
      allScores.push(...data.scores);
    });

    const averageScore = trend.length > 0 ? totalScore / trend.length : 0;
    
    // Simple progression based on all scores in order of attempt
    const progression = allScores.map((score, index) => ({
      attempt: index + 1,
      score: Math.round(score)
    }));

    this.log('Graph data prepared');
    return {
      averageScore: Math.round(averageScore),
      totalAttempts,
      trend,
      progression
    };
  }
}
