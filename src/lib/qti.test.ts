import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildCanvasQti } from "./qti";
import { parseQuiz } from "./parser";

describe("Canvas QTI export", () => {
  it("creates an importable zip with manifest and assessment", async () => {
    const quiz = parseQuiz({ title: "Đề thử", questions: [{ text: "Chọn A", answers: [{ text: "A", correct: true }, { text: "B", correct: false }] }] });
    const blob = await buildCanvasQti(quiz);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file("imsmanifest.xml")).toBeTruthy();
    const xml = await zip.file("assessment_qti.xml")!.async("string");
    expect(xml).toContain("Đề thử");
    expect(xml).toContain("a0");
  });
});
