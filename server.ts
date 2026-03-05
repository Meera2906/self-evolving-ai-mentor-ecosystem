import { config } from 'dotenv';
config({ path: ".env" });
config({ path: ".env.local", override: true });

console.log("OPENROUTER_API_KEY loaded?", Boolean(process.env.OPENROUTER_API_KEY));
console.log("OPENROUTER_API_KEY prefix:", process.env.OPENROUTER_API_KEY?.slice(0, 10));

import express from "express";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";

import { LearnerAgent } from "./src/agents/learnerAgent";
import { StrategyAgent } from "./src/agents/strategyAgent";
import { AssessmentAgent } from "./src/agents/assessmentAgent";
import { AnalyticsAgent } from "./src/agents/analyticsAgent";

async function startServer() {
  const app = express();
  const PORT = 3000;

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
  
  // Initialize Agents
  const learnerAgent = new LearnerAgent();
  const strategyAgent = new StrategyAgent();
  const assessmentAgent = new AssessmentAgent();
  const analyticsAgent = new AnalyticsAgent();

  // API Routes
  app.get("/api/students", (req, res) => {
    try {
      res.json(learnerAgent.getAllStudents());
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/profile/:name", (req, res) => {
    try {
      const profile = learnerAgent.getProfile(req.params.name);
      const analytics = analyticsAgent.analyze(profile);
      res.json({ profile, analytics, logs: [...learnerAgent.getLogs(), ...analyticsAgent.getLogs()] });

      // Find weakest topic for personalized recommendation
      let weakestTopic = 'Coding';
      let lowestMastery = 'Strong';
      
      const topicEntries = Object.entries(profile.topics);
      if (topicEntries.length > 0) {
        // Simple priority: Weak > Moderate > Strong
        const masteryPriority = { 'Weak': 0, 'Moderate': 1, 'Strong': 2 };
        topicEntries.forEach(([topic, data]) => {
          if (masteryPriority[data.mastery] < masteryPriority[lowestMastery]) {
            lowestMastery = data.mastery;
            weakestTopic = topic;
          }
        });
      }
      
      const recommendation = strategyAgent.recommend(weakestTopic, lowestMastery as any);
      
      res.json({ 
        profile, 
        analytics, 
        recommendation,
        logs: [...learnerAgent.getLogs(), ...analyticsAgent.getLogs(), ...strategyAgent.getLogs()] 
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
      const recommendation = strategyAgent.recommend(topic, mastery);
      
      res.json({ 
        recommendation, 
        logs: [...strategyAgent.getLogs()] 
      });
      strategyAgent.clearLogs();
    } catch (error) {
      console.error("Error preparing quiz:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/quiz/submit", (req, res) => {
    try {
      const { name, topic, quiz, answers } = req.body;
      
      const score = assessmentAgent.evaluate(quiz, answers);
      const updatedTopic = learnerAgent.updateScore(name, topic, score);
      const recommendation = strategyAgent.recommend(topic, updatedTopic.mastery);
      const profile = learnerAgent.getProfile(name);
      const analytics = analyticsAgent.analyze(profile);

      res.json({
        score,
        updatedTopic,
        recommendation,
        analytics,
        logs: [
          ...assessmentAgent.getLogs(),
          ...learnerAgent.getLogs(),
          ...strategyAgent.getLogs(),
          ...analyticsAgent.getLogs()
        ]
      });

      assessmentAgent.clearLogs();
      learnerAgent.clearLogs();
      strategyAgent.clearLogs();
      analyticsAgent.clearLogs();
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/quiz/generate", async (req, res) => {
    try {
      const { topic, mastery } = req.body;

      const difficultyMap = { Weak: "Easy", Moderate: "Medium", Strong: "Hard" };
      const difficulty = difficultyMap[mastery] || "Easy";

      const prompt = `Generate a 5-question multiple choice quiz about ${topic} at ${difficulty} difficulty.
  Return ONLY valid JSON:
  {"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0}]}`;

      const resp = await openrouter.chat.completions.create(
        {
          model: "google/gemini-2.0-flash-001",
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            "HTTP-Referer": "http://localhost:3000",
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

  // Vite middleware for development
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
