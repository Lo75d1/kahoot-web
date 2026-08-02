import type { Quiz, RoundResult } from "./types";

export type SubmissionResponse = number | number[] | string | null;
export interface EssayGrade { points: number; feedback: string; }
export interface Submission {
  id: string; quizTitle: string; submittedAt: number; quiz: Quiz;
  responses: Record<number, SubmissionResponse>; results: RoundResult[];
  grades: Record<number, EssayGrade>; status: "pending_review" | "graded" | "published";
}
const KEY = "uda-submissions-v1";
export function listSubmissions(): Submission[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Submission[]; } catch { return []; } }
function write(items: Submission[]) { localStorage.setItem(KEY, JSON.stringify(items)); window.dispatchEvent(new Event("uda-submissions")); }
export function saveSubmission(quiz: Quiz, responses: Record<number, SubmissionResponse>, results: RoundResult[]) {
  const item: Submission = { id: crypto.randomUUID(), quizTitle: quiz.title, submittedAt: Date.now(), quiz, responses, results, grades: {}, status: results.some((result)=>result.pendingReview) ? "pending_review" : "graded" };
  write([item, ...listSubmissions()].slice(0,100)); return item;
}
export function updateSubmission(id: string, patch: Partial<Submission>) { write(listSubmissions().map((item)=>item.id === id ? { ...item, ...patch } : item)); }
export function pendingSubmissionCount() { return listSubmissions().filter((item)=>item.status === "pending_review").length; }
