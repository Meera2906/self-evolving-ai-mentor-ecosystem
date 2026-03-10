import { Quiz } from '../types';

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
}

