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

  // Helper: compute mastery from avg
  private masteryFromAvg(avg: number): MasteryLevel {
    if (avg >= 80) return "Strong";
    if (avg >= 60) return "Moderate";
    return "Weak";
  }

  // ✅ DB-backed profile load
  async getProfile(name: string): Promise<StudentProfile> {
    // ensure student exists
    await prisma.student.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    const student = await prisma.student.findUnique({
      where: { name },
      include: {
        progress: true, // TopicProgress rows
        attempts: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!student) {
      // extremely unlikely due to upsert, but safe
      return { name, topics: {} };
    }

    // Build topic -> scores[] from attempts table
    const scoresByTopic: Record<string, number[]> = {};
    for (const a of student.attempts) {
      if (!scoresByTopic[a.topic]) scoresByTopic[a.topic] = [];
      scoresByTopic[a.topic].push(a.score);
    }

    // Build topics from progress summary + attempts history
    const topics: Record<string, TopicData> = {};

    // Add topics that exist in progress table
    for (const p of student.progress) {
      topics[p.topic] = {
        scores: scoresByTopic[p.topic] ?? [],
        mastery: p.mastery as MasteryLevel,
        attempts: p.attempts,
      };
    }

    // Also include topics that have attempts but no progress row (edge case)
    for (const topic of Object.keys(scoresByTopic)) {
      if (!topics[topic]) {
        const scores = scoresByTopic[topic];
        const avg = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : 0;
        topics[topic] = {
          scores,
          mastery: this.masteryFromAvg(avg),
          attempts: scores.length,
        };
      }
    }

    this.log(`Student Profile Loaded: ${name}`);
    return { name: student.name, topics };
  }

  // ✅ DB-backed update score
  async updateScore(name: string, topic: string, score: number): Promise<TopicData> {
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.upsert({
        where: { name },
        update: {},
        create: { name },
      });

      // store attempt
      await tx.attempt.create({
        data: {
          studentId: student.id,
          topic,
          score,
        },
      });

      // recompute from DB for accuracy
      const attempts = await tx.attempt.findMany({
        where: { studentId: student.id, topic },
        orderBy: { createdAt: "asc" },
        select: { score: true },
      });

      const scores = attempts.map((a) => a.score);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const mastery = this.masteryFromAvg(avg);

      // update summary cache
      await tx.topicProgress.upsert({
        where: { studentId_topic: { studentId: student.id, topic } },
        update: { mastery, attempts: scores.length, avgScore: avg },
        create: { studentId: student.id, topic, mastery, attempts: scores.length, avgScore: avg },
      });

      return { scores, avg, mastery };
    });

    this.log(`Student: ${name}`);
    this.log(`Topic: ${topic}`);
    this.log(`Score: ${score}`);
    this.log(`Mastery Updated: ${result.mastery}`);

    return {
      scores: result.scores,
      attempts: result.scores.length,
      mastery: result.mastery,
    };
  }

  // ✅ DB-backed list students
  async getAllStudents(): Promise<string[]> {
    const students = await prisma.student.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    return students.map((s) => s.name);
  }
}