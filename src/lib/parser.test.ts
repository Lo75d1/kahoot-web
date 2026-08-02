import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("accepts a short answer with one canonical response", () => {
    const quiz = parseQuiz({
      questions: [
        {
          type: "short_answer",
          text: "Ký hiệu hóa học của oxy?",
          answers: [{ text: "O", correct: true }],
        },
      ],
    });

    expect(quiz.questions[0].type).toBe("short_answer");
    expect(quiz.questions[0].answers).toHaveLength(1);
  });

  it("accepts an essay and normalizes delayed hints", () => {
    const quiz = parseQuiz({
      questions: [{
        type: "essay",
        text: "Phân tích vai trò của chuyển đổi số trong giáo dục.",
        answers: [],
        hint: "Lập luận theo ba khía cạnh: tiếp cận, tương tác và đánh giá.",
        hintDelaySeconds: 45,
        timeLimit: 120,
      }],
    });

    expect(quiz.questions[0]).toMatchObject({
      type: "essay",
      answers: [],
      hintDelaySeconds: 45,
    });
  });

  it("accepts the public Gemini tutorial sample", () => {
    const raw = JSON.parse(readFileSync(join(process.cwd(), "public", "samples", "ket-qua-gemini-mau.json"), "utf8"));
    const quiz = parseQuiz(raw);

    expect(quiz.questions).toHaveLength(4);
    expect(quiz.questions.map((question) => question.type)).toContain("essay");
    expect(quiz.questions.some((question) => question.hintDelaySeconds === 30)).toBe(true);
  });
});
