import { prisma } from "../db";
import {
  StudentProfile,
  MasteryLevel,
  TopicData,
  OnboardingProfile,
  LearningPlan,
} from "../types";

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
      include: {
        progress: {
          orderBy: { updatedAt: "desc" },
        },
        learningPlans: true,
        quizzes: {
          include: {
            questions: {
              include: {
                answers: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const topics: Record<string, TopicData> = {};

    for (const p of student.progress) {
      const attempts = await prisma.attempt.findMany({
        where: {
          studentId: student.id,
          topic: p.topic,
        },
        select: { score: true },
        orderBy: { createdAt: "asc" },
      });

      const conceptRows = await prisma.conceptProgress.findMany({
        where: {
          studentId: student.id,
          topic: p.topic,
        },
        orderBy: { concept: "asc" },
      });

      topics[p.topic] = {
        scores: attempts.map((a) => a.score),
        mastery: p.mastery as MasteryLevel,
        attempts: p.attempts,
        concepts: Object.fromEntries(
          conceptRows.map((c) => [
            c.concept,
            {
              concept: c.concept,
              attempts: c.attempts,
              correct: c.correct,
              accuracy: c.accuracy,
            },
          ])
        ),
      };
    }

    const quizzes = student.quizzes.map((q) => {
      const correctAnswers = q.questions.reduce((count, question) => {
        const answer = question.answers[0];
        return count + (answer?.isCorrect ? 1 : 0);
      }, 0);

      const totalQuestions = q.questions.length;
      const score =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;

      return {
        id: q.id,
        topic: q.topic,
        difficulty: q.difficulty,
        createdAt: q.createdAt.toISOString(),
        score,
        correctAnswers,
        totalQuestions,
        quiz: {
          questions: q.questions.map((question) => ({
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            explanation: question.explanation,
            concept: question.concept ?? undefined,
          })),
        },
        answers: q.questions.map(
          (question) => question.answers[0]?.selectedIndex ?? -1
        ),
      };
    });

    const learningPlans: Record<string, LearningPlan> = {};
    for (const lp of student.learningPlans) {
      learningPlans[lp.topic] = lp.planJson as unknown as LearningPlan;
    }

    this.log(`Student Profile Loaded: ${student.name}`);

    return {
      name: student.name,
      topics,
      quizzes,
      onboarding: student.onboardingProfile as unknown as OnboardingProfile | undefined,
      learningPlans,
    };
  }

  async saveOnboarding(name: string, onboarding: OnboardingProfile) {
    const student = await prisma.student.upsert({
      where: { name },
      update: {
        onboardingProfile: onboarding as any,
      },
      create: {
        name,
        onboardingProfile: onboarding as any,
      },
      select: { id: true, name: true, onboardingProfile: true },
    });

    this.log(`Onboarding Profile Saved for ${name}`);
    return {
      name: student.name,
      onboarding: student.onboardingProfile as unknown as OnboardingProfile,
    };
  }

  async saveLearningPlan(name: string, topic: string, plan: LearningPlan) {
    const student = await prisma.student.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true },
    });

    await prisma.learningPlan.upsert({
      where: {
        studentId_topic: {
          studentId: student.id,
          topic,
        },
      },
      update: {
        planJson: plan as any,
      },
      create: {
        studentId: student.id,
        topic,
        planJson: plan as any,
      },
    });

    this.log(`Learning Plan Saved for ${name} - Topic: ${topic}`);
    return plan;
  }

  async getLearningPlan(name: string, topic: string) {
    const student = await prisma.student.findUnique({
      where: { name },
      select: { id: true },
    });

    if (!student) return undefined;

    const plan = await prisma.learningPlan.findUnique({
      where: {
        studentId_topic: {
          studentId: student.id,
          topic,
        },
      },
    });

    if (!plan) return undefined;

    return plan.planJson as unknown as LearningPlan;
  }

  async saveQuiz(
    name: string,
    topic: string,
    difficulty: string,
    quiz: any,
    answers: number[],
    score: number
  ) {
    const student = await prisma.student.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true },
    });

    const correctAnswers = quiz.questions.filter(
      (q: any, i: number) => q.correctIndex === answers[i]
    ).length;

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
            concept: q.concept ?? null,
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
      const score =
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0;

      return {
        id: q.id,
        topic: q.topic,
        difficulty: q.difficulty,
        createdAt: q.createdAt.toISOString(),
        score,
        correctAnswers,
        totalQuestions,
        quiz: {
          questions: q.questions.map((question) => ({
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            explanation: question.explanation,
            concept: question.concept ?? undefined,
          })),
        },
        answers: q.questions.map(
          (question) => question.answers[0]?.selectedIndex ?? -1
        ),
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
      concept: question.concept ?? undefined,
    }));

    const answers = quizRow.questions.map(
      (question) => question.answers[0]?.selectedIndex ?? -1
    );

    const correctAnswers = quizRow.questions.reduce((count, question) => {
      const answer = question.answers[0];
      return count + (answer?.isCorrect ? 1 : 0);
    }, 0);

    const totalQuestions = quizRow.questions.length;
    const score =
      totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

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

    if (conceptResults) {
      for (const [concept, result] of Object.entries(conceptResults)) {
        const existing = await prisma.conceptProgress.findUnique({
          where: {
            studentId_topic_concept: {
              studentId: student.id,
              topic,
              concept,
            },
          },
        });

        const attempts = (existing?.attempts ?? 0) + result.total;
        const correct = (existing?.correct ?? 0) + result.correct;
        const accuracy =
          attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

        await prisma.conceptProgress.upsert({
          where: {
            studentId_topic_concept: {
              studentId: student.id,
              topic,
              concept,
            },
          },
          update: {
            attempts,
            correct,
            accuracy,
          },
          create: {
            studentId: student.id,
            topic,
            concept,
            attempts,
            correct,
            accuracy,
          },
        });
      }
    }

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
      where: {
        studentId_topic: {
          studentId: student.id,
          topic,
        },
      },
      update: {
        mastery: newMastery,
        attempts: attemptsCount,
        avgScore,
      },
      create: {
        studentId: student.id,
        topic,
        mastery: newMastery,
        attempts: attemptsCount,
        avgScore,
      },
    });

    const scoresRows = await prisma.attempt.findMany({
      where: { studentId: student.id, topic },
      select: { score: true },
      orderBy: { createdAt: "asc" },
    });

    const conceptRows = await prisma.conceptProgress.findMany({
      where: { studentId: student.id, topic },
      orderBy: { concept: "asc" },
    });

    this.log(`Student: ${student.name}`);
    this.log(`Topic: ${topic}`);
    this.log(`Score: ${score}`);
    this.log(`Mastery Updated: ${newMastery}`);
    if (conceptResults) {
      this.log(`Concepts Updated: ${Object.keys(conceptResults).join(", ")}`);
    }

    return {
      scores: scoresRows.map((r) => r.score),
      mastery: newMastery,
      attempts: attemptsCount,
      concepts: Object.fromEntries(
        conceptRows.map((c) => [
          c.concept,
          {
            concept: c.concept,
            attempts: c.attempts,
            correct: c.correct,
            accuracy: c.accuracy,
          },
        ])
      ),
    };
  }

  async getAllStudents(): Promise<string[]> {
    const students = await prisma.student.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });

    return students.map((s) => s.name);
  }
}