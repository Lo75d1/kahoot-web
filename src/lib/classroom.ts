import { supabase } from "./supabase";
import type { Quiz, RoundResult } from "./types";

export interface Classroom {
  id: string;
  owner_id: string;
  name: string;
  join_code: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  quiz_id: string;
  title: string;
  mode: "learn" | "practice" | "exam";
  due_at: string | null;
}

export interface AssignmentResult {
  assignment_id: string;
  user_id: string;
  correct_count: number;
  total_count: number;
  score: number;
  completed_at: string | null;
}

function client() {
  if (!supabase) throw new Error("Chưa cấu hình Supabase.");
  return supabase;
}

function joinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}

export async function listClasses(): Promise<Classroom[]> {
  const { data, error } = await client()
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Classroom[];
}

export async function createClass(name: string): Promise<Classroom> {
  const { data: auth } = await client().auth.getUser();
  if (!auth.user) throw new Error("Bạn cần đăng nhập.");
  const { data, error } = await client()
    .from("classes")
    .insert({ owner_id: auth.user.id, name: name.trim(), join_code: joinCode() })
    .select()
    .single();
  if (error) throw error;
  return data as Classroom;
}

export async function joinClass(code: string, displayName: string) {
  const { data, error } = await client().rpc("join_class", {
    requested_code: code.trim(),
    requested_name: displayName.trim(),
  });
  if (error) throw error;
  return data as string;
}

export async function listAssignments(classId: string): Promise<Assignment[]> {
  const { data, error } = await client()
    .from("assignments")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Assignment[];
}

export async function listAssignmentResults(
  assignmentIds: string[],
): Promise<AssignmentResult[]> {
  if (assignmentIds.length === 0) return [];
  const { data, error } = await client()
    .from("attempts")
    .select(
      "assignment_id,user_id,correct_count,total_count,score,completed_at",
    )
    .in("assignment_id", assignmentIds)
    .not("completed_at", "is", null);
  if (error) throw error;
  return (data ?? []) as AssignmentResult[];
}

export async function createAssignment(input: {
  classId: string;
  quizId: string;
  title: string;
  mode: Assignment["mode"];
  dueAt?: string;
}): Promise<void> {
  const { error } = await client().from("assignments").insert({
    class_id: input.classId,
    quiz_id: input.quizId,
    title: input.title.trim(),
    mode: input.mode,
    due_at: input.dueAt || null,
  });
  if (error) throw error;
}

export async function saveAssignmentAttempt(input: {
  assignment: Assignment;
  quiz: Quiz;
  results: RoundResult[];
  score: number;
}): Promise<void> {
  const { data: auth } = await client().auth.getUser();
  if (!auth.user) return;
  const { data: attempt, error } = await client()
    .from("attempts")
    .insert({
      assignment_id: input.assignment.id,
      quiz_id: input.assignment.quiz_id,
      user_id: auth.user.id,
      mode: input.assignment.mode,
      score: input.score,
      correct_count: input.results.filter((result) => result.correct).length,
      total_count: input.quiz.questions.length,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  const answers = input.results.map((result, questionIndex) => ({
    attempt_id: attempt.id,
    question_index: questionIndex,
    response: {},
    is_correct: result.correct,
    points: result.earned,
    response_ms: result.responseMs,
  }));
  const { error: answerError } = await client()
    .from("attempt_answers")
    .insert(answers);
  if (answerError) throw answerError;
}
