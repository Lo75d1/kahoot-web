// Kiểu dữ liệu dùng chung cho ngân hàng đề & màn chơi.

export interface Answer {
  text: string;
  correct: boolean;
}

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "fill_blank"
  | "matching"
  | "ordering"
  | "essay";

export type QuestionDifficulty = "easy" | "medium" | "hard";
export type ReviewStatus = "draft" | "needs_review" | "approved" | "archived";
export type QuestionOrigin = "manual" | "imported" | "ai_generated";

export interface Question {
  /** Dữ liệu cũ không có type sẽ được parser nâng thành single_choice. */
  type: QuestionType;
  text: string;
  /** Thời gian trả lời (giây). */
  timeLimit: number;
  /** Điểm tối đa cho câu này khi trả lời đúng & tức thì. */
  points: number;
  answers: Answer[];
  explanation: string;
  hint: string;
  difficulty: QuestionDifficulty;
  topics: string[];
  status: ReviewStatus;
  origin: QuestionOrigin;
  confidence?: number;
  sourceRefs?: string[];
}

export interface Quiz {
  title: string;
  description: string;
  questions: Question[];
  version: number;
  tags: string[];
}

/** Kết quả một câu, dùng cho tổng kết. */
export interface RoundResult {
  correct: boolean;
  earned: number;
  responseMs: number | null; // null = hết giờ không trả lời
}
