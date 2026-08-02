import { extractJson } from "./aiPrompt";
import { parseQuiz } from "./parser";
import { parseByRules, type Rules } from "./ruleParser";
import type { Quiz } from "./types";

export interface ImportIssue {
  level: "error" | "warning";
  message: string;
  questionIndex?: number;
}

export interface ImportQualityReport {
  total: number;
  ready: number;
  needsReview: number;
  rejected: number;
  duplicateCount: number;
  lowConfidenceCount: number;
  missingSourceCount: number;
  essayCount: number;
  issues: ImportIssue[];
}

export interface ImportResult {
  quiz: Quiz;
  kind: "quiz" | "rules" | "legacy";
  report: ImportQualityReport;
}

export function assessImportQuality(quiz: Quiz, initial: ImportIssue[] = []): ImportQualityReport {
  const issues = [...initial];
  const seen = new Map<string, number>();
  let duplicateCount = 0;
  let lowConfidenceCount = 0;
  let missingSourceCount = 0;
  quiz.questions.forEach((question, index) => {
    const key = question.text.toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
    if (seen.has(key)) {
      duplicateCount++;
      issues.push({ level: "warning", questionIndex: index, message: `Trùng nội dung với câu ${(seen.get(key) ?? 0) + 1}.` });
    } else seen.set(key, index);
    if (question.confidence !== undefined && question.confidence < .75) {
      lowConfidenceCount++;
      issues.push({ level: "warning", questionIndex: index, message: `Độ tin cậy thấp (${Math.round(question.confidence * 100)}%).` });
    }
    if (!question.sourceRefs?.length) missingSourceCount++;
  });
  const needsReview = quiz.questions.filter((question) => question.status !== "approved").length;
  return {
    total: quiz.questions.length,
    ready: quiz.questions.length - needsReview - duplicateCount,
    needsReview,
    rejected: initial.filter((issue) => issue.level === "error").length,
    duplicateCount,
    lowConfidenceCount,
    missingSourceCount,
    essayCount: quiz.questions.filter((question) => question.type === "essay").length,
    issues,
  };
}

function parseQuizLenient(raw: Record<string, unknown>): { quiz: Quiz; issues: ImportIssue[] } {
  if (!Array.isArray(raw.questions)) return { quiz: parseQuiz(raw), issues: [] };
  const questions: Quiz["questions"] = [];
  const issues: ImportIssue[] = [];
  raw.questions.forEach((question, index) => {
    try {
      const parsed = parseQuiz({ ...raw, questions: [question] });
      questions.push(parsed.questions[0]);
    } catch (cause) {
      issues.push({ level: "error", questionIndex: index, message: cause instanceof Error ? cause.message : "Câu hỏi sai định dạng." });
    }
  });
  if (!questions.length) throw new Error("Không có câu hỏi hợp lệ để kiểm duyệt.");
  return { quiz: parseQuiz({ ...raw, questions }), issues };
}

export function parseImportResult(raw: string | unknown, source = ""): ImportResult {
  const value = typeof raw === "string" ? JSON.parse(extractJson(raw)) as Record<string, unknown> : raw as Record<string, unknown>;
  let kind: ImportResult["kind"] = "legacy";
  let parsed: { quiz: Quiz; issues: ImportIssue[] };
  if (value?.kind === "quiz") {
    kind = "quiz";
    parsed = parseQuizLenient(value.quiz as Record<string, unknown>);
  } else if (value?.kind === "rules") {
    if (!source.trim()) throw new Error("Kết quả là quy tắc; cần tải hoặc dán tài liệu gốc để code áp dụng.");
    kind = "rules";
    parsed = { quiz: parseByRules(source, value.rules as Rules), issues: [] };
  } else if (Array.isArray(value?.questions)) parsed = parseQuizLenient(value);
  else {
    if (!source.trim()) throw new Error("JSON quy tắc cần đi kèm nội dung tài liệu gốc.");
    parsed = { quiz: parseByRules(source, value as unknown as Rules), issues: [] };
  }
  return { quiz: parsed.quiz, kind, report: assessImportQuality(parsed.quiz, parsed.issues) };
}
