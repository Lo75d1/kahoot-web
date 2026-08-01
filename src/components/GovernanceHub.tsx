"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BookCheck,
  CalendarClock,
  CheckCircle2,
  FileLock2,
  Gavel,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import {
  ROLE_LABELS,
  WORKFLOW_LABELS,
  createExamSession,
  loadGovernanceSnapshot,
  reviewQuiz,
  sealQuiz,
  setExamSessionStatus,
  submitQuizForReview,
  publishExamResults,
  type GovernedQuiz,
  type GovernanceSnapshot,
} from "@/lib/governance";
import OfficialExam from "./OfficialExam";

const PANEL = "rounded-3xl border border-slate-200 bg-white shadow-[0_14px_45px_rgba(0,90,42,0.12)]";

function viError(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return error instanceof Error ? error.message : String(error);
}

function StatusBadge({ status }: { status: GovernedQuiz["workflow_status"] }) {
  const tone = {
    draft: "bg-slate-100 text-slate-700",
    in_review: "bg-amber-100 text-amber-800",
    changes_requested: "bg-rose-100 text-rose-800",
    approved: "bg-sky-100 text-sky-800",
    sealed: "bg-emerald-100 text-emerald-800",
    retired: "bg-slate-200 text-slate-500",
  }[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{WORKFLOW_LABELS[status]}</span>;
}

export default function GovernanceHub({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<GovernanceSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [showSession, setShowSession] = useState<GovernedQuiz | null>(null);
  const [activeExam, setActiveExam] = useState<GovernanceSnapshot["sessions"][number] | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setData(await loadGovernanceSnapshot());
    } catch (cause) {
      setError(viError(cause));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const canReview = data && ["department_head", "assessment_officer", "quality_officer", "admin"].includes(data.profile.role);
  const canSeal = data && ["assessment_officer", "admin"].includes(data.profile.role);
  const canSchedule = data && ["assessment_officer", "training_officer", "admin"].includes(data.profile.role);
  const ownQuizzes = useMemo(
    () => data?.quizzes.filter((quiz) => quiz.owner_id === data.profile.id) ?? [],
    [data],
  );
  const reviewQueue = useMemo(
    () => data?.quizzes.filter((quiz) => quiz.workflow_status === "in_review" && quiz.owner_id !== data.profile.id) ?? [],
    [data],
  );

  const action = async (key: string, run: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await run();
      await refresh();
    } catch (cause) {
      setError(viError(cause));
    } finally {
      setBusy(null);
    }
  };

  if (activeExam) {
    return <OfficialExam session={activeExam} onExit={() => { setActiveExam(null); refresh(); }} />;
  }

  if (!data && !error) {
    return <div className="flex flex-1 items-center justify-center text-white"><Loader2 className="mr-2 animate-spin" />Đang tải trung tâm khảo thí…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 p-4 text-slate-900 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-white">
        <div>
          <button onClick={onBack} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold hover:bg-white/25"><ArrowLeft size={18} />Ngân hàng đề</button>
          <h1 className="text-3xl font-black">Trung tâm điều hành khảo thí</h1>
          <p className="mt-1 text-white/75">Kiểm soát đề thi, ca thi, tính toàn vẹn và phúc khảo theo vai trò.</p>
        </div>
        {data && <div className="rounded-2xl border border-white/25 bg-white/15 px-4 py-3 text-right"><p className="text-xs text-white/65">Vai trò hiện tại</p><p className="font-extrabold">{ROLE_LABELS[data.profile.role]}</p></div>}
      </div>

      {error && <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">⚠ {error}</div>}

      {data && (
        <>
          {data.profile.role === "student" && (
            <section className={`${PANEL} mb-5 p-5 sm:p-6`}>
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#018f41]">Cổng dự thi sinh viên</p>
              <h2 className="mt-1 text-xl font-black text-[#01823c]">Ca thi được phép tham gia</h2>
              <p className="mt-1 text-sm text-slate-500">Hệ thống sẽ kiểm tra danh sách đủ điều kiện trước khi mở đề.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {data.sessions.filter((session) => session.status === "open").length === 0 && <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Hiện chưa có ca thi đang mở.</p>}
                {data.sessions.filter((session) => session.status === "open").map((session) => (
                  <article key={session.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start justify-between gap-2"><div><h3 className="font-extrabold text-[#01823c]">{session.title}</h3><p className="mt-1 text-xs text-slate-500">{session.code} · {session.duration_minutes} phút</p></div><span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">Đang mở</span></div>
                    <button onClick={() => setActiveExam(session)} className="mt-4 w-full rounded-xl bg-[#018f41] px-4 py-3 font-extrabold text-white">Xác minh và vào thi</button>
                  </article>
                ))}
              </div>
            </section>
          )}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tổng quan khảo thí">
            {[
              { label: "Đề chờ phản biện", value: data.quizzes.filter((q) => q.workflow_status === "in_review").length, Icon: BookCheck },
              { label: "Ca thi đang mở", value: data.sessions.filter((s) => s.status === "open").length, Icon: CalendarClock },
              { label: "Bài đang thực hiện", value: data.activeAttempts, Icon: Activity },
              { label: "Phúc khảo chờ xử lý", value: data.pendingAppeals, Icon: Gavel },
            ].map(({ label, value, Icon }) => (
              <div key={label} className={`${PANEL} p-5`}><Icon className="mb-4 text-[#018f41]" /><p className="text-3xl font-black text-[#01823c]">{value}</p><p className="mt-1 text-sm font-semibold text-slate-500">{label}</p></div>
            ))}
          </section>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <section className={`${PANEL} p-5 sm:p-6`}>
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-widest text-[#018f41]">Maker–checker</p><h2 className="mt-1 text-xl font-black text-[#01823c]">Quy trình kiểm duyệt đề</h2></div><button onClick={refresh} aria-label="Làm mới" className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50"><RefreshCw size={18} /></button></div>
              <div className="mt-5 space-y-3">
                {(canReview ? reviewQueue : ownQuizzes).length === 0 && <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">Không có đề phù hợp trong hàng đợi.</p>}
                {(canReview ? reviewQueue : ownQuizzes).map((quiz) => (
                  <article key={quiz.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-extrabold text-slate-900">{quiz.title}</h3><p className="mt-1 text-xs text-slate-500">Phiên bản {quiz.version_no}</p></div><StatusBadge status={quiz.workflow_status} /></div>
                    {!canReview && ["draft", "changes_requested"].includes(quiz.workflow_status) && <button disabled={busy !== null} onClick={() => action(`submit-${quiz.id}`, () => submitQuizForReview(quiz.id))} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#018f41] px-4 text-sm font-bold text-white hover:bg-[#01823c] disabled:opacity-50"><Send size={16} />Gửi trưởng bộ môn phản biện</button>}
                    {canReview && quiz.workflow_status === "in_review" && (
                      <div className="mt-4">
                        <textarea value={reviewComment[quiz.id] ?? ""} onChange={(event) => setReviewComment((current) => ({ ...current, [quiz.id]: event.target.value }))} placeholder="Nhận xét chuyên môn, chuẩn đầu ra, đáp án…" className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#018f41]" />
                        <div className="mt-2 flex flex-wrap gap-2"><button onClick={() => action(`approve-${quiz.id}`, () => reviewQuiz(quiz.id, "approved", reviewComment[quiz.id] ?? ""))} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#018f41] px-4 text-sm font-bold text-white"><CheckCircle2 size={16} />Phê duyệt</button><button onClick={() => action(`changes-${quiz.id}`, () => reviewQuiz(quiz.id, "changes_requested", reviewComment[quiz.id] ?? ""))} className="min-h-10 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-700">Yêu cầu sửa</button></div>
                      </div>
                    )}
                    {canSeal && quiz.workflow_status === "approved" && <button onClick={() => action(`seal-${quiz.id}`, () => sealQuiz(quiz.id))} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#01823c] px-4 text-sm font-bold text-white"><FileLock2 size={16} />Niêm phong độc lập</button>}
                    {canSchedule && quiz.workflow_status === "sealed" && <button onClick={() => setShowSession(quiz)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#f58220] px-4 text-sm font-bold text-white"><CalendarClock size={16} />Lập ca thi</button>}
                  </article>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              <section className={`${PANEL} p-5 sm:p-6`}><div className="flex items-center gap-3"><ShieldCheck className="text-[#018f41]" /><div><h2 className="font-black text-[#01823c]">Kiểm soát bắt buộc</h2><p className="text-xs text-slate-500">Áp dụng tại tầng cơ sở dữ liệu</p></div></div><ul className="mt-4 space-y-3 text-sm text-slate-600">{["Người ra đề không được tự phê duyệt.","Đề đã niêm phong không thể sửa hoặc xóa.","Chỉ khảo thí/đào tạo được lập ca thi.","Sinh viên phải có tên trong danh sách đủ điều kiện.","Mọi thay đổi và sự kiện thi đều có nhật ký."].map((item) => <li key={item} className="flex gap-2"><UserCheck size={17} className="mt-0.5 shrink-0 text-[#018f41]" />{item}</li>)}</ul></section>
              <section className={`${PANEL} p-5 sm:p-6`}><h2 className="font-black text-[#01823c]">Ca thi gần đây</h2><div className="mt-4 space-y-2">{data.sessions.length === 0 ? <p className="text-sm text-slate-500">Chưa có ca thi.</p> : data.sessions.slice(0, 6).map((session) => <div key={session.id} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between gap-2"><p className="font-bold">{session.title}</p><span className="text-xs font-bold uppercase text-[#018f41]">{session.status}</span></div><p className="mt-1 text-xs text-slate-500">{session.code} · {session.duration_minutes} phút</p>{canSchedule && <div className="mt-2 flex flex-wrap gap-1.5">{session.status === "scheduled" && <button onClick={() => action(`open-${session.id}`, () => setExamSessionStatus(session.id,"open"))} className="rounded-lg bg-[#018f41] px-2.5 py-1 text-xs font-bold text-white">Mở ca</button>}{session.status === "open" && <button onClick={() => action(`close-${session.id}`, () => setExamSessionStatus(session.id,"closed"))} className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white">Đóng ca</button>}{session.status === "closed" && <button onClick={() => action(`publish-${session.id}`, async () => { await publishExamResults(session.id); })} className="rounded-lg bg-[#f58220] px-2.5 py-1 text-xs font-bold text-white">Công bố điểm</button>}</div>}</div>)}</div></section>
            </div>
          </div>
        </>
      )}

      {showSession && <SessionDialog quiz={showSession} onClose={() => setShowSession(null)} onCreated={() => { setShowSession(null); refresh(); }} />}
    </div>
  );
}

function SessionDialog({ quiz, onClose, onCreated }: { quiz: GovernedQuiz; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState(`Thi chính thức · ${quiz.title}`);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!startsAt || !endsAt) {
      setError("Chọn thời gian bắt đầu và kết thúc ca thi.");
      return;
    }
    setBusy(true); setError(null);
    try { await createExamSession({ quizId: quiz.id, title, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), durationMinutes: duration }); onCreated(); }
    catch (cause) { setError(viError(cause)); setBusy(false); }
  };
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-[#006e33]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="session-title"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><h2 id="session-title" className="text-xl font-black text-[#01823c]">Lập ca thi từ đề đã niêm phong</h2><p className="mt-1 text-sm text-slate-500">{quiz.title}</p><div className="mt-5 space-y-3"><label className="block text-sm font-bold">Tên ca thi<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">Bắt đầu<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label><label className="block text-sm font-bold">Kết thúc<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label></div><label className="block text-sm font-bold">Thời lượng (phút)<input type="number" min={1} max={480} value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal" /></label></div>{error && <p className="mt-3 text-sm font-semibold text-rose-700">⚠ {error}</p>}<div className="mt-5 flex gap-2"><button disabled={busy} onClick={submit} className="flex-1 rounded-xl bg-[#018f41] px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "Đang tạo…" : "Tạo ca thi"}</button><button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-600">Hủy</button></div></div></div>;
}
