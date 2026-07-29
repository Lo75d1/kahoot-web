import { describe, expect, it } from "vitest";
import { parseQuiz, QuizParseError } from "./parser";

describe("parseQuiz", () => {
  it("normalizes a valid quiz", () => {
    const quiz = parseQuiz({
      title: "  Toán  ",
      questions: [
        {
          text: " 2 + 2? ",
          timeLimit: 999,
          points: 500,
          answers: [
            { text: "4", correct: true },
            { text: "5", correct: false },
          ],
        },
      ],
    });

    expect(quiz.title).toBe("Toán");
    expect(quiz.questions[0].timeLimit).toBe(120);
    expect(quiz.questions[0].answers[0]).toEqual({
      text: "4",
      correct: true,
    });
  });

  it("rejects a question without a correct answer", () => {
    expect(() =>
      parseQuiz({
        questions: [
          {
            text: "Câu hỏi",
            answers: [
              { text: "A", correct: false },
              { text: "B", correct: false },
            ],
          },
        ],
      }),
    ).toThrow(QuizParseError);
  });
});
