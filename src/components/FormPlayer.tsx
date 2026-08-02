"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileText, Lightbulb, Send } from "lucide-react";
import type { Quiz, RoundResult } from "@/lib/types";
import { isQuestionResponseCorrect } from "@/lib/scoring";
import { recordIntegrityEvent } from "@/lib/institutional";

type ResponseValue = number | number[] | string;

export default function FormPlayer({
  quiz,
  onExit,
  onComplete,
}: {
  quiz: Quiz;
  onExit: () => void;
  onComplete?: (
    results: RoundResult[],
    score: number,
    responses: Record<number, ResponseValue>,
    studentCode: string,
  ) => void;
}) {
  const [responses, setResponses] = useState<Record<number, ResponseValue>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [hints, setHints] = useState<number[]>([]);
  const [studentCode, setStudentCode] = useState(
    () =>
      new URLSearchParams(
        typeof location === "undefined" ? "" : location.search,
      ).get("student") ?? "",
  );
  useEffect(() => {
    if (submitted) return;
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [submitted]);
  useEffect(() => {
    const examId = new URLSearchParams(location.search).get("exam");
    if (!examId) return;
    const hidden = () => {
      if (document.hidden)
        recordIntegrityEvent(
          examId,
          "tab_hidden",
          "Thí sinh chuyển khỏi tab làm bài.",
        );
    };
    const offline = () =>
      recordIntegrityEvent(examId, "offline", "Thiết bị mất kết nối mạng.");
    const online = () =>
      recordIntegrityEvent(examId, "reconnected", "Thiết bị kết nối lại mạng.");
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);
  const answered = useMemo(
    () =>
      Object.values(responses).filter((value) =>
        Array.isArray(value)
          ? value.length > 0
          : String(value).trim().length > 0,
      ).length,
    [responses],
  );

  const submit = () => {
    if (!studentCode.trim()) {
      window.alert("Nhập mã sinh viên trước khi nộp bài.");
      return;
    }
    if (
      !window.confirm(
        `Nộp biểu mẫu với ${answered}/${quiz.questions.length} câu đã trả lời?`,
      )
    )
      return;
    const results = quiz.questions.map((question, index) => {
      const response = responses[index] ?? null;
      const pendingReview =
        question.type === "essay" &&
        typeof response === "string" &&
        response.trim().length > 0;
      return {
        correct: pendingReview
          ? false
          : isQuestionResponseCorrect(question, response),
        earned: 0,
        responseMs: elapsed * 1000,
        pendingReview,
      } satisfies RoundResult;
    });
    setSubmitted(true);
    onComplete?.(results, 0, responses, studentCode);
  };

  if (submitted)
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center p-5">
        <section className="w-full rounded-3xl bg-white p-8 text-center shadow-2xl">
          <CheckCircle2 size={54} className="mx-auto text-[#018f41]" />
          <h1 className="mt-4 text-2xl font-black text-[#01823c]">
            Đã nộp biểu mẫu
          </h1>
          <p className="mt-2 text-slate-600">
            Câu tự luận được giữ ở trạng thái chờ giảng viên chấm.
          </p>
          <button
            onClick={onExit}
            className="mt-5 rounded-xl bg-[#018f41] px-5 py-3 font-bold text-white"
          >
            Về ngân hàng đề
          </button>
        </section>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-7">
      <header className="rounded-3xl border-t-8 border-[#018f41] bg-white p-6 shadow-xl">
        <p className="text-xs font-black uppercase tracking-widest text-[#018f41]">
          Biểu mẫu UDA
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">
          {quiz.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{quiz.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-slate-600">
            Mã sinh viên
            <input
              value={studentCode}
              onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
              placeholder="VD: SV240001"
              className="ml-2 min-h-10 rounded-xl border border-slate-200 px-3 font-mono text-sm uppercase outline-none focus:border-[#018f41]"
            />
          </label>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
            <Clock3 size={16} />
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} ·
            Đã làm {answered}/{quiz.questions.length}
          </span>
        </div>
      </header>
      <div className="mt-4 space-y-4">
        {quiz.questions.map((question, index) => {
          const unlockAt = question.hintDelaySeconds ?? 0;
          const wait = Math.max(0, unlockAt - elapsed);
          const hintOpen = hints.includes(index);
          return (
            <article
              key={index}
              className="rounded-3xl bg-white p-5 shadow-lg sm:p-6"
            >
              <p className="font-extrabold text-slate-900">
                <span className="mr-2 text-[#018f41]">{index + 1}.</span>
                {question.text}
              </p>
              {question.type === "essay" ? (
                <textarea
                  value={String(responses[index] ?? "")}
                  onChange={(e) =>
                    setResponses((current) => ({
                      ...current,
                      [index]: e.target.value,
                    }))
                  }
                  placeholder="Nhập bài tự luận…"
                  className="mt-4 min-h-44 w-full rounded-xl border border-slate-200 p-4 text-sm leading-7 outline-none focus:border-[#018f41]"
                />
              ) : question.type === "short_answer" ||
                question.type === "fill_blank" ? (
                <input
                  value={String(responses[index] ?? "")}
                  onChange={(e) =>
                    setResponses((current) => ({
                      ...current,
                      [index]: e.target.value,
                    }))
                  }
                  placeholder="Câu trả lời của bạn"
                  className="mt-4 min-h-12 w-full border-b-2 border-slate-200 px-2 outline-none focus:border-[#018f41]"
                />
              ) : (
                <div className="mt-4 space-y-2">
                  {question.answers.map((answer, answerIndex) => {
                    const multiple = question.type === "multiple_choice";
                    const current = responses[index];
                    const checked = multiple
                      ? Array.isArray(current) && current.includes(answerIndex)
                      : current === answerIndex;
                    return (
                      <label
                        key={answerIndex}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-emerald-50"
                      >
                        <input
                          type={multiple ? "checkbox" : "radio"}
                          name={`form-${index}`}
                          checked={checked}
                          onChange={() =>
                            setResponses((values) => {
                              if (!multiple)
                                return { ...values, [index]: answerIndex };
                              const selected = Array.isArray(values[index])
                                ? (values[index] as number[])
                                : [];
                              return {
                                ...values,
                                [index]: selected.includes(answerIndex)
                                  ? selected.filter(
                                      (value) => value !== answerIndex,
                                    )
                                  : [...selected, answerIndex],
                              };
                            })
                          }
                          className="h-5 w-5 accent-[#018f41]"
                        />
                        <span className="text-sm text-slate-700">
                          {answer.text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {question.hint && (
                <div className="mt-4">
                  <button
                    disabled={wait > 0}
                    onClick={() =>
                      setHints((current) =>
                        current.includes(index)
                          ? current.filter((value) => value !== index)
                          : [...current, index],
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-50"
                  >
                    <Lightbulb size={15} />
                    {wait > 0
                      ? `Gợi ý mở sau ${wait}s`
                      : hintOpen
                        ? "Ẩn gợi ý"
                        : "Mở gợi ý"}
                  </button>
                  {hintOpen && (
                    <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                      {question.hint}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
      <footer className="sticky bottom-4 mt-5 flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-2xl">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
        >
          <FileText size={17} />
          Thoát
        </button>
        <button
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f58220] px-5 py-3 font-extrabold text-white"
        >
          <Send size={18} />
          Nộp biểu mẫu
        </button>
      </footer>
    </div>
  );
}
