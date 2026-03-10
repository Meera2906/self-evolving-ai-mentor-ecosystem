import { prisma } from "../db";
import { Prisma } from "@prisma/client";
import { StudentProfile, MasteryLevel, TopicData, OnboardingProfile, LearningPlan } from "../types";

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
      select: {
        id: true,
        name: true,
        onboarding: {
          select: {
            data: true,
          },
        },
        plans: {
          select: {
            topic: true,
            data: true,
          },
        },
      },
    });

    const progressRows = await prisma.topicProgress.findMany({
      where: { studentId: student.id },
      select: { topic: true, mastery: true, attempts: true, avgScore: true },
      orderBy: { updatedAt: "desc" },
    });

    const conceptRows = await prisma.conceptProgress.findMany({
      where: { studentId: student.id },
      select: {
        topic: true,
        concept: true,
        attempts: true,
        correct: true,
        accuracy: true,
      },
    });

    const topics: Record<string, TopicData> = {};
    for (const p of progressRows) {
      const attempts = await prisma.attempt.findMany({
        where: { studentId: student.id, topic: p.topic },
        select: { score: true },
        orderBy: { createdAt: "asc" },
      });

      const topicConcepts = conceptRows.filter((c) => c.topic === p.topic);

      topics[p.topic] = {
        scores: attempts.map((a) => a.score),
        mastery: p.mastery as MasteryLevel,
        attempts: p.attempts,
        concepts: topicConcepts.reduce((acc, c) => {
          acc[c.concept] = {
            concept: c.concept,
            attempts: c.attempts,
            correct: c.correct,
            accuracy: Math.round(c.accuracy),
          };
          return acc;
        }, {} as NonNullable<TopicData["concepts"]>),
      } as TopicData;
    }

    const learningPlans: Record<string, LearningPlan> = {};
    for (const plan of student.plans) {
      learningPlans[plan.topic] = plan.data as unknown as LearningPlan;
    }

    this.log(`Student Profile Loaded: ${student.name}`);
    return {
      name: student.name,
      topics,
      onboarding: student.onboarding?.data as unknown as OnboardingProfile | undefined,
      learningPlans,
    };
  }

  async saveOnboarding(name: string, onboarding: OnboardingProfile) {
    const student = await prisma.student.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true },
    });

    await prisma.onboardingProfile.upsert({
      where: { studentId: student.id },
      update: {
        data: onboarding as unknown as Prisma.InputJsonValue,
      },
      create: {
        studentId: student.id,
        data: onboarding as unknown as Prisma.InputJsonValue,
      },
    });

    this.log(`Onboarding Profile Saved for ${name}`);
    return onboarding;
  }

  async getOnboarding(name: string) {
    const student = await prisma.student.findUnique({
      where: { name },
      select: {
        onboarding: {
          select: {
            data: true,
          },
        },
      },
    });

    if (!student?.onboarding) return null;
    return student.onboarding.data as unknown as OnboardingProfile;
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
        data: plan as unknown as Prisma.InputJsonValue,
      },
      create: {
        studentId: student.id,
        topic,
        data: plan as unknown as Prisma.InputJsonValue,
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

    if (!student) return null;

    const plan = await prisma.learningPlan.findUnique({
      where: {
        studentId_topic: {
          studentId: student.id,
          topic,
        },
      },
      select: {
        data: true,
      },
    });

    if (!plan) return null;
    return plan.data as unknown as LearningPlan;
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

    const createdQuiz = await prisma.quiz.create({
      data: {
        studentId: student.id,
        topic,
        difficulty,
        questions: {
          create: quiz.questions.map((q: any, i: number) => ({
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation ?? "",
            concept: q.concept ?? null,
            answers: {
              create: {
                selectedIndex: answers[i] ?? -1,
                isCorrect: q.correctIndex === answers[i],
              },
            },
          })),
        },
      },
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

    if (conceptResults && Object.keys(conceptResults).length > 0) {
      for (const [concept, result] of Object.entries(conceptResults)) {
        const existing = await prisma.conceptProgress.findUnique({
          where: {
            studentId_topic_concept: {
              studentId: student.id,
              topic,
              concept,
            },
          },
          select: {
            attempts: true,
            correct: true,
          },
        });

        const updatedAttempts = (existing?.attempts ?? 0) + result.total;
        const updatedCorrect = (existing?.correct ?? 0) + result.correct;
        const updatedAccuracy =
          updatedAttempts > 0 ? (updatedCorrect / updatedAttempts) * 100 : 0;

        await prisma.conceptProgress.upsert({
          where: {
            studentId_topic_concept: {
              studentId: student.id,
              topic,
              concept,
            },
          },
          update: {
            attempts: updatedAttempts,
            correct: updatedCorrect,
            accuracy: updatedAccuracy,
          },
          create: {
            studentId: student.id,
            topic,
            concept,
            attempts: updatedAttempts,
            correct: updatedCorrect,
            accuracy: updatedAccuracy,
          },
        });
      }
    }

    const scoresRows = await prisma.attempt.findMany({
      where: { studentId: student.id, topic },
      select: { score: true },
      orderBy: { createdAt: "asc" },
    });

    const conceptRows = await prisma.conceptProgress.findMany({
      where: { studentId: student.id, topic },
      select: {
        concept: true,
        attempts: true,
        correct: true,
        accuracy: true,
      },
      orderBy: { concept: "asc" },
    });

    this.log(`Student: ${student.name}`);
    this.log(`Topic: ${topic}`);
    this.log(`Score: ${score}`);
    this.log(`Mastery Updated: ${newMastery}`);
    if (conceptResults)
      this.log(`Concepts Updated: ${Object.keys(conceptResults).join(", ")}`);

    return {
      scores: scoresRows.map((r) => r.score),
      mastery: newMastery,
      attempts: attemptsCount,
      concepts: conceptRows.reduce((acc, c) => {
        acc[c.concept] = {
          concept: c.concept,
          attempts: c.attempts,
          correct: c.correct,
          accuracy: Math.round(c.accuracy),
        };
        return acc;
      }, {} as NonNullable<TopicData["concepts"]>),
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