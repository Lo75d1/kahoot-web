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
const REVIEW_KEY = "kashot-review-cards-v1";

export interface ReviewCard {
  quizTitle: string;
  questionKey: string;
  dueAt: number;
  intervalDays: number;
  ease: number;
  lapses: number;
}

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
    updateReviewCards(quiz, results);
  } catch {
    // Lịch sử là tính năng hỗ trợ; lỗi lưu không được làm hỏng lượt học.
  }
  return summary;
}

export function scheduleReview(
  previous: ReviewCard | undefined,
  correct: boolean,
  now = Date.now(),
): ReviewCard {
  const base = previous ?? {
    quizTitle: "",
    questionKey: "",
    dueAt: now,
    intervalDays: 0,
    ease: 2.3,
    lapses: 0,
  };
  const ease = correct
    ? Math.min(3, base.ease + 0.05)
    : Math.max(1.3, base.ease - 0.2);
  const intervalDays = correct
    ? base.intervalDays <= 0
      ? 1
      : Math.max(1, Math.round(base.intervalDays * ease))
    : 0.15;
  return {
    ...base,
    ease,
    intervalDays,
    lapses: base.lapses + (correct ? 0 : 1),
    dueAt: now + intervalDays * 86_400_000,
  };
}

export function listReviewCards(): ReviewCard[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(REVIEW_KEY) || "[]") as ReviewCard[];
  } catch {
    return [];
  }
}

export function dueReviewCount(now = Date.now()): number {
  return listReviewCards().filter((card) => card.dueAt <= now).length;
}

function updateReviewCards(quiz: Quiz, results: RoundResult[]) {
  const current = listReviewCards();
  const next = [...current];
  results.forEach((result, questionIndex) => {
    const questionKey = quiz.questions[questionIndex]?.text ?? String(questionIndex);
    const index = next.findIndex(
      (card) =>
        card.quizTitle === quiz.title && card.questionKey === questionKey,
    );
    const scheduled = scheduleReview(index >= 0 ? next[index] : undefined, result.correct);
    const card = { ...scheduled, quizTitle: quiz.title, questionKey };
    if (index >= 0) next[index] = card;
    else next.push(card);
  });
  localStorage.setItem(REVIEW_KEY, JSON.stringify(next));
}

export function listAttempts(): AttemptSummary[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || "[]") as AttemptSummary[];
  } catch {
    return [];
  }
}
