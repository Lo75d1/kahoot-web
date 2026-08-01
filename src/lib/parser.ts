// Parser + kiểm tra hợp lệ: bóc JSON thô -> Quiz chuẩn hóa.
// Ném QuizParseError với thông báo tiếng Việt rõ ràng khi dữ liệu sai.

import type {
  Quiz,
  Question,
  Answer,
  QuestionDifficulty,
  QuestionOrigin,
  QuestionType,
  ReviewStatus,
} from "./types";

export class QuizParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuizParseError";
  }
}

const MAX_TIME_LIMIT = 120; // giây
const MAX_ANSWERS = 8;
const QUESTION_TYPES = new Set<QuestionType>([
  "single_choice",
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank",
  "matching",
  "ordering",
  "essay",
]);

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

  const version =
    typeof obj.version === "number" && Number.isFinite(obj.version)
      ? Math.max(1, Math.round(obj.version))
      : 1;
  const tags = parseStringArray(obj.tags);

  return { title, description, questions, version, tags };
}

function parseQuestion(raw: unknown, index: number): Question {
  const where = `Câu ${index + 1}`;
  if (!raw || typeof raw !== "object") {
    throw new QuizParseError(`${where}: sai định dạng (không phải object).`);
  }
  const q = raw as Record<string, unknown>;
  const type = QUESTION_TYPES.has(q.type as QuestionType)
    ? (q.type as QuestionType)
    : "single_choice";

  const text = typeof q.text === "string" ? q.text.trim() : "";
  if (!text) {
    throw new QuizParseError(`${where}: thiếu nội dung "text".`);
  }

  if (!Array.isArray(q.answers)) {
    throw new QuizParseError(`${where}: thiếu mảng "answers".`);
  }
  const minAnswers = type === "essay" ? 0 : type === "short_answer" || type === "fill_blank" ? 1 : 2;
  if (q.answers.length < minAnswers) {
    throw new QuizParseError(`${where}: cần ít nhất ${minAnswers} đáp án.`);
  }
  if (q.answers.length > MAX_ANSWERS) {
    throw new QuizParseError(`${where}: tối đa ${MAX_ANSWERS} đáp án.`);
  }

  const answers: Answer[] = q.answers.map((a, j) => parseAnswer(a, index, j));

  if (type !== "essay" && !answers.some((a) => a.correct)) {
    throw new QuizParseError(`${where}: phải có ít nhất 1 đáp án đúng.`);
  }
  if (
    (type === "single_choice" || type === "true_false") &&
    answers.filter((a) => a.correct).length !== 1
  ) {
    throw new QuizParseError(`${where}: dạng này phải có đúng 1 đáp án đúng.`);
  }

  const timeLimit =
    typeof q.timeLimit === "number" && Number.isFinite(q.timeLimit) && q.timeLimit > 0
      ? Math.min(Math.round(q.timeLimit), MAX_TIME_LIMIT)
      : 20;
  const points =
    typeof q.points === "number" && Number.isFinite(q.points) && q.points > 0
      ? Math.round(q.points)
      : 1000;

  const difficulty: QuestionDifficulty =
    q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium";
  const status: ReviewStatus =
    q.status === "needs_review" || q.status === "approved" || q.status === "archived"
      ? q.status
      : "draft";
  const origin: QuestionOrigin =
    q.origin === "imported" || q.origin === "ai_generated" ? q.origin : "manual";
  const confidence =
    typeof q.confidence === "number" && Number.isFinite(q.confidence)
      ? Math.min(1, Math.max(0, q.confidence))
      : undefined;

  return {
    type,
    text,
    timeLimit,
    points,
    answers,
    explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
    hint: typeof q.hint === "string" ? q.hint.trim() : "",
    hintDelaySeconds:
      typeof q.hintDelaySeconds === "number" && Number.isFinite(q.hintDelaySeconds)
        ? Math.min(120, Math.max(0, Math.round(q.hintDelaySeconds)))
        : 0,
    difficulty,
    topics: parseStringArray(q.topics),
    status,
    origin,
    confidence,
    sourceRefs: parseStringArray(q.sourceRefs),
  };
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

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
