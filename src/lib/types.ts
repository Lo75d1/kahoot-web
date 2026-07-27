// Kiểu dữ liệu dùng chung cho ngân hàng đề & màn chơi.

export interface Answer {
  text: string;
  correct: boolean;
}

export interface Question {
  text: string;
  /** Thời gian trả lời (giây). */
  timeLimit: number;
  /** Điểm tối đa cho câu này khi trả lời đúng & tức thì. */
  points: number;
  answers: Answer[];
}

export interface Quiz {
  title: string;
  description: string;
  questions: Question[];
}

/** Kết quả một câu, dùng cho tổng kết. */
export interface RoundResult {
  correct: boolean;
  earned: number;
  responseMs: number | null; // null = hết giờ không trả lời
}
