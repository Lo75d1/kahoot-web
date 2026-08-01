"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, Gavel, ShieldAlert, X } from "lucide-react";
import {
  decideGradeChange, recordProctorNote, resolveExamAppeal, setExamEligibility,
  submitExamAppeal, submitGradeChange, type GovernanceSnapshot,
} from "@/lib/governance";

const CARD = "rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(0,90,42,0.1)] sm:p-6";

export default function AssessmentOperations({ data, refresh, run }: {
  data: GovernanceSnapshot; refresh: () => Promise<void>;
  run: (key: string, action: () => Promise<void>) => Promise<void>;
}) {
  const [sessionId, setSessionId] = useState(data.sessions[0]?.id ?? "");
  const [studentId, setStudentId] = useState(data.profiles.find((p) => p.role === "student")?.id ?? "");
  const [attendance, setAttendance] = useState(100);
  const [eligible, setEligible] = useState(true);
  const [reason, setReason] = useState("");
  const [attemptId, setAttemptId] = useState(data.attempts[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("warning");
  const [score, setScore] = useState(0);
  const [appealReason, setAppealReason] = useState("");
  const students = useMemo(() => data.profiles.filter((p) => p.role === "student"), [data.profiles]);
  const role = data.profile.role;
  const canEligibility = ["assessment_officer", "training_officer", "admin"].includes(role);
  const canProctor = ["proctor", "assessment_officer", "admin"].includes(role);
  const canChange = ["lecturer", "department_head", "assessment_officer", "quality_officer", "admin"].includes(role);
  const canDecide = ["assessment_officer", "quality_officer", "admin"].includes(role);

  return <section className="mt-5 grid gap-5 xl:grid-cols-2" aria-label="Vận hành kỳ thi">
    {canEligibility && <div className={CARD}>
      <div className="flex items-center gap-3"><ClipboardCheck className="text-[#018f41]"/><div><p className="text-xs font-extrabold uppercase tracking-widest text-[#018f41]">Tiền kiểm</p><h2 className="text-xl font-black text-[#01823c]">Danh sách đủ điều kiện dự thi</h2></div></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-bold">Ca thi<select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal"><option value="">Chọn ca thi</option>{data.sessions.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <label className="text-sm font-bold">Sinh viên<select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal"><option value="">Chọn sinh viên</option>{students.map((s) => <option key={s.id} value={s.id}>{s.full_name} {s.university_id ? `· ${s.university_id}` : ""}</option>)}</select></label>
        <label className="text-sm font-bold">Chuyên cần (%)<input type="number" min="0" max="100" value={attendance} onChange={(e) => setAttendance(Number(e.target.value))} className="mt-1 min-h-11 w-full rounded-xl border px-3 font-normal"/></label>
        <label className="flex items-end gap-2 pb-3 text-sm font-bold"><input type="checkbox" checked={eligible} onChange={(e) => setEligible(e.target.checked)} className="h-5 w-5 accent-[#018f41]"/>Đủ điều kiện dự thi</label>
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ghi chú hoặc lý do không đủ điều kiện" className="mt-3 min-h-11 w-full rounded-xl border px-3 text-sm"/>
      <button disabled={!sessionId || !studentId} onClick={() => run("eligibility", async () => { await setExamEligibility({ sessionId, studentId, eligible, reason, attendancePercent: attendance }); await refresh(); })} className="mt-3 rounded-xl bg-[#018f41] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40">Lưu quyết định</button>
    </div>}

    {canProctor && <div className={CARD}>
      <div className="flex items-center gap-3"><ShieldAlert className="text-[#f58220]"/><div><p className="text-xs font-extrabold uppercase tracking-widest text-[#f58220]">Giám sát</p><h2 className="text-xl font-black text-[#01823c]">Biên bản ca thi</h2></div></div>
      <select value={attemptId} onChange={(e) => setAttemptId(e.target.value)} className="mt-4 min-h-11 w-full rounded-xl border px-3 text-sm"><option value="">Chọn lượt thi</option>{data.attempts.map((a) => <option key={a.id} value={a.id}>{a.id.slice(0,8)} · {a.status}</option>)}</select>
      <div className="mt-3 flex gap-2"><select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className="rounded-xl border px-3 text-sm"><option value="info">Thông tin</option><option value="warning">Cảnh báo</option><option value="critical">Nghiêm trọng</option></select><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nội dung sự việc quan sát được" className="min-h-11 flex-1 rounded-xl border px-3 text-sm"/></div>
      <button disabled={!attemptId || note.trim().length < 5} onClick={() => run("proctor", async () => { await recordProctorNote(attemptId,note,severity); setNote(""); await refresh(); })} className="mt-3 rounded-xl bg-[#f58220] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40">Lập biên bản có dấu thời gian</button>
      <div className="mt-4 max-h-44 space-y-2 overflow-auto">{data.events.filter((e) => e.event_type !== "autosaved").slice(0,10).map((e) => <div key={e.id} className="rounded-xl bg-slate-50 p-3 text-xs"><b>{e.event_type}</b> · {new Date(e.created_at).toLocaleString("vi-VN")} {typeof e.detail.note === "string" && <p className="mt-1 text-slate-600">{e.detail.note}</p>}</div>)}</div>
    </div>}

    {role === "student" && <div className={CARD}>
      <div className="flex items-center gap-3"><Gavel className="text-[#018f41]"/><h2 className="text-xl font-black text-[#01823c]">Gửi yêu cầu phúc khảo</h2></div>
      <select value={attemptId} onChange={(e) => setAttemptId(e.target.value)} className="mt-4 min-h-11 w-full rounded-xl border px-3"><option value="">Chọn bài đã công bố</option>{data.attempts.filter((a) => a.status === "published").map((a) => <option key={a.id} value={a.id}>{a.id.slice(0,8)} · {a.score_ten}/10 ({a.grade_letter})</option>)}</select>
      <textarea value={appealReason} onChange={(e) => setAppealReason(e.target.value)} placeholder="Trình bày rõ nội dung cần kiểm tra lại…" className="mt-3 min-h-24 w-full rounded-xl border p-3 text-sm"/>
      <button disabled={!attemptId || appealReason.trim().length < 10} onClick={() => run("appeal", async () => { await submitExamAppeal(attemptId,appealReason); setAppealReason(""); await refresh(); })} className="mt-3 rounded-xl bg-[#018f41] px-4 py-3 font-bold text-white disabled:opacity-40">Gửi phúc khảo</button>
    </div>}

    {canChange && <div className={CARD}>
      <div className="flex items-center gap-3"><AlertTriangle className="text-[#f58220]"/><h2 className="text-xl font-black text-[#01823c]">Đề nghị điều chỉnh điểm</h2></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_110px]"><select value={attemptId} onChange={(e) => setAttemptId(e.target.value)} className="min-h-11 rounded-xl border px-3"><option value="">Chọn bài thi</option>{data.attempts.filter((a) => ["graded","published"].includes(a.status)).map((a) => <option key={a.id} value={a.id}>{a.id.slice(0,8)} · hiện tại {a.score_ten ?? "—"}</option>)}</select><input type="number" min="0" max="10" step="0.1" value={score} onChange={(e) => setScore(Number(e.target.value))} className="min-h-11 rounded-xl border px-3"/></div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Lý do điều chỉnh (tối thiểu 10 ký tự)" className="mt-3 min-h-11 w-full rounded-xl border px-3 text-sm"/>
      <button disabled={!attemptId || reason.trim().length < 10} onClick={() => run("grade-change", async () => { await submitGradeChange(attemptId,score,reason); await refresh(); })} className="mt-3 rounded-xl bg-[#f58220] px-4 py-3 font-bold text-white disabled:opacity-40">Gửi người duyệt độc lập</button>
    </div>}

    {canDecide && <div className={`${CARD} xl:col-span-2`}>
      <h2 className="text-xl font-black text-[#01823c]">Hàng đợi phê duyệt độc lập & phúc khảo</h2>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">{data.gradeChanges.filter((c) => c.status === "pending").map((c) => <div key={c.id} className="rounded-2xl border p-4 text-sm"><b>Điểm {c.old_score ?? "—"} → {c.requested_score}</b><p className="my-2 text-slate-600">{c.reason}</p><div className="flex gap-2"><button onClick={() => run(`approve-change-${c.id}`, async () => { await decideGradeChange(c.id,true); await refresh(); })} className="inline-flex items-center gap-1 rounded-lg bg-[#018f41] px-3 py-2 font-bold text-white"><Check size={15}/>Duyệt</button><button onClick={() => run(`reject-change-${c.id}`, async () => { await decideGradeChange(c.id,false); await refresh(); })} className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-2 font-bold text-white"><X size={15}/>Từ chối</button></div></div>)}</div>
        <div className="space-y-2">{data.appeals.map((a) => <AppealRow key={a.id} appeal={a} run={run} refresh={refresh}/>)}</div>
      </div>
    </div>}
  </section>;
}

function AppealRow({ appeal, run, refresh }: { appeal: GovernanceSnapshot["appeals"][number]; run: (key: string, action: () => Promise<void>) => Promise<void>; refresh: () => Promise<void> }) {
  const [resolution,setResolution] = useState("");
  return <div className="rounded-2xl border p-4 text-sm"><b>Phúc khảo · {appeal.status}</b><p className="my-2 text-slate-600">{appeal.reason}</p><textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Kết luận xử lý…" className="min-h-20 w-full rounded-xl border p-2"/><div className="mt-2 flex gap-2"><button onClick={() => run(`resolve-${appeal.id}`, async () => { await resolveExamAppeal(appeal.id,"resolved",resolution); await refresh(); })} disabled={resolution.trim().length < 10} className="rounded-lg bg-[#018f41] px-3 py-2 font-bold text-white disabled:opacity-40">Chấp nhận</button><button onClick={() => run(`reject-${appeal.id}`, async () => { await resolveExamAppeal(appeal.id,"rejected",resolution); await refresh(); })} disabled={resolution.trim().length < 10} className="rounded-lg bg-rose-600 px-3 py-2 font-bold text-white disabled:opacity-40">Bác yêu cầu</button></div></div>;
}
