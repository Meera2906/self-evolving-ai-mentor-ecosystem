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

    const weakConcepts = updatedTopic.concepts
      ? Object.values(updatedTopic.concepts)
          .filter((c: any) => c.accuracy < 60)
          .map((c: any) => c.concept)
      : [];

    const prompt = `
As an AI Learning Mentor, provide structured feedback for a student who just completed a quiz.

Student Name: ${name}
Topic: ${topic}
Current Quiz Score: ${score}% (${correctCount} correct, ${incorrectCount} incorrect)
Current Mastery Level: ${updatedTopic.mastery}
Total Attempts on this topic: ${updatedTopic.attempts}

Weak Concepts Identified:
${weakConcepts.length > 0 ? weakConcepts.join(", ") : "None specifically identified yet."}

Concept Performance Breakdown:
${JSON.stringify(updatedTopic.concepts || {})}

Quiz Details:
${quiz.questions
  .map((q, i) => `Q: ${q.question} | Correct: ${q.correctIndex === answers[i]}`)
  .join("\n")}

Return ONLY valid JSON in exactly this format (no markdown, no extra text):
{
  "summary": "Short overall evaluation of the student's performance.",
  "strengths": ["2–3 things the student did well"],
  "weaknesses": ["2–3 areas where the student needs improvement"],
  "nextSteps": ["3 actionable recommendations to improve learning"]
}
`;

    try {
      const openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY || "",
        baseURL: "https://openrouter.ai/api/v1",
      });

      const resp = await openrouter.chat.completions.create(
        {
          model: "google/gemini-2.0-flash-001", // pick any OpenRouter model id you know works
          messages: [
            {
              role: "system",
              content:
                "You are an AI learning mentor. Return ONLY valid JSON with keys: summary, strengths, weaknesses, nextSteps. No markdown.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" }, // best-effort JSON enforcement
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
      const feedback = this.safeJsonParse(text);

      if (
        feedback &&
        typeof feedback.summary === "string" &&
        Array.isArray(feedback.strengths) &&
        Array.isArray(feedback.weaknesses) &&
        Array.isArray(feedback.nextSteps)
      ) {
        this.log("Feedback generated successfully");
        return feedback;
      }

      throw new Error("Invalid mentor feedback JSON");
    } catch (error: any) {
      this.log(`Error generating feedback: ${error?.message || String(error)}`);

      return {
        summary: `You scored ${score}% on ${topic}. Your current mastery is ${updatedTopic.mastery}.`,
        strengths: ["Completed the assessment", "Engaged with the learning material"],
        weaknesses: ["Needs more practice to improve score"],
        nextSteps: ["Review the incorrect answers", "Try another quiz", "Watch recommended videos"],
      };
    }
  }
}