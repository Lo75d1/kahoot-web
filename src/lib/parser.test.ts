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

  it("upgrades legacy questions and preserves learning metadata", () => {
    const quiz = parseQuiz({
      tags: [" Toán ", "Toán"],
      questions: [
        {
          text: "Chọn các số chẵn",
          type: "multiple_choice",
          answers: [
            { text: "2", correct: true },
            { text: "3", correct: false },
            { text: "4", correct: true },
          ],
          explanation: "Số chẵn chia hết cho 2.",
          difficulty: "easy",
          topics: ["Số học"],
          status: "approved",
        },
      ],
    });

    expect(quiz.tags).toEqual(["Toán"]);
    expect(quiz.questions[0]).toMatchObject({
      type: "multiple_choice",
      explanation: "Số chẵn chia hết cho 2.",
      difficulty: "easy",
      topics: ["Số học"],
      status: "approved",
    });
  });
});
