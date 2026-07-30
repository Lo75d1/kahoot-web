import { describe, expect, it } from "vitest";
import {
  computeScore,
  isQuestionResponseCorrect,
  streakBonus,
} from "./scoring";
import { parseQuiz } from "./parser";

describe("computeScore", () => {
  it("returns zero for a wrong answer", () => {
    expect(computeScore(false, 100, 20, 1000)).toBe(0);
  });

  it("rewards speed and clamps late answers", () => {
    expect(computeScore(true, 0, 20, 1000)).toBe(1000);
    expect(computeScore(true, 10_000, 20, 1000)).toBe(750);
    expect(computeScore(true, 99_000, 20, 1000)).toBe(500);
  });
});

describe("streakBonus", () => {
  it("starts on the second correct answer and is capped", () => {
    expect(streakBonus(1)).toBe(0);
    expect(streakBonus(2)).toBe(100);
    expect(streakBonus(99)).toBe(500);
  });
});

describe("isQuestionResponseCorrect", () => {
  it("checks multi-select answers as a complete set", () => {
    const question = parseQuiz({
      questions: [
        {
          type: "multiple_choice",
          text: "Số chẵn",
          answers: [
            { text: "2", correct: true },
            { text: "3", correct: false },
            { text: "4", correct: true },
          ],
        },
      ],
    }).questions[0];
    expect(isQuestionResponseCorrect(question, [0, 2])).toBe(true);
    expect(isQuestionResponseCorrect(question, [0])).toBe(false);
  });

  it("normalizes whitespace and case in short answers", () => {
    const question = parseQuiz({
      questions: [
        {
          type: "short_answer",
          text: "Thủ đô?",
          answers: [{ text: "Hà Nội", correct: true }],
        },
      ],
    }).questions[0];
    expect(isQuestionResponseCorrect(question, "  hà   nội ")).toBe(true);
  });
});
