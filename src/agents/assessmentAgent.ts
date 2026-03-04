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

  evaluate(quiz: Quiz, answers: number[]): number {
    this.log('Evaluating answers');
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (q.correctIndex === answers[i]) {
        correct++;
      }
    });
    const score = (correct / quiz.questions.length) * 100;
    this.log(`Evaluation complete. Score: ${score}%`);
    return score;
  }
}
