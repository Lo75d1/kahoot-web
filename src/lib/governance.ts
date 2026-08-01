import { supabase } from "./supabase";

export type UdaRole =
  | "student"
  | "lecturer"
  | "department_head"
  | "assessment_officer"
  | "proctor"
  | "training_officer"
  | "quality_officer"
  | "admin";

export interface UdaProfile {
  id: string;
  full_name: string;
  university_id: string | null;
  role: UdaRole;
  department_id: string | null;
  active: boolean;
}

export type QuizWorkflowStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "sealed"
  | "retired";

export interface GovernedQuiz {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  workflow_status: QuizWorkflowStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  sealed_at: string | null;
  sealed_by: string | null;
  version_no: number;
}

export interface ExamSession {
  id: string;
  quiz_id: string;
  code: string;
  title: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: "draft" | "scheduled" | "open" | "paused" | "closed" | "cancelled";
  settings: Record<string, unknown>;
}

export interface GovernanceSnapshot {
  profile: UdaProfile;
  quizzes: GovernedQuiz[];
  sessions: ExamSession[];
  pendingAppeals: number;
  activeAttempts: number;
  recentAuditCount: number;
}

export interface ExamPayloadQuestion {
  type: string;
  text: string;
  timeLimit?: number;
  points?: number;
  answers: Array<{ text: string }>;
}

export interface ExamPayload {
  attemptId: string;
  sessionId: string;
  title: string;
  durationMinutes: number;
  serverNow: string;
  deadline: string;
  questions: ExamPayloadQuestion[];
  savedResponses: Record<string, number>;
}

function client() {
  if (!supabase) throw new Error("Chưa cấu hình Supabase.");
  return supabase;
}

export const ROLE_LABELS: Record<UdaRole, string> = {
  student: "Sinh viên",
  lecturer: "Giảng viên",
  department_head: "Trưởng bộ môn",
  assessment_officer: "Cán bộ khảo thí",
  proctor: "Giám thị",
  training_officer: "Phòng đào tạo",
  quality_officer: "Đảm bảo chất lượng",
  admin: "Quản trị hệ thống",
};

export const WORKFLOW_LABELS: Record<QuizWorkflowStatus, string> = {
  draft: "Bản nháp",
  in_review: "Chờ phản biện",
  changes_requested: "Yêu cầu chỉnh sửa",
  approved: "Đã phê duyệt",
  sealed: "Đã niêm phong",
  retired: "Ngừng sử dụng",
};

export async function loadGovernanceSnapshot(): Promise<GovernanceSnapshot> {
  const { data: auth } = await client().auth.getUser();
  if (!auth.user) throw new Error("Bạn cần đăng nhập.");
  const [profileResult, quizResult, sessionResult, appealResult, attemptResult, auditResult] =
    await Promise.all([
      client().from("profiles").select("*").eq("id", auth.user.id).single(),
      client()
        .from("quizzes")
        .select("id,title,description,owner_id,workflow_status,submitted_at,approved_at,approved_by,sealed_at,sealed_by,version_no")
        .order("updated_at", { ascending: false }),
      client().from("exam_sessions").select("*").order("starts_at", { ascending: false }).limit(30),
      client().from("appeals").select("id", { count: "exact", head: true }).in("status", ["submitted", "reviewing"]),
      client().from("exam_attempts").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
      client().from("audit_logs").select("id", { count: "exact", head: true }),
    ]);
  if (profileResult.error) throw profileResult.error;
  if (quizResult.error) throw quizResult.error;
  if (sessionResult.error) throw sessionResult.error;
  return {
    profile: profileResult.data as UdaProfile,
    quizzes: (quizResult.data ?? []) as GovernedQuiz[],
    sessions: (sessionResult.data ?? []) as ExamSession[],
    pendingAppeals: appealResult.count ?? 0,
    activeAttempts: attemptResult.count ?? 0,
    recentAuditCount: auditResult.count ?? 0,
  };
}

export async function submitQuizForReview(quizId: string) {
  const { error } = await client().rpc("submit_quiz_for_review", {
    requested_quiz_id: quizId,
  });
  if (error) throw error;
}

export async function reviewQuiz(
  quizId: string,
  decision: "approved" | "changes_requested",
  comment: string,
) {
  const { error } = await client().rpc("review_quiz", {
    requested_quiz_id: quizId,
    requested_decision: decision,
    requested_comment: comment,
  });
  if (error) throw error;
}

export async function sealQuiz(quizId: string) {
  const { error } = await client().rpc("seal_quiz", {
    requested_quiz_id: quizId,
  });
  if (error) throw error;
}

export async function createExamSession(input: {
  quizId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
}) {
  const { data: auth } = await client().auth.getUser();
  if (!auth.user) throw new Error("Bạn cần đăng nhập.");
  const code = `UDA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { error } = await client().from("exam_sessions").insert({
    quiz_id: input.quizId,
    code,
    title: input.title.trim(),
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    duration_minutes: input.durationMinutes,
    created_by: auth.user.id,
    status: "scheduled",
  });
  if (error) throw error;
}

export async function startOfficialExam(sessionId: string): Promise<ExamPayload> {
  const { data: attemptId, error: startError } = await client().rpc("start_exam_attempt", {
    requested_session_id: sessionId,
  });
  if (startError) throw startError;
  const { data, error } = await client().rpc("get_exam_payload", {
    requested_attempt_id: attemptId,
  });
  if (error) throw error;
  return data as ExamPayload;
}

export async function saveOfficialExam(
  attemptId: string,
  responses: Record<string, number>,
  event: "autosaved" | "tab_hidden" | "fullscreen_exit" | "reconnected" = "autosaved",
) {
  const { data, error } = await client().rpc("save_exam_responses", {
    requested_attempt_id: attemptId,
    requested_responses: responses,
    requested_event: event,
  });
  if (error) throw error;
  return data as string;
}

export async function submitOfficialExam(attemptId: string) {
  const { data, error } = await client().rpc("submit_exam_attempt", {
    requested_attempt_id: attemptId,
  });
  if (error) throw error;
  return data as { receipt: string; submittedAt: string; status: string };
}

export async function setExamSessionStatus(
  sessionId: string,
  status: "scheduled" | "open" | "paused" | "closed" | "cancelled",
) {
  const { error } = await client().rpc("set_exam_session_status", {
    requested_session_id: sessionId,
    requested_status: status,
  });
  if (error) throw error;
}

export async function publishExamResults(sessionId: string) {
  const { data, error } = await client().rpc("publish_exam_results", {
    requested_session_id: sessionId,
  });
  if (error) throw error;
  return data as number;
}
