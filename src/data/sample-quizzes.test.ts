import { describe, expect, it } from "vitest";
import sampleQuizzes from "./sample-quizzes.json";
import { parseQuiz } from "@/lib/parser";

describe("sample quiz pack", () => {
  it("contains four valid, approved sample quizzes", () => {
    const parsed = sampleQuizzes.map((quiz) => parseQuiz(quiz));
    expect(parsed).toHaveLength(4);
    expect(parsed.every((quiz) => quiz.questions.length === 10)).toBe(true);
    expect(
      parsed.every((quiz) =>
        quiz.questions.every((question) => question.status === "approved"),
      ),
    ).toBe(true);
  });

  it("includes explanations, topics and diverse question types", () => {
    const questions = sampleQuizzes.flatMap((quiz) => parseQuiz(quiz).questions);
    expect(questions.every((question) => question.explanation.length > 0)).toBe(true);
    expect(questions.every((question) => question.topics.length > 0)).toBe(true);
    expect(new Set(questions.map((question) => question.type)).size).toBeGreaterThanOrEqual(5);
  });
});
