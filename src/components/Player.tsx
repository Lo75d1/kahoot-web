"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Quiz, RoundResult } from "@/lib/types";
import { computeScore, streakBonus } from "@/lib/scoring";

type Phase = "answering" | "revealed";

const LETTERS = ["A", "B", "C", "D"];
const TILE_TINT = [
  "bg-sky-400/15",
  "bg-violet-400/15",
  "bg-amber-300/15",
  "bg-rose-400/15",
];
const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";
const CHIP =
  "rounded-full border border-white/25 bg-white/15 px-3 py-1 backdrop-blur-md";

export default function Player({
  quiz,
  onExit,
}: {
  quiz: Quiz;
  onExit: () => void;
}) {
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastEarned, setLastEarned] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);

  const questionStartRef = useRef(0);
  const answeredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const question = quiz.questions[index];

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const reveal = useCallback(
    (choice: number | null) => {
      if (answeredRef.current || !question) return;
      answeredRef.current = true;
      clearTimer();

      const responseMs =
        choice === null ? null : Date.now() - questionStartRef.current;
      const correct = choice !== null && !!question.answers[choice]?.correct;

      const newStreak = correct ? streak + 1 : 0;
      const base = correct
        ? computeScore(correct, responseMs ?? 0, question.timeLimit, question.points)
        : 0;
      const bonus = correct ? streakBonus(newStreak) : 0;
      const earned = base + bonus;

      setSelected(choice);
      setLastEarned(earned);
      setScore((s) => s + earned);
      setStreak(newStreak);
      setResults((r) => [...r, { correct, earned, responseMs }]);
      setPhase("revealed");
    },
    [question, streak],
  );

  useEffect(() => {
    if (done || phase !== "answering" || !question) return;

    answeredRef.current = false;
    questionStartRef.current = Date.now();
    const deadline = questionStartRef.current + question.timeLimit * 1000;
    setTimeLeftMs(question.timeLimit * 1000);

    timerRef.current = setInterval(() => {
      const left = deadline - Date.now();
      if (left <= 0) {
        setTimeLeftMs(0);
        reveal(null);
      } else {
        setTimeLeftMs(left);
      }
    }, 100);

    return clearTimer;
  }, [done, phase, index, question, reveal]);

  const restart = () => {
    setDone(false);
    setIndex(0);
    setPhase("answering");
    setSelected(null);
    setScore(0);
    setStreak(0);
    setLastEarned(0);
    setResults([]);
  };

  const next = () => {
    if (index + 1 >= quiz.questions.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setPhase("answering");
    }
  };

  if (done) {
    const correctCount = results.filter((r) => r.correct).length;
    const total = quiz.questions.length;
    const pct = Math.round((correctCount / total) * 100);
    const message =
      pct === 100
        ? "Tuyệt đối! 🏆"
        : pct >= 70
          ? "Làm tốt lắm! 🎉"
          : pct >= 40
            ? "Cũng khá đó! 👍"
            : "Thử lại nào! 💪";

    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 p-6 text-center text-white">
        <h1 className="text-3xl font-black drop-shadow-sm sm:text-4xl">
          {message}
        </h1>
        <div className={`w-full rounded-3xl p-6 ${GLASS}`}>
          <p className="text-sm uppercase tracking-wide text-white/70">
            Tổng điểm
          </p>
          <p className="text-5xl font-black text-amber-200">
            {score.toLocaleString("vi-VN")}
          </p>
          <p className="mt-3 text-white/90">
            Đúng {correctCount}/{total} câu ({pct}%)
          </p>
        </div>
        <div className={`w-full overflow-hidden rounded-3xl ${GLASS}`}>
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-base last:border-0"
            >
              <span className="text-white/80">Câu {i + 1}</span>
              <span className={r.correct ? "text-emerald-200" : "text-rose-200"}>
                {r.correct
                  ? "✓ Đúng"
                  : r.responseMs === null
                    ? "⏰ Hết giờ"
                    : "✕ Sai"}
                {"  "}+{r.earned.toLocaleString("vi-VN")}
              </span>
            </div>
          ))}
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <button
            onClick={restart}
            className="flex-1 rounded-2xl border border-white/50 bg-white/85 px-6 py-3 font-extrabold text-violet-700 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95"
          >
            ↻ Chơi lại
          </button>
          <button
            onClick={onExit}
            className="flex-1 rounded-2xl border border-white/25 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            ⌂ Ngân hàng đề
          </button>
        </div>
      </div>
    );
  }

  const total = quiz.questions.length;
  const timePct = Math.max(
    0,
    Math.min(100, (timeLeftMs / (question.timeLimit * 1000)) * 100),
  );
  const secondsLeft = Math.ceil(timeLeftMs / 1000);
  const lastCorrect = results[results.length - 1]?.correct;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between text-base font-semibold text-white/90">
        <span className={CHIP}>
          Câu {index + 1}/{total}
        </span>
        {streak >= 2 && phase === "answering" && (
          <span className="rounded-full border border-amber-200/40 bg-amber-300/25 px-3 py-1 backdrop-blur-md">
            🔥 Chuỗi {streak}
          </span>
        )}
        <span className={CHIP}>{score.toLocaleString("vi-VN")} điểm</span>
      </div>

      <div className="rounded-3xl border border-white/50 bg-white/75 px-5 py-7 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {question.text}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border text-lg font-black text-white backdrop-blur-md transition ${
            secondsLeft <= 5 && phase === "answering"
              ? "animate-pulse border-rose-200/50 bg-rose-500/40"
              : "border-white/25 bg-white/15"
          }`}
        >
          {phase === "answering" ? secondsLeft : "✓"}
        </div>
        <div className="h-3 flex-1 overflow-hidden rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
          <div
            className="h-full rounded-full bg-white/80 transition-[width] duration-100 ease-linear"
            style={{ width: `${phase === "answering" ? timePct : 0}%` }}
          />
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {question.answers.map((ans, i) => {
          const revealed = phase === "revealed";
          const isCorrect = ans.correct;
          const isPicked = selected === i;

          let stateClass = `${TILE_TINT[i % TILE_TINT.length]} border-white/30 hover:-translate-y-0.5 hover:bg-white/25`;
          if (revealed) {
            if (isCorrect)
              stateClass =
                "border-emerald-200/70 bg-emerald-400/30 ring-2 ring-emerald-200/60";
            else if (isPicked)
              stateClass = "border-rose-200/70 bg-rose-500/30 ring-2 ring-rose-200/60";
            else stateClass = "border-white/15 bg-white/5 opacity-45";
          }

          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => reveal(i)}
              className={`flex items-center gap-4 rounded-[1.75rem] border px-5 py-6 text-left text-xl font-semibold text-white shadow-lg backdrop-blur-md transition duration-200 ${stateClass} ${
                revealed ? "cursor-default" : "cursor-pointer active:scale-[0.98]"
              }`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/40 bg-white/25 text-lg font-black">
                {LETTERS[i] ?? i + 1}
              </span>
              <span className="flex-1">{ans.text}</span>
              {revealed && isCorrect && <span className="text-2xl">✓</span>}
              {revealed && isPicked && !isCorrect && (
                <span className="text-2xl">✕</span>
              )}
            </button>
          );
        })}
      </div>

      {phase === "revealed" && (
        <div
          className={`flex flex-col items-center gap-3 rounded-3xl p-4 text-center text-white ${GLASS}`}
        >
          {selected === null ? (
            <p className="text-xl font-bold">⏰ Hết giờ! +0 điểm</p>
          ) : lastCorrect ? (
            <p className="text-xl font-bold text-emerald-200">
              🎉 Chính xác! +{lastEarned.toLocaleString("vi-VN")} điểm
            </p>
          ) : (
            <p className="text-xl font-bold text-rose-200">Sai rồi! +0 điểm</p>
          )}
          <button
            onClick={next}
            className="rounded-full border border-white/50 bg-white/85 px-8 py-3 text-base font-extrabold text-violet-700 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95"
          >
            {index + 1 >= total ? "Xem kết quả →" : "Câu tiếp theo →"}
          </button>
        </div>
      )}
    </div>
  );
}
