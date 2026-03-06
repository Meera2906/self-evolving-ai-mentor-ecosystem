import { Quiz, MasteryLevel } from "../types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Request failed");
  }

  return res.json();
}

export async function generateQuizWithAI(
  topic: string,
  mastery: MasteryLevel
): Promise<Quiz> {
  return postJson<Quiz>("/api/quiz/generate", { topic, mastery });
}

export async function generateDiagnosticQuiz(topic: string): Promise<Quiz> {
  return postJson<Quiz>("/api/quiz/diagnostic", { topic });
}