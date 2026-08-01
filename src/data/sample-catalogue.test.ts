import { describe, expect, it } from "vitest";
import { parseQuiz } from "@/lib/parser";
import { sampleCatalogue } from "./sample-catalogue";

describe("sample catalogue", () => {
  it("contains exactly 60 unique, parseable mini quizzes", () => {
    const parsed = sampleCatalogue.map((item) => parseQuiz(item));
    expect(parsed).toHaveLength(60);
    expect(new Set(parsed.map((item) => item.title)).size).toBe(60);
    expect(parsed.every((item) => item.questions.length === 5)).toBe(true);
  });

  it("ships approved questions with explanations, topics and one correct answer", () => {
    const questions = sampleCatalogue.flatMap((item) => parseQuiz(item).questions);
    expect(questions).toHaveLength(300);
    expect(questions.every((item) => item.status === "approved")).toBe(true);
    expect(questions.every((item) => item.explanation.length > 0 && item.topics.length > 0)).toBe(true);
    expect(questions.every((item) => item.answers.filter((answer) => answer.correct).length === 1)).toBe(true);
  });
});
