// Cách tính điểm kiểu Kahoot: đúng + nhanh = điểm cao.
//   điểm = points × (1 − (thời_gian_trả_lời / thời_gian_câu) / 2)
// -> trả lời tức thì ≈ points, sát giờ chót ≈ points/2, sai = 0.
// Cộng thêm điểm chuỗi (streak) nhẹ để thưởng trả lời đúng liên tiếp.
import type { Question } from "./types";

const STREAK_STEP = 100; // mỗi câu đúng liên tiếp (từ câu thứ 2) cộng thêm
const STREAK_CAP = 500; // trần điểm chuỗi

export function computeScore(
  correct: boolean,
  responseMs: number,
  timeLimitSec: number,
  basePoints: number,
): number {
  if (!correct) return 0;
  const limitMs = Math.max(timeLimitSec * 1000, 1);
  const frac = Math.min(Math.max(responseMs, 0) / limitMs, 1);
  return Math.round(basePoints * (1 - frac / 2));
}

/**
 * Điểm thưởng chuỗi theo số câu đúng liên tiếp (đã tính cả câu hiện tại).
 * streak = 1 -> 0đ, 2 -> 100đ, 3 -> 200đ, ... trần 500đ.
 */
export function streakBonus(streak: number): number {
  if (streak <= 1) return 0;
  return Math.min((streak - 1) * STREAK_STEP, STREAK_CAP);
}

export function isQuestionResponseCorrect(
  question: Question,
  response: number | number[] | string | null,
): boolean {
  if (response === null) return false;
  if (typeof response === "string") {
    const normalize = (value: string) =>
      value
        .normalize("NFC")
        .trim()
        .toLocaleLowerCase("vi-VN")
        .replace(/\s+/g, " ");
    return question.answers
      .filter((answer) => answer.correct)
      .some((answer) => normalize(answer.text) === normalize(response));
  }
  const picked = Array.isArray(response) ? response : [response];
  const expected = question.answers
    .map((answer, index) => (answer.correct ? index : -1))
    .filter((index) => index >= 0);
  return (
    picked.length > 0 &&
    picked.length === expected.length &&
    picked.every((index) => expected.includes(index))
  );
}
