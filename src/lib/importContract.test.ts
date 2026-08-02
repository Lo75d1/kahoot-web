import { describe, expect, it } from "vitest";
import { parseImportResult } from "./importContract";

const question = { text: "2 + 2 bằng mấy?", answers: [{ text: "4", correct: true }, { text: "5", correct: false }], status: "needs_review", confidence: .6 };

describe("Gemini import contract", () => {
  it("accepts the kind=quiz envelope and reports quality", () => {
    const result = parseImportResult(JSON.stringify({ kind: "quiz", quiz: { title: "Toán", questions: [question] } }));
    expect(result.kind).toBe("quiz");
    expect(result.report.lowConfidenceCount).toBe(1);
    expect(result.report.needsReview).toBe(1);
  });

  it("keeps valid questions when another question is invalid", () => {
    const result = parseImportResult({ kind: "quiz", quiz: { title: "Toán", questions: [question, { answers: [] }] } });
    expect(result.quiz.questions).toHaveLength(1);
    expect(result.report.rejected).toBe(1);
  });
});
