import { Quiz, MasteryLevel } from "../types";

export async function generateQuizWithAI(
  topic: string,
  mastery: MasteryLevel
): Promise<Quiz> {
  const res = await fetch("/api/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, mastery }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Quiz generation failed");
  }

  return res.json();
}

export async function generateDiagnosticQuiz(topic: string): Promise<Quiz> {
  const res = await fetch("/api/diagnostic/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Diagnostic quiz generation failed");
  }

  return res.json();
}