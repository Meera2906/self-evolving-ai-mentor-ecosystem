import OpenAI from "openai";
import { AnalyticsData, MentorFeedback, Quiz, TopicData } from "../types";

export class MentorAgent {
  private logs: string[] = [];

  private log(message: string) {
    const logMsg = `[Mentor Agent] ${message}`;
    console.log(logMsg);
    this.logs.push(logMsg);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  private safeJsonParse(text: string): MentorFeedback | null {
    try {
      // If model returns extra text, attempt to extract JSON object
      const a = text.indexOf("{");
      const b = text.lastIndexOf("}");
      const jsonStr = a !== -1 && b !== -1 ? text.slice(a, b + 1) : text;
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  async generateFeedback(
    name: string,
    topic: string,
    score: number,
    quiz: Quiz,
    answers: number[],
    updatedTopic: TopicData,
    analytics: AnalyticsData
  ): Promise<MentorFeedback> {
    this.log(`Generating feedback for ${name} on ${topic}`);

    const correctCount = quiz.questions.filter((q, i) => q.correctIndex === answers[i]).length;
    const incorrectCount = quiz.questions.length - correctCount;

    // Keep it short; LLMs do better with compact, structured inputs
    const questionOutcomes = quiz.questions.map((q, i) => ({
      q: q.question,
      correct: q.correctIndex,
      chosen: answers[i],
      isCorrect: q.correctIndex === answers[i],
      explanation: (q as any).explanation ?? undefined,
    }));

    const system = `You are an AI learning mentor in an adaptive education platform.
Return ONLY valid JSON with keys: summary, strengths, weaknesses, nextSteps.
No markdown, no extra text. Be encouraging and practical.`;

    const user = {
      studentName: name,
      topic,
      currentQuiz: {
        scorePercent: score,
        totalQuestions: quiz.questions.length,
        correctCount,
        incorrectCount,
      },
      mastery: {
        level: updatedTopic.mastery,
        attemptsOnTopic: updatedTopic.attempts,
        recentScores: updatedTopic.scores?.slice(-5) ?? [],
      },
      analytics: {
        averageScore: analytics.averageScore,
        totalAttempts: analytics.totalAttempts,
        trend: analytics.trend,
      },
      outcomes: questionOutcomes,
      requiredJsonFormat: {
        summary: "Short 1-2 sentence evaluation",
        strengths: ["2-3 items"],
        weaknesses: ["2-3 items"],
        nextSteps: ["3 actionable items"],
      },
    };

    try {
      const openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY || "",
        baseURL: "https://openrouter.ai/api/v1",
      });

      const resp = await openrouter.chat.completions.create(
        {
          model: "google/gemini-2.0-flash-001", // ✅ change if you want
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(user) },
          ],
          // Best-effort JSON enforcement (supported by many models/routes)
          response_format: { type: "json_object" },
          temperature: 0.4,
        },
        {
          headers: {
            "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
            "X-Title": "Self-Evolving AI Mentor Ecosystem",
          },
        }
      );

      const text = resp.choices?.[0]?.message?.content ?? "{}";
      const parsed = this.safeJsonParse(text);

      if (
        parsed &&
        typeof parsed.summary === "string" &&
        Array.isArray(parsed.strengths) &&
        Array.isArray(parsed.weaknesses) &&
        Array.isArray(parsed.nextSteps)
      ) {
        this.log("Feedback generated successfully");
        return parsed;
      }

      throw new Error("Invalid mentor feedback JSON");
    } catch (error: any) {
      this.log(`Error generating feedback: ${error?.message || String(error)}`);

      return {
        summary: `You scored ${score}% on ${topic}. Your current mastery is ${updatedTopic.mastery}.`,
        strengths: ["Completed the assessment", "Engaged with the learning material"],
        weaknesses: ["Needs more practice to improve consistency"],
        nextSteps: ["Review the incorrect answers", "Try another quiz at the right difficulty", "Practice focused questions on weak areas"],
      };
    }
  }
}