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
  profiles: UdaProfile[];
  attempts: ExamAttempt[];
  events: ExamEvent[];
  appeals: ExamAppeal[];
  gradeChanges: GradeChange[];
}

export interface ExamAttempt {
  id: string; session_id: string; student_id: string; status: string;
  score_ten: number | null; grade_letter: string | null; started_at: string;
  integrity_flags: unknown[];
}

export interface ExamEvent {
  id: number; attempt_id: string; event_type: string; detail: Record<string, unknown>; created_at: string;
}

export interface ExamAppeal {
  id: string; attempt_id: string; student_id: string; reason: string; status: string;
  resolution: string; created_at: string;
}

export interface GradeChange {
  id: string; attempt_id: string; old_score: number | null; requested_score: number;
  reason: string; requested_by: string; status: string; created_at: string;
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
  const [profileResult, quizResult, sessionResult, appealResult, attemptResult, auditResult, profilesResult, eventsResult, changesResult] =
    await Promise.all([
      client().from("profiles").select("*").eq("id", auth.user.id).single(),
      client()
        .from("quizzes")
        .select("id,title,description,owner_id,workflow_status,submitted_at,approved_at,approved_by,sealed_at,sealed_by,version_no")
        .order("updated_at", { ascending: false }),
      client().from("exam_sessions").select("*").order("starts_at", { ascending: false }).limit(30),
      client().from("appeals").select("id,attempt_id,student_id,reason,status,resolution,created_at", { count: "exact" }).in("status", ["submitted", "reviewing"]).order("created_at", { ascending: false }).limit(50),
      client().from("exam_attempts").select("id,session_id,student_id,status,score_ten,grade_letter,started_at,integrity_flags", { count: "exact" }).order("started_at", { ascending: false }).limit(100),
      client().from("audit_logs").select("id", { count: "exact", head: true }),
      client().from("profiles").select("id,full_name,university_id,role,department_id,active").eq("active", true).order("full_name"),
      client().from("exam_events").select("id,attempt_id,event_type,detail,created_at").order("created_at", { ascending: false }).limit(100),
      client().from("grade_changes").select("id,attempt_id,old_score,requested_score,reason,requested_by,status,created_at").order("created_at", { ascending: false }).limit(50),
    ]);
  if (profileResult.error) throw profileResult.error;
  if (quizResult.error) throw quizResult.error;
  if (sessionResult.error) throw sessionResult.error;
  return {
    profile: profileResult.data as UdaProfile,
    quizzes: (quizResult.data ?? []) as GovernedQuiz[],
    sessions: (sessionResult.data ?? []) as ExamSession[],
    pendingAppeals: appealResult.count ?? 0,
    activeAttempts: (attemptResult.data ?? []).filter((attempt) => attempt.status === "in_progress").length,
    recentAuditCount: auditResult.count ?? 0,
    profiles: (profilesResult.data ?? []) as UdaProfile[],
    attempts: (attemptResult.data ?? []) as ExamAttempt[],
    events: (eventsResult.data ?? []) as ExamEvent[],
    appeals: (appealResult.data ?? []) as ExamAppeal[],
    gradeChanges: (changesResult.data ?? []) as GradeChange[],
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

export async function setExamEligibility(input: { sessionId: string; studentId: string; eligible: boolean; reason?: string; attendancePercent?: number; componentZero?: boolean }) {
  const { error } = await client().rpc("set_exam_eligibility", {
    requested_session_id: input.sessionId, requested_student_id: input.studentId,
    requested_eligible: input.eligible, requested_reason: input.reason ?? "",
    requested_attendance_percent: input.attendancePercent ?? null,
    requested_component_zero: input.componentZero ?? false,
  });
  if (error) throw error;
}

export async function recordProctorNote(attemptId: string, note: string, severity: "info" | "warning" | "critical") {
  const { error } = await client().rpc("record_proctor_note", { requested_attempt_id: attemptId, requested_note: note, requested_severity: severity });
  if (error) throw error;
}

export async function submitGradeChange(attemptId: string, score: number, reason: string) {
  const { error } = await client().rpc("submit_grade_change", { requested_attempt_id: attemptId, requested_score: score, requested_reason: reason });
  if (error) throw error;
}

export async function decideGradeChange(changeId: string, approve: boolean) {
  const { error } = await client().rpc("decide_grade_change", { requested_change_id: changeId, requested_approve: approve });
  if (error) throw error;
}

export async function submitExamAppeal(attemptId: string, reason: string) {
  const { error } = await client().rpc("submit_exam_appeal", { requested_attempt_id: attemptId, requested_reason: reason });
  if (error) throw error;
}

export async function resolveExamAppeal(appealId: string, status: "reviewing" | "resolved" | "rejected", resolution: string) {
  const { error } = await client().rpc("resolve_exam_appeal", { requested_appeal_id: appealId, requested_status: status, requested_resolution: resolution });
  if (error) throw error;
}
