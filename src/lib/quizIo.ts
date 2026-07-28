// Tiện ích: xuất JSON, tải file, trộn ngẫu nhiên, thống kê.

import type { Quiz } from "./types";

/** Chuỗi JSON gọn (chỉ shape Quiz, bỏ id/updatedAt) để backup / chia sẻ. */
export function toExportJson(quiz: Quiz): string {
  const clean = {
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions.map((q) => ({
      text: q.text,
      timeLimit: q.timeLimit,
      points: q.points,
      answers: q.answers.map((a) => ({ text: a.text, correct: a.correct })),
    })),
  };
  return JSON.stringify(clean, null, 2);
}

/** Tải chuỗi text xuống dưới dạng file (fallback khi không copy được). */
export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Bỏ dấu tiếng Việt -> slug an toàn cho tên file. */
export function slugify(s: string): string {
  const base = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return base || "de";
}

/** Tổng thời gian (giây) của bộ đề. */
export function totalSeconds(quiz: Quiz): number {
  return quiz.questions.reduce((sum, q) => sum + q.timeLimit, 0);
}

/** Định dạng "~X phút" hoặc "~Y giây". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `~${seconds} giây`;
  const m = Math.round(seconds / 60);
  return `~${m} phút`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Trộn thứ tự câu hỏi và đáp án trong mỗi câu. */
export function shuffleQuiz(quiz: Quiz): Quiz {
  return {
    ...quiz,
    questions: shuffle(quiz.questions).map((q) => ({
      ...q,
      answers: shuffle(q.answers),
    })),
  };
}
