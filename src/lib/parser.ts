// Parser + kiểm tra hợp lệ: bóc JSON thô -> Quiz chuẩn hóa.
// Ném QuizParseError với thông báo tiếng Việt rõ ràng khi dữ liệu sai.

import type { Quiz, Question, Answer } from "./types";

export class QuizParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizParseError";
  }
}

const MAX_TIME_LIMIT = 120; // giây
const MAX_ANSWERS = 4;

/** Nhận vào object đã parse hoặc chuỗi JSON, trả về Quiz đã chuẩn hóa. */
export function parseQuiz(input: unknown): Quiz {
  let data: unknown = input;

  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      throw new QuizParseError("JSON không hợp lệ — không đọc được cú pháp.");
    }
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new QuizParseError('Đề phải là một object có trường "questions".');
  }

  const obj = data as Record<string, unknown>;

  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim()
      : "Bộ đề không tên";
  const description =
    typeof obj.description === "string" ? obj.description.trim() : "";

  if (!Array.isArray(obj.questions) || obj.questions.length === 0) {
    throw new QuizParseError('Cần mảng "questions" có ít nhất 1 câu hỏi.');
  }

  const questions: Question[] = obj.questions.map((q, i) =>
    parseQuestion(q, i),
  );

  return { title, description, questions };
}

function parseQuestion(raw: unknown, index: number): Question {
  const where = `Câu ${index + 1}`;
  if (!raw || typeof raw !== "object") {
    throw new QuizParseError(`${where}: sai định dạng (không phải object).`);
  }
  const q = raw as Record<string, unknown>;

  const text = typeof q.text === "string" ? q.text.trim() : "";
  if (!text) {
    throw new QuizParseError(`${where}: thiếu nội dung "text".`);
  }

  if (!Array.isArray(q.answers)) {
    throw new QuizParseError(`${where}: thiếu mảng "answers".`);
  }
  if (q.answers.length < 2) {
    throw new QuizParseError(`${where}: cần ít nhất 2 đáp án.`);
  }
  if (q.answers.length > MAX_ANSWERS) {
    throw new QuizParseError(`${where}: tối đa ${MAX_ANSWERS} đáp án.`);
  }

  const answers: Answer[] = q.answers.map((a, j) => parseAnswer(a, index, j));

  if (!answers.some((a) => a.correct)) {
    throw new QuizParseError(`${where}: phải có ít nhất 1 đáp án đúng.`);
  }

  const timeLimit =
    typeof q.timeLimit === "number" && Number.isFinite(q.timeLimit) && q.timeLimit > 0
      ? Math.min(Math.round(q.timeLimit), MAX_TIME_LIMIT)
      : 20;
  const points =
    typeof q.points === "number" && Number.isFinite(q.points) && q.points > 0
      ? Math.round(q.points)
      : 1000;

  return { text, timeLimit, points, answers };
}

function parseAnswer(raw: unknown, qIndex: number, aIndex: number): Answer {
  const where = `Câu ${qIndex + 1}, đáp án ${aIndex + 1}`;
  // Cho phép dạng { text, correct } hoặc chuỗi thuần (mặc định sai).
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) throw new QuizParseError(`${where}: thiếu nội dung.`);
    return { text: t, correct: false };
  }
  if (!raw || typeof raw !== "object") {
    throw new QuizParseError(`${where}: sai định dạng.`);
  }
  const a = raw as Record<string, unknown>;
  const text = typeof a.text === "string" ? a.text.trim() : "";
  if (!text) throw new QuizParseError(`${where}: thiếu nội dung "text".`);
  return { text, correct: Boolean(a.correct) };
}
