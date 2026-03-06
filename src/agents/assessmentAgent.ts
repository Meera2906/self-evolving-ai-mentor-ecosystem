import { Quiz, MasteryLevel } from '../types';

export class AssessmentAgent {
  private logs: string[] = [];

  constructor() {}

  private log(message: string) {
    const logMsg = `[Assessment Agent] ${message}`;
    console.log(logMsg);
    this.logs.push(logMsg);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  evaluate(quiz: Quiz, answers: number[]): { score: number; conceptResults: Record<string, { correct: number; total: number }> } {
    this.log('Evaluating answers');
    let correct = 0;
    const conceptResults: Record<string, { correct: number; total: number }> = {};

    quiz.questions.forEach((q, i) => {
      const concept = q.concept || 'General';
      if (!conceptResults[concept]) {
        conceptResults[concept] = { correct: 0, total: 0 };
      }
      conceptResults[concept].total++;

      if (q.correctIndex === answers[i]) {
        correct++;
        conceptResults[concept].correct++;
      }
    });

    const score = (correct / quiz.questions.length) * 100;
    this.log(`Evaluation complete. Score: ${score}%`);
    return { score, conceptResults };
  }

  evaluateDiagnostic(quiz: Quiz, answers: number[]): { 
    score: number; 
    conceptScores: Record<string, number>;
    estimatedLevel: MasteryLevel;
  } {
    this.log('Evaluating diagnostic assessment');
    const { score, conceptResults } = this.evaluate(quiz, answers);
    
    const conceptScores: Record<string, number> = {};
    Object.entries(conceptResults).forEach(([concept, result]) => {
      conceptScores[concept] = Math.round((result.correct / result.total) * 100);
    });

    let estimatedLevel: MasteryLevel = 'Weak';
    if (score > 75) estimatedLevel = 'Strong';
    else if (score >= 50) estimatedLevel = 'Moderate';

    this.log(`Diagnostic complete. Estimated Level: ${estimatedLevel}`);
    return { score, conceptScores, estimatedLevel };
  }
}

