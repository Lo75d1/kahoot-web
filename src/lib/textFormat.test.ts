import { describe, expect, it } from "vitest";
import { parseCsv, parseMarkerText } from "./textFormat";

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
});
