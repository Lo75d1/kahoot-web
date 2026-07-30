import type { Quiz, RoundResult } from "./types";

export type LearningMode = "learn" | "practice" | "exam";

export interface AttemptSummary {
  id: string;
  quizTitle: string;
  mode: LearningMode;
  completedAt: number;
  correct: number;
  total: number;
  score: number;
  weakTopics: string[];
}

const ATTEMPTS_KEY = "kashot-attempts-v1";

export function saveAttempt(
  quiz: Quiz,
  mode: LearningMode,
  results: RoundResult[],
  score: number,
): AttemptSummary {
  const missedTopics = quiz.questions.flatMap((question, index) =>
    results[index]?.correct ? [] : question.topics,
  );
  const weakTopics = [...new Set(missedTopics)];
  const summary: AttemptSummary = {
    id: crypto.randomUUID(),
    quizTitle: quiz.title,
    mode,
    completedAt: Date.now(),
    correct: results.filter((result) => result.correct).length,
    total: quiz.questions.length,
    score,
    weakTopics,
  };
  try {
    const current = listAttempts();
    localStorage.setItem(
      ATTEMPTS_KEY,
      JSON.stringify([summary, ...current].slice(0, 100)),
    );
  } catch {
    // Lịch sử là tính năng hỗ trợ; lỗi lưu không được làm hỏng lượt học.
  }
  return summary;
}

export function listAttempts(): AttemptSummary[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "[]") as AttemptSummary[];
  } catch {
    return [];
  }
}
