import { config } from 'dotenv';
config();
import express from "express";
import { createServer as createViteServer } from "vite";
import { LearnerAgent } from "./src/agents/learnerAgent";
import { StrategyAgent } from "./src/agents/strategyAgent";
import { AssessmentAgent } from "./src/agents/assessmentAgent";
import { AnalyticsAgent } from "./src/agents/analyticsAgent";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
      learnerAgent.clearLogs();
      analyticsAgent.clearLogs();
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/quiz/generate", async (req, res) => {
    try {
      const { name, topic } = req.body;
      const profile = learnerAgent.getProfile(name);
      const topicData = profile.topics[topic] || { mastery: 'Weak' };
      
      const quiz = await assessmentAgent.generateQuiz(topic, topicData.mastery);
      const recommendation = strategyAgent.recommend(topic, topicData.mastery);
      
      res.json({ 
        quiz, 
        recommendation, 
        logs: [...assessmentAgent.getLogs(), ...strategyAgent.getLogs()] 
      });
      assessmentAgent.clearLogs();
      strategyAgent.clearLogs();
    } catch (error) {
      console.error("Error generating quiz:", error);
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
