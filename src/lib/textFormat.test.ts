import { describe, expect, it } from "vitest";
import { parseCommonQuizText, parseCsv, parseMarkerText } from "./textFormat";

describe("document import formats", () => {
  it("parses marker text", () => {
    const quiz = parseMarkerText(`# Địa lý
Thủ đô Việt Nam?
* Hà Nội
- Huế`);

    expect(quiz.title).toBe("Địa lý");
    expect(quiz.questions[0].answers[0].correct).toBe(true);
  });

  it("parses quoted CSV and an answer key", () => {
    const quiz = parseCsv(
      'Câu hỏi,Đáp án A,Đáp án B,Đáp án đúng\n"2, cộng 2?",4,5,A',
    );

    expect(quiz.questions[0].text).toBe("2, cộng 2?");
    expect(quiz.questions[0].answers[0].correct).toBe(true);
  });

  it("recognizes a common Vietnamese exam layout", () => {
    const quiz = parseCommonQuizText(`Câu 1. Thủ đô Việt Nam là gì?
A. Hà Nội
B. Huế
C. Đà Nẵng
Đáp án: A

2) 2 + 2 bằng bao nhiêu?
A) 3
B) 4
C) 5
Đáp án B`);

    expect(quiz.questions).toHaveLength(2);
    expect(quiz.questions[0].answers[0].correct).toBe(true);
    expect(quiz.questions[1].answers[1].correct).toBe(true);
    expect(quiz.questions[0].status).toBe("needs_review");
  });
});
