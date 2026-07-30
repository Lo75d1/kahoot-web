"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Quiz, RoundResult } from "@/lib/types";
import {
  computeScore,
  isQuestionResponseCorrect,
  streakBonus,
} from "@/lib/scoring";
import { sfx } from "@/lib/sound";
import type { LearningMode } from "@/lib/learning";

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
  mode = "practice",
  onComplete,
}: {
  quiz: Quiz;
  onExit: () => void;
  mode?: LearningMode;
  onComplete?: (results: RoundResult[], score: number) => void;
}) {
  const [done, setDone] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedMany, setSelectedMany] = useState<number[]>([]);
  const [textResponse, setTextResponse] = useState("");
  const [timeLeftMs, setTimeLeftMs] = useState(
    () => quiz.questions[0]?.timeLimit * 1000 || 0,
  );
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastEarned, setLastEarned] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [hintVisible, setHintVisible] = useState(false);
  const completionSentRef = useRef(false);

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
    (choice: number | number[] | string | null) => {
      if (answeredRef.current || !question) return;
      answeredRef.current = true;
      clearTimer();

      const responseMs =
        choice === null ? null : Date.now() - questionStartRef.current;
      const picked = Array.isArray(choice)
        ? choice
        : typeof choice === "number"
          ? [choice]
          : [];
      const correct = isQuestionResponseCorrect(question, choice);

      const newStreak = correct ? streak + 1 : 0;
      const base = correct
        ? computeScore(correct, responseMs ?? 0, question.timeLimit, question.points)
        : 0;
      const bonus = correct ? streakBonus(newStreak) : 0;
      const earned = base + bonus;

      setSelected(typeof choice === "number" ? choice : null);
      setSelectedMany(picked);
      setLastEarned(earned);
      setScore((s) => s + earned);
      setStreak(newStreak);
      setResults((r) => [...r, { correct, earned, responseMs }]);
      setPhase("revealed");
      if (correct) sfx.correct();
      else sfx.wrong();
    },
    [question, streak],
  );

  useEffect(() => {
    if (done || phase !== "answering" || !question) return;

    answeredRef.current = false;
    questionStartRef.current = Date.now();
    const deadline = questionStartRef.current + question.timeLimit * 1000;
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
    completionSentRef.current = false;
    setDone(false);
    setIndex(0);
    setPhase("answering");
    setSelected(null);
    setSelectedMany([]);
    setTextResponse("");
    setScore(0);
    setStreak(0);
    setLastEarned(0);
    setResults([]);
    setHintVisible(false);
    setTimeLeftMs(quiz.questions[0]?.timeLimit * 1000 || 0);
  };

  const next = () => {
    if (index + 1 >= quiz.questions.length) {
      if (!completionSentRef.current) {
        completionSentRef.current = true;
        onComplete?.(results, score);
      }
      setDone(true);
    } else {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      setSelected(null);
      setSelectedMany([]);
      setTextResponse("");
      setHintVisible(false);
      setPhase("answering");
      setTimeLeftMs(quiz.questions[nextIndex].timeLimit * 1000);
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
          {results.length > 0 && (
            <p className="mt-2 text-xs text-white/60">
              Chế độ: {mode === "learn" ? "Học" : mode === "exam" ? "Thi" : "Luyện tập"}
            </p>
          )}
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
            className="flex-1 rounded-2xl border border-white/50 bg-white/85 px-6 py-3 font-extrabold text-emerald-900 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95"
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

      <div
        key={index}
        className="anim-fade-up rounded-3xl border border-white/50 bg-white/75 px-5 py-7 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
      >
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {question.text}
        </h2>
      </div>

      {mode === "learn" && question.hint && phase === "answering" && (
        <div className="text-center">
          <button
            onClick={() => setHintVisible((visible) => !visible)}
            className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85"
          >
            {hintVisible ? "Ẩn gợi ý" : "💡 Xem gợi ý"}
          </button>
          {hintVisible && (
            <p className="mt-2 rounded-2xl border border-amber-200/25 bg-amber-300/15 p-3 text-sm text-amber-50">
              {question.hint}
            </p>
          )}
        </div>
      )}

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

      {question.type === "short_answer" || question.type === "fill_blank" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <input
            value={textResponse}
            onChange={(event) => setTextResponse(event.target.value)}
            disabled={phase === "revealed"}
            onKeyDown={(event) => {
              if (event.key === "Enter" && textResponse.trim()) {
                reveal(textResponse);
              }
            }}
            placeholder={
              question.type === "fill_blank"
                ? "Điền phần còn thiếu…"
                : "Nhập câu trả lời…"
            }
            className="w-full max-w-xl rounded-2xl border border-white/40 bg-white/90 px-5 py-4 text-lg font-semibold text-slate-900 shadow-lg outline-none focus:ring-2 focus:ring-amber-200"
          />
          {phase === "answering" && (
            <button
              onClick={() => reveal(textResponse)}
              disabled={!textResponse.trim()}
              className="rounded-full border border-amber-100/60 bg-amber-300 px-8 py-3 font-extrabold text-emerald-950 shadow-lg transition hover:bg-amber-200 disabled:opacity-40"
            >
              Chốt câu trả lời
            </button>
          )}
          {phase === "revealed" && mode !== "exam" && (
            <p className="text-sm text-white/75">
              Đáp án:{" "}
              <b className="text-emerald-100">
                {question.answers
                  .filter((answer) => answer.correct)
                  .map((answer) => answer.text)
                  .join(" / ")}
              </b>
            </p>
          )}
        </div>
      ) : (
      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {question.answers.map((ans, i) => {
          const revealed = phase === "revealed";
          const showAnswer = revealed && mode !== "exam";
          const isCorrect = ans.correct;
          const isPicked = selected === i || selectedMany.includes(i);

          let stateClass = `${TILE_TINT[i % TILE_TINT.length]} border-white/30 hover:-translate-y-0.5 hover:bg-white/25`;
          if (showAnswer) {
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
              onClick={() => {
                if (question.type === "multiple_choice") {
                  setSelectedMany((current) =>
                    current.includes(i)
                      ? current.filter((answerIndex) => answerIndex !== i)
                      : [...current, i],
                  );
                } else {
                  reveal(i);
                }
              }}
              className={`flex items-center gap-4 rounded-[1.75rem] border px-5 py-6 text-left text-xl font-semibold text-white shadow-lg backdrop-blur-md transition duration-200 ${stateClass} ${
                revealed ? "cursor-default" : "cursor-pointer active:scale-[0.98]"
              }`}
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg font-black ${
                  isPicked
                    ? "border-amber-100 bg-amber-300 text-emerald-950"
                    : "border-white/40 bg-white/25"
                }`}
              >
                {question.type === "multiple_choice" && isPicked
                  ? "✓"
                  : LETTERS[i] ?? i + 1}
              </span>
              <span className="flex-1">{ans.text}</span>
              {showAnswer && isCorrect && <span className="text-2xl">✓</span>}
              {showAnswer && isPicked && !isCorrect && (
                <span className="text-2xl">✕</span>
              )}
            </button>
          );
        })}
      </div>
      )}

      {phase === "answering" && question.type === "multiple_choice" && (
        <button
          onClick={() => reveal(selectedMany)}
          disabled={selectedMany.length === 0}
          className="self-center rounded-full border border-amber-100/60 bg-amber-300 px-8 py-3 font-extrabold text-emerald-950 shadow-lg transition hover:bg-amber-200 disabled:opacity-40"
        >
          Chốt {selectedMany.length} đáp án
        </button>
      )}

      {phase === "revealed" && (
        <div
          className={`flex flex-col items-center gap-3 rounded-3xl p-4 text-center text-white ${GLASS}`}
        >
          {mode === "exam" ? (
            <p className="text-xl font-bold text-sky-100">✓ Đã ghi nhận đáp án</p>
          ) : selected === null &&
            selectedMany.length === 0 &&
            !textResponse.trim() ? (
            <p className="text-xl font-bold">⏰ Hết giờ! +0 điểm</p>
          ) : lastCorrect ? (
            <p className="text-xl font-bold text-emerald-200">
              🎉 Chính xác! +{lastEarned.toLocaleString("vi-VN")} điểm
            </p>
          ) : (
            <p className="text-xl font-bold text-rose-200">Sai rồi! +0 điểm</p>
          )}
          {mode !== "exam" && question.explanation && (
            <p className="max-w-2xl rounded-2xl border border-white/15 bg-black/10 px-4 py-3 text-sm leading-relaxed text-white/85">
              <b>Lời giải:</b> {question.explanation}
            </p>
          )}
          <button
            onClick={next}
            className="rounded-full border border-white/50 bg-white/85 px-8 py-3 text-base font-extrabold text-emerald-900 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95"
          >
            {index + 1 >= total ? "Xem kết quả →" : "Câu tiếp theo →"}
          </button>
        </div>
      )}
    </div>
  );
}
