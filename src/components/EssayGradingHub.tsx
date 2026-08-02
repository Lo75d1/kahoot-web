"use client";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Send } from "lucide-react";
import {
  listSubmissions,
  updateSubmission,
  type EssayGrade,
  type Submission,
} from "@/lib/submissions";
import { loadInstitutional } from "@/lib/institutional";

export default function EssayGradingHub({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Submission[]>(() => listSubmissions());
  const [selected, setSelected] = useState<string | null>(
    () => listSubmissions()[0]?.id ?? null,
  );
  const current = items.find((i) => i.id === selected);
  const rubric = loadInstitutional().rubric;
  const refresh = () => setItems(listSubmissions());
  const grade = (index: number, patch: Partial<EssayGrade>) => {
    if (!current) return;
    const old = current.grades[index];
    const grades = {
      ...current.grades,
      [index]: {
        points: old?.points ?? 0,
        feedback: old?.feedback ?? "",
        criteria: old?.criteria ?? {},
        ...patch,
      },
    };
    updateSubmission(current.id, { grades, status: "pending_review" });
    refresh();
  };
  const criterion = (index: number, id: string, value: number) => {
    if (!current) return;
    const values = { ...(current.grades[index]?.criteria ?? {}), [id]: value };
    grade(index, {
      criteria: values,
      points: Object.values(values).reduce((sum, item) => sum + item, 0),
    });
  };
  const essays =
    current?.quiz.questions
      .map((question, index) => ({ question, index }))
      .filter((x) => x.question.type === "essay") ?? [];
  const complete =
    !!current &&
    essays.length > 0 &&
    essays.every(({ index }) =>
      rubric.every(
        (r) => current.grades[index]?.criteria?.[r.id] !== undefined,
      ),
    );
  const mark = () => {
    if (current && complete) {
      updateSubmission(current.id, { status: "graded" });
      refresh();
    }
  };
  const publish = () => {
    if (current && current.status === "graded") {
      updateSubmission(current.id, { status: "published" });
      refresh();
    }
  };
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-900 p-5 text-white">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">
            Kiểm soát kết quả
          </p>
          <h1 className="mt-1 text-2xl font-black">Chấm tự luận theo rubric</h1>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold"
        >
          <ArrowLeft size={17} />
          Quay lại
        </button>
      </header>
      <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-3xl bg-white p-3 shadow-lg">
          <p className="p-2 text-xs font-black uppercase text-slate-500">
            Bài đã nộp ({items.length})
          </p>
          {!items.length ? (
            <p className="p-4 text-sm text-slate-500">
              Chưa có bài tự luận chờ chấm.
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item.id)}
                className={`mb-2 w-full rounded-2xl p-3 text-left ${selected === item.id ? "bg-emerald-50 ring-2 ring-[#018f41]" : "bg-slate-50"}`}
              >
                <b className="block text-sm">{item.quizTitle}</b>
                <span className="text-xs text-slate-500">
                  {new Date(item.submittedAt).toLocaleString("vi-VN")}
                </span>
                <span className="mt-2 block text-xs font-black text-amber-700">
                  {item.status === "published"
                    ? "ĐÃ CÔNG BỐ"
                    : item.status === "graded"
                      ? "ĐÃ CHẤM · CHỜ CÔNG BỐ"
                      : "CHỜ CHẤM"}
                </span>
              </button>
            ))
          )}
        </aside>
        <section className="rounded-3xl bg-white p-5 shadow-lg">
          {!current ? (
            <div className="py-20 text-center text-slate-500">
              <ClipboardCheck className="mx-auto mb-3" />
              Chọn bài để chấm
            </div>
          ) : (
            <>
              <h2 className="text-xl font-black">{current.quizTitle}</h2>
              <div className="mt-4 space-y-4">
                {essays.map(({ question, index }) => (
                  <article key={index} className="rounded-2xl border p-4">
                    <p className="font-bold">
                      Câu {index + 1}. {question.text}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm">
                      {String(current.responses[index] ?? "(Không trả lời)")}
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {rubric.map((r) => (
                        <label
                          key={r.id}
                          className="rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600"
                        >
                          {r.name} · tối đa {r.maxPoints}
                          <span className="mt-1 block font-normal">
                            {r.description}
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={r.maxPoints}
                            step={0.25}
                            value={
                              current.grades[index]?.criteria?.[r.id] ?? ""
                            }
                            onChange={(e) =>
                              criterion(
                                index,
                                r.id,
                                Math.min(
                                  r.maxPoints,
                                  Math.max(0, Number(e.target.value)),
                                ),
                              )
                            }
                            className="mt-2 min-h-10 w-full rounded-lg border bg-white px-2 text-base"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                      <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                        Tổng rubric
                        <span className="block text-2xl font-black">
                          {current.grades[index]?.points ?? 0} /{" "}
                          {rubric.reduce((s, r) => s + r.maxPoints, 0)}
                        </span>
                      </div>
                      <label className="text-xs font-bold">
                        Nhận xét
                        <textarea
                          value={current.grades[index]?.feedback ?? ""}
                          onChange={(e) =>
                            grade(index, { feedback: e.target.value })
                          }
                          className="mt-1 min-h-20 w-full rounded-xl border p-2 text-sm"
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  disabled={!complete || current.status !== "pending_review"}
                  onClick={mark}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#018f41] px-4 py-3 text-sm font-black text-white disabled:opacity-40"
                >
                  <CheckCircle2 size={17} />
                  Hoàn tất chấm
                </button>
                <button
                  disabled={current.status !== "graded"}
                  onClick={publish}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f58220] px-4 py-3 text-sm font-black text-white disabled:opacity-40"
                >
                  <Send size={17} />
                  Công bố
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
