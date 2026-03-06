import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import express from "express";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";

import { prisma } from "./src/db";

import { LearnerAgent } from "./src/agents/learnerAgent";
import { StrategyAgent } from "./src/agents/strategyAgent";
import { AssessmentAgent } from "./src/agents/assessmentAgent";
import { AnalyticsAgent } from "./src/agents/analyticsAgent";
import { MentorAgent } from "./src/agents/mentorAgent";

type MasteryLevel = "Weak" | "Moderate" | "Strong";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseURL: "https://openrouter.ai/api/v1",
  });

  function extractJson(s: string) {
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    return a !== -1 && b !== -1 ? s.slice(a, b + 1) : '{"questions":[]}';
  }

  const learnerAgent = new LearnerAgent();
  const strategyAgent = new StrategyAgent();
  const assessmentAgent = new AssessmentAgent();
  const analyticsAgent = new AnalyticsAgent();
  const mentorAgent = new MentorAgent();

  app.get("/api/students", async (req, res) => {
    try {
      const students = await learnerAgent.getAllStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/profile/:name", async (req, res) => {
    try {
      const { topic, topics } = req.query;
      const profile = await learnerAgent.getProfile(req.params.name);

      let filteredTopics = { ...profile.topics };

      if (topic === "Mixed" && typeof topics === "string") {
        const selectedTopics = topics.split(",");
        filteredTopics = Object.fromEntries(
          Object.entries(profile.topics).filter(([t]) => selectedTopics.includes(t))
        );
      } else if (
        typeof topic === "string" &&
        topic !== "Overall" &&
        topic !== "Mixed"
      ) {
        filteredTopics = Object.fromEntries(
          Object.entries(profile.topics).filter(([t]) => t === topic)
        );
      }

      const filteredProfile = { ...profile, topics: filteredTopics };
      const analytics = analyticsAgent.analyze(filteredProfile);

      let weakestTopic = "Coding";
      let lowestMastery: MasteryLevel = "Strong";

      const topicEntries = Object.entries(profile.topics);
      if (topicEntries.length > 0) {
        const masteryPriority: Record<MasteryLevel, number> = {
          Weak: 0,
          Moderate: 1,
          Strong: 2,
        };

        topicEntries.forEach(([topicName, data]) => {
          if (masteryPriority[data.mastery as MasteryLevel] < masteryPriority[lowestMastery]) {
            lowestMastery = data.mastery as MasteryLevel;
            weakestTopic = topicName;
          }
        });
      }

      const recommendation = strategyAgent.recommend(
        weakestTopic,
        profile.topics[weakestTopic] || {
          mastery: lowestMastery,
          attempts: 0,
          scores: [],
        }
      );

      res.json({
        profile: filteredProfile,
        analytics,
        recommendation,
        logs: [
          ...learnerAgent.getLogs(),
          ...analyticsAgent.getLogs(),
          ...strategyAgent.getLogs(),
        ],
      });

      learnerAgent.clearLogs();
      analyticsAgent.clearLogs();
      strategyAgent.clearLogs();
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/quiz/prepare", async (req, res) => {
    try {
      const { name, topic, mastery } = req.body;

      const profile = await learnerAgent.getProfile(name);
      const topicData = profile.topics[topic] || {
        mastery: mastery as MasteryLevel,
        attempts: 0,
        scores: [],
      };

      const recommendation = strategyAgent.recommend(topic, topicData);

      res.json({
        recommendation,
        logs: [...strategyAgent.getLogs()],
      });

      strategyAgent.clearLogs();
    } catch (error) {
      console.error("Error preparing quiz:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/quizzes/:name", async (req, res) => {
    try {
      const quizzes = await learnerAgent.getQuizzes(req.params.name);
      res.json(quizzes);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/quiz/:name/:quizId", async (req, res) => {
    try {
      const quiz = await learnerAgent.getQuizById(req.params.name, req.params.quizId);

      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      res.json(quiz);
    } catch (error) {
      console.error("Error fetching quiz:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/quiz/submit", async (req, res) => {
    try {
      const { name, topic, quiz, answers, difficulty } = req.body;

      const { score, conceptResults } = assessmentAgent.evaluate(quiz, answers);

      const student = await prisma.student.upsert({
        where: { name },
        update: {},
        create: { name },
        select: { id: true },
      });

      const quizRow = await prisma.$transaction(async (tx) => {
        const createdQuiz = await tx.quiz.create({
          data: {
            studentId: student.id,
            topic,
            difficulty: difficulty || "Moderate",
          },
        });

        const createdQuestions: { id: string }[] = [];

        for (let i = 0; i < quiz.questions.length; i++) {
          const q = quiz.questions[i];
          const createdQ = await tx.question.create({
            data: {
              quizId: createdQuiz.id,
              question: q.question,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: q.explanation ?? "",
            },
            select: { id: true },
          });

          createdQuestions.push(createdQ);
        }

        for (let i = 0; i < createdQuestions.length; i++) {
          const questionId = createdQuestions[i].id;
          const selectedIndex = typeof answers[i] === "number" ? answers[i] : -1;
          const isCorrect = quiz.questions[i].correctIndex === selectedIndex;

          await tx.studentAnswer.create({
            data: {
              questionId,
              selectedIndex,
              isCorrect,
            },
          });
        }

        return createdQuiz;
      });

      const updatedTopic = await learnerAgent.updateScore(name, topic, score, conceptResults);
      const recommendation = strategyAgent.recommend(topic, updatedTopic);
      const profile = await learnerAgent.getProfile(name);
      const analytics = analyticsAgent.analyze(profile);

      const mentorFeedback = await mentorAgent.generateFeedback(
        name,
        topic,
        score,
        quiz,
        answers,
        updatedTopic,
        analytics
      );

      res.json({
        score,
        updatedTopic,
        recommendation,
        analytics,
        mentorFeedback,
        quizId: quizRow.id,
        logs: [
          ...assessmentAgent.getLogs(),
          ...learnerAgent.getLogs(),
          ...strategyAgent.getLogs(),
          ...analyticsAgent.getLogs(),
          ...mentorAgent.getLogs(),
        ],
      });

      assessmentAgent.clearLogs();
      learnerAgent.clearLogs();
      strategyAgent.clearLogs();
      analyticsAgent.clearLogs();
      mentorAgent.clearLogs();
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/quiz/generate", async (req, res) => {
    try {
      const { topic, mastery, count = 5 } = req.body;

      const difficultyMap: Record<string, string> = {
        Weak: "Easy",
        Moderate: "Medium",
        Strong: "Hard",
      };

      const difficulty = difficultyMap[mastery] || "Easy";

      const prompt = `
Generate a ${count}-question multiple choice quiz about "${topic}" at ${difficulty} difficulty.

Rules:
- Each question must have exactly 4 options.
- Include the index of the correct option as correctIndex (0-3).
- Provide a short 1-line explanation for why the answer is correct.
- Each question must include a specific "concept" (sub-topic) within ${topic}.

Example concepts for ${topic}:
- Math: Algebra, Fractions, Ratios, Percentages, Geometry
- Coding: Arrays, Loops, Functions, Recursion
- Aptitude: Logical reasoning, Pattern recognition, Data interpretation
- Mixed: Concepts can be mixed within the same quiz

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "...",
      "concept": "..."
    }
  ]
}
`;

      const resp = await openrouter.chat.completions.create(
        {
          model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "system",
              content: "You are a quiz generator that returns strict JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        },
        {
          headers: {
            "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
            "X-Title": "Self-Evolving AI Mentor Ecosystem",
          },
        }
      );

      const text = resp.choices?.[0]?.message?.content ?? '{"questions":[]}';
      const quiz = JSON.parse(extractJson(text));

      res.json(quiz);
    } catch (error: any) {
      console.error("OpenRouter error:", error);
      res.status(500).json({ error: error?.message || "Failed to generate quiz" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
