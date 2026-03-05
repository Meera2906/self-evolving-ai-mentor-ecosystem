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