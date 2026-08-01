"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Save, Send } from "lucide-react";
import {
  saveOfficialExam,
  startOfficialExam,
  submitOfficialExam,
  type ExamPayload,
  type ExamSession,
} from "@/lib/governance";

export default function OfficialExam({ session, onExit }: { session: ExamSession; onExit: () => void }) {
  const [payload, setPayload] = useState<ExamPayload | null>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const responsesRef = useRef(responses);
  const submittedRef = useRef(false);

  useEffect(() => { responsesRef.current = responses; }, [responses]);

  useEffect(() => {
    let active = true;
    startOfficialExam(session.id)
      .then((data) => { if (active) { setPayload(data); setResponses(data.savedResponses ?? {}); setSecondsLeft(Math.max(0, Math.floor((Date.parse(data.deadline) - Date.parse(data.serverNow)) / 1000))); } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { active = false; };
  }, [session.id]);

  const save = useCallback(async (event: "autosaved" | "tab_hidden" | "fullscreen_exit" | "reconnected" = "autosaved") => {
    if (!payload || submittedRef.current) return;
    setSaveState("saving");
    try { await saveOfficialExam(payload.attemptId, responsesRef.current, event); setSaveState("saved"); }
    catch { setSaveState("error"); }
  }, [payload]);

  useEffect(() => {
    if (!payload) return;
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.floor((Date.parse(payload.deadline) - Date.now()) / 1000));
      setSecondsLeft(next);
      if (next === 0 && !submittedRef.current) {
        submittedRef.current = true;
        submitOfficialExam(payload.attemptId).then((result) => setReceipt(result.receipt)).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [payload]);

  useEffect(() => {
    if (!payload) return;
    const timer = window.setTimeout(() => save(), 900);
    return () => window.clearTimeout(timer);
  }, [responses, payload, save]);

  useEffect(() => {
    const visibility = () => { if (document.hidden) save("tab_hidden"); };
    const online = () => save("reconnected");
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("online", online);
    return () => { document.removeEventListener("visibilitychange", visibility); window.removeEventListener("online", online); };
  }, [save]);

  const answered = useMemo(() => Object.keys(responses).length, [responses]);
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2,"0")}:${(seconds % 60).toString().padStart(2,"0")}`;

  const submit = async () => {
    if (!payload || submitting || submittedRef.current) return;
    if (!window.confirm(`Nộp bài với ${answered}/${payload.questions.length} câu đã trả lời? Sau khi nộp không thể sửa.`)) return;
    setSubmitting(true); setError(null);
    try { await save(); submittedRef.current = true; const result = await submitOfficialExam(payload.attemptId); setReceipt(result.receipt); }
    catch (cause) { submittedRef.current = false; setError(cause instanceof Error ? cause.message : String(cause)); setSubmitting(false); }
  };

  if (receipt) return <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center p-6 text-center"><div className="w-full rounded-3xl bg-white p-8 shadow-2xl"><CheckCircle2 size={54} className="mx-auto text-[#018f41]" /><h1 className="mt-4 text-2xl font-black text-[#01823c]">Đã nộp bài an toàn</h1><p className="mt-2 text-slate-600">Điểm được lưu ở trạng thái chờ bộ phận khảo thí công bố.</p><p className="mt-4 rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-500">Mã biên nhận: {receipt}</p><button onClick={onExit} className="mt-5 rounded-xl bg-[#018f41] px-5 py-3 font-bold text-white">Về trung tâm khảo thí</button></div></div>;
  if (error && !payload) return <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center p-6"><div className="rounded-3xl bg-white p-7 text-center shadow-xl"><AlertTriangle className="mx-auto text-rose-600" /><p className="mt-3 font-bold text-rose-700">{error}</p><button onClick={onExit} className="mt-5 rounded-xl border border-slate-200 px-4 py-2 font-bold">Quay lại</button></div></div>;
  if (!payload) return <div className="flex flex-1 items-center justify-center text-white"><Loader2 className="mr-2 animate-spin" />Đang xác minh điều kiện và mở đề…</div>;

  return <div className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-7"><header className="sticky top-0 z-20 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/95 p-4 shadow-lg backdrop-blur"><div><p className="text-xs font-extrabold uppercase tracking-wider text-[#018f41]">Thi chính thức · UDA</p><h1 className="font-black text-slate-900">{payload.title}</h1></div><div className="flex items-center gap-3"><span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${saveState === "error" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}><Save size={15} />{saveState === "saving" ? "Đang lưu" : saveState === "error" ? "Lỗi lưu" : "Đã tự lưu"}</span><span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-black ${secondsLeft < 300 ? "bg-rose-100 text-rose-700" : "bg-[#018f41] text-white"}`}><Clock3 size={18} />{formatTime(secondsLeft)}</span></div></header>{error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">⚠ {error}</p>}<div className="space-y-4">{payload.questions.map((question, questionIndex) => <article key={questionIndex} className="rounded-3xl bg-white p-5 shadow-lg sm:p-6"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#018f41] font-black text-white">{questionIndex + 1}</span><h2 className="pt-1 text-lg font-extrabold text-slate-900">{question.text}</h2></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{question.answers.map((answer, answerIndex) => { const selected = responses[String(questionIndex)] === answerIndex; return <button key={answerIndex} onClick={() => setResponses((current) => ({ ...current, [questionIndex]: answerIndex }))} className={`min-h-14 rounded-2xl border p-3 text-left text-sm font-semibold transition ${selected ? "border-[#018f41] bg-emerald-50 text-[#01823c] ring-2 ring-[#018f41]/20" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#018f41]/50"}`}><span className="mr-2 font-black">{String.fromCharCode(65 + answerIndex)}.</span>{answer.text}</button>; })}</div></article>)}</div><div className="sticky bottom-4 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/95 p-4 shadow-2xl backdrop-blur"><p className="text-sm font-bold text-slate-600">Đã trả lời {answered}/{payload.questions.length}</p><button disabled={submitting} onClick={submit} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#f58220] px-5 font-extrabold text-white disabled:opacity-50"><Send size={18} />{submitting ? "Đang nộp…" : "Nộp bài"}</button></div></div>;
}
