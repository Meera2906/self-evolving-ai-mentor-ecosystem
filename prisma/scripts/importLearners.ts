import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type LearnerJson = Record<
  string,
  {
    name: string;
    topics: Record<string, { scores: number[]; mastery: string; attempts: number }>;
  }
>;

async function main() {
  const filePath = path.join(process.cwd(), "data", "learner_profiles.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const data: LearnerJson = JSON.parse(raw);

  for (const key of Object.keys(data)) {
    const studentName = data[key].name;

    const student = await prisma.student.upsert({
      where: { name: studentName },
      update: {},
      create: { name: studentName },
    });

    const topics = data[key].topics || {};
    for (const topicName of Object.keys(topics)) {
      const t = topics[topicName];
      const scores = t.scores || [];

      // Insert attempts (history)
      for (const score of scores) {
        await prisma.attempt.create({
          data: { studentId: student.id, topic: topicName, score },
        });
      }

      // Create/update summary (fast reads)
      const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      await prisma.topicProgress.upsert({
        where: { studentId_topic: { studentId: student.id, topic: topicName } },
        update: {
          mastery: t.mastery,
          attempts: scores.length,
          avgScore,
        },
        create: {
          studentId: student.id,
          topic: topicName,
          mastery: t.mastery,
          attempts: scores.length,
          avgScore,
        },
      });
    }
  }

  console.log("✅ Imported learners from JSON to Postgres");
}

main()
  .catch((e) => {
    console.error("❌ Import failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });