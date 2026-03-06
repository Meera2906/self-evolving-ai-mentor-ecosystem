import { prisma } from "../db";
import { StudentProfile, MasteryLevel, TopicData } from "../types";

export class LearnerAgent {
  private logs: string[] = [];

  private log(message: string) {
    const logMsg = `[Learner Agent] ${message}`;
    console.log(logMsg);
    this.logs.push(logMsg);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  async getProfile(name: string): Promise<StudentProfile> {
    const student = await prisma.student.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    });

    const progressRows = await prisma.topicProgress.findMany({
      where: { studentId: student.id },
      select: { topic: true, mastery: true, attempts: true, avgScore: true },
      orderBy: { updatedAt: "desc" },
    });

    const topics: Record<string, TopicData> = {};
    for (const p of progressRows) {
      const attempts = await prisma.attempt.findMany({
        where: { studentId: student.id, topic: p.topic },
        select: { score: true },
        orderBy: { createdAt: "asc" },
      });

      topics[p.topic] = {
        scores: attempts.map((a) => a.score),
        mastery: p.mastery as MasteryLevel,
        attempts: p.attempts,
      } as TopicData;
    }

    this.log(`Student Profile Loaded: ${student.name}`);
    return { name: student.name, topics };
  }

  async saveQuiz(name: string, topic: string, difficulty: string, quiz: any, answers: number[], score: number) {
    const student = await prisma.student.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true },
    });

    const correctAnswers = quiz.questions.filter((q: any, i: number) => q.correctIndex === answers[i]).length;

    const createdQuiz = await prisma.$transaction(async (tx) => {
      const quizRow = await tx.quiz.create({
        data: {
          studentId: student.id,
          topic,
          difficulty,
        },
      });

      const createdQuestions = [];
      for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        const questionRow = await tx.question.create({
          data: {
            quizId: quizRow.id,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation ?? "",
          },
          select: { id: true },
        });
        createdQuestions.push(questionRow);
      }

      for (let i = 0; i < createdQuestions.length; i++) {
        await tx.studentAnswer.create({
          data: {
            questionId: createdQuestions[i].id,
            selectedIndex: answers[i],
            isCorrect: quiz.questions[i].correctIndex === answers[i],
          },
        });
      }

      return quizRow;
    });

    const quizItem = {
      id: createdQuiz.id,
      topic,
      difficulty,
      createdAt: createdQuiz.createdAt.toISOString(),
      score,
      correctAnswers,
      totalQuestions: quiz.questions.length,
      quiz,
      answers,
    };

    this.log(`Quiz History Saved: ${quizItem.id}`);
    return quizItem;
  }

  async getQuizzes(name: string) {
    const student = await prisma.student.findUnique({
      where: { name },
      select: { id: true },
    });

    if (!student) return [];

    const quizzesRows = await prisma.quiz.findMany({
      where: { studentId: student.id },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return quizzesRows.map((q) => {
      const correctAnswers = q.questions.reduce((count, question) => {
        const answer = question.answers[0];
        return count + (answer?.isCorrect ? 1 : 0);
      }, 0);

      const totalQuestions = q.questions.length;
      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      return {
        id: q.id,
        topic: q.topic,
        difficulty: q.difficulty,
        createdAt: q.createdAt.toISOString(),
        score,
        correctAnswers,
        totalQuestions,
      };
    });
  }

  async getQuizById(name: string, quizId: string) {
    const student = await prisma.student.findUnique({
      where: { name },
      select: { id: true },
    });

    if (!student) return undefined;

    const quizRow = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        studentId: student.id,
      },
      include: {
        questions: {
          include: {
            answers: true,
          },
        },
      },
    });

    if (!quizRow) return undefined;

    const questions = quizRow.questions.map((question) => ({
      question: question.question,
      options: question.options,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    }));

    const answers = quizRow.questions.map((question) => question.answers[0]?.selectedIndex ?? -1);

    const correctAnswers = quizRow.questions.reduce((count, question) => {
      const answer = question.answers[0];
      return count + (answer?.isCorrect ? 1 : 0);
    }, 0);

    const totalQuestions = quizRow.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    return {
      id: quizRow.id,
      topic: quizRow.topic,
      difficulty: quizRow.difficulty,
      createdAt: quizRow.createdAt.toISOString(),
      score,
      correctAnswers,
      totalQuestions,
      quiz: { questions },
      answers,
    };
  }

  async updateScore(
    name: string,
    topic: string,
    score: number,
    conceptResults?: Record<string, { correct: number; total: number }>
  ): Promise<TopicData> {
    const student = await prisma.student.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    });

    await prisma.attempt.create({
      data: {
        studentId: student.id,
        topic,
        score,
      },
    });

    const agg = await prisma.attempt.aggregate({
      where: { studentId: student.id, topic },
      _avg: { score: true },
      _count: { score: true },
    });

    const avgScore = agg._avg.score ?? 0;
    const attemptsCount = agg._count.score ?? 0;

    let newMastery: MasteryLevel = "Weak";
    if (avgScore >= 80) newMastery = "Strong";
    else if (avgScore >= 60) newMastery = "Moderate";

    await prisma.topicProgress.upsert({
      where: { studentId_topic: { studentId: student.id, topic } },
      update: {
        mastery: newMastery,
        attempts: attemptsCount,
        avgScore: avgScore,
      },
      create: {
        studentId: student.id,
        topic,
        mastery: newMastery,
        attempts: attemptsCount,
        avgScore: avgScore,
      },
    });

    const scoresRows = await prisma.attempt.findMany({
      where: { studentId: student.id, topic },
      select: { score: true },
      orderBy: { createdAt: "asc" },
    });

    this.log(`Student: ${student.name}`);
    this.log(`Topic: ${topic}`);
    this.log(`Score: ${score}`);
    this.log(`Mastery Updated: ${newMastery}`);
    if (conceptResults) this.log(`Concepts Updated: ${Object.keys(conceptResults).join(", ")}`);

    return {
      scores: scoresRows.map((r) => r.score),
      mastery: newMastery,
      attempts: attemptsCount,
    } as TopicData;
  }

  async getAllStudents(): Promise<string[]> {
    const students = await prisma.student.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return students.map((s) => s.name);
  }
}