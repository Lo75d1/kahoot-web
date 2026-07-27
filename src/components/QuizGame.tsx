"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Quiz, RoundResult } from "@/lib/types";
import { parseQuiz, QuizParseError } from "@/lib/parser";
import { computeScore, streakBonus } from "@/lib/scoring";
import sampleRaw from "@/data/sample-quiz.json";

type Screen = "home" | "playing" | "result";
type Phase = "answering" | "revealed";

// Màu + hình khối cho 4 ô đáp án, phong cách Kahoot.
const TILE_STYLES = [
  { bg: "bg-rose-600", ring: "ring-rose-300", shape: "▲" },
  { bg: "bg-sky-600", ring: "ring-sky-300", shape: "◆" },
  { bg: "bg-amber-500", ring: "ring-amber-200", shape: "●" },
  { bg: "bg-emerald-600", ring: "ring-emerald-300", shape: "■" },
];

export default function QuizGame() {
  const [screen, setScreen] = useState<Screen>("home");
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  // Trạng thái ván chơi
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

  const question = quiz?.questions[index];

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
      const correct =
        choice !== null && !!question.answers[choice]?.correct;

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

  // Bộ đếm ngược cho mỗi câu ở pha trả lời.
  useEffect(() => {
    if (screen !== "playing" || phase !== "answering" || !question) return;

    answeredRef.current = false;
    questionStartRef.current = Date.now();
    const deadline = questionStartRef.current + question.timeLimit * 1000;
    setTimeLeftMs(question.timeLimit * 1000);

    timerRef.current = setInterval(() => {
      const left = deadline - Date.now();
      if (left <= 0) {
        setTimeLeftMs(0);
        reveal(null); // hết giờ, không trả lời
      } else {
        setTimeLeftMs(left);
      }
    }, 100);

    return clearTimer;
  }, [screen, phase, index, question, reveal]);

  const startQuiz = (q: Quiz) => {
    setQuiz(q);
    setIndex(0);
    setPhase("answering");
    setSelected(null);
    setScore(0);
    setStreak(0);
    setLastEarned(0);
    setResults([]);
    setScreen("playing");
  };

  const next = () => {
    if (!quiz) return;
    if (index + 1 >= quiz.questions.length) {
      setScreen("result");
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setPhase("answering");
    }
  };

  if (screen === "home") {
    return <HomeScreen onStart={startQuiz} />;
  }

  if (screen === "result" && quiz) {
    return (
      <ResultScreen
        quiz={quiz}
        score={score}
        results={results}
        onReplay={() => startQuiz(quiz)}
        onHome={() => setScreen("home")}
      />
    );
  }

  if (screen === "playing" && quiz && question) {
    const total = quiz.questions.length;
    const timePct = Math.max(
      0,
      Math.min(100, (timeLeftMs / (question.timeLimit * 1000)) * 100),
    );
    const secondsLeft = Math.ceil(timeLeftMs / 1000);

    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 sm:p-6">
        {/* Thanh trên: tiến độ + điểm */}
        <div className="flex items-center justify-between text-sm font-semibold text-white/90">
          <span className="rounded-full bg-white/15 px-3 py-1">
            Câu {index + 1}/{total}
          </span>
          {streak >= 2 && phase === "answering" && (
            <span className="rounded-full bg-amber-400/90 px-3 py-1 text-amber-950">
              🔥 Chuỗi {streak}
            </span>
          )}
          <span className="rounded-full bg-white/15 px-3 py-1">
            {score.toLocaleString("vi-VN")} điểm
          </span>
        </div>

        {/* Câu hỏi */}
        <div className="rounded-2xl bg-white px-5 py-6 text-center shadow-xl">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            {question.text}
          </h2>
        </div>

        {/* Đồng hồ */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-black text-white ${
              secondsLeft <= 5 && phase === "answering"
                ? "animate-pulse bg-rose-600"
                : "bg-slate-800"
            }`}
          >
            {phase === "answering" ? secondsLeft : "⏱"}
          </div>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear"
              style={{ width: `${phase === "answering" ? timePct : 0}%` }}
            />
          </div>
        </div>

        {/* Đáp án */}
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {question.answers.map((ans, i) => {
            const style = TILE_STYLES[i % TILE_STYLES.length];
            const revealed = phase === "revealed";
            const isCorrect = ans.correct;
            const isPicked = selected === i;

            let stateClass = `${style.bg} hover:brightness-110`;
            if (revealed) {
              if (isCorrect) stateClass = "bg-emerald-600 ring-4 ring-white";
              else if (isPicked) stateClass = "bg-rose-700 opacity-90";
              else stateClass = `${style.bg} opacity-40`;
            }

            return (
              <button
                key={i}
                disabled={revealed}
                onClick={() => reveal(i)}
                className={`flex items-center gap-3 rounded-xl px-4 py-5 text-left text-lg font-bold text-white shadow-md transition ${stateClass} ${
                  revealed ? "cursor-default" : "cursor-pointer active:scale-[0.98]"
                }`}
              >
                <span className="text-2xl drop-shadow">{style.shape}</span>
                <span className="flex-1">{ans.text}</span>
                {revealed && isCorrect && <span className="text-2xl">✓</span>}
                {revealed && isPicked && !isCorrect && (
                  <span className="text-2xl">✕</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Vùng phản hồi sau khi trả lời */}
        {phase === "revealed" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/10 p-4 text-center text-white">
            {selected === null ? (
              <p className="text-lg font-bold">⏰ Hết giờ! +0 điểm</p>
            ) : results[results.length - 1]?.correct ? (
              <p className="text-lg font-bold text-emerald-300">
                🎉 Chính xác! +{lastEarned.toLocaleString("vi-VN")} điểm
              </p>
            ) : (
              <p className="text-lg font-bold text-rose-300">
                Sai rồi! +0 điểm
              </p>
            )}
            <button
              onClick={next}
              className="rounded-full bg-white px-8 py-3 text-base font-extrabold text-violet-700 shadow-lg transition hover:brightness-95 active:scale-95"
            >
              {index + 1 >= total ? "Xem kết quả →" : "Câu tiếp theo →"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

/* ------------------------------- Home ------------------------------- */

function HomeScreen({ onStart }: { onStart: (q: Quiz) => void }) {
  const [showPaste, setShowPaste] = useState(false);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const playSample = () => {
    try {
      onStart(parseQuiz(sampleRaw));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const playPasted = () => {
    setError(null);
    try {
      onStart(parseQuiz(raw));
    } catch (e) {
      setError(
        e instanceof QuizParseError
          ? e.message
          : "Không đọc được đề. Kiểm tra lại JSON.",
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center text-white">
      <div>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          Quiz<span className="text-amber-300">!</span>
        </h1>
        <p className="mt-2 text-white/80">
          Bản chơi solo — trả lời đúng &amp; nhanh để ghi điểm.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3">
        <button
          onClick={playSample}
          className="rounded-xl bg-white px-6 py-4 text-lg font-extrabold text-violet-700 shadow-lg transition hover:brightness-95 active:scale-95"
        >
          ▶ Chơi bộ đề mẫu
        </button>
        <button
          onClick={() => setShowPaste((v) => !v)}
          className="rounded-xl bg-white/15 px-6 py-3 font-bold text-white transition hover:bg-white/25"
        >
          {showPaste ? "Ẩn" : "Dán JSON đề của bạn"}
        </button>
      </div>

      {showPaste && (
        <div className="flex w-full flex-col gap-3">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder='{ "title": "...", "questions": [ ... ] }'
            className="h-40 w-full rounded-xl border border-white/20 bg-white/95 p-3 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button
            onClick={playPasted}
            disabled={!raw.trim()}
            className="rounded-xl bg-amber-300 px-6 py-3 font-extrabold text-amber-950 shadow transition hover:brightness-95 active:scale-95 disabled:opacity-50"
          >
            Tải đề &amp; chơi
          </button>
        </div>
      )}

      {error && (
        <p className="w-full rounded-xl bg-rose-600/90 px-4 py-3 text-sm font-semibold text-white">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------ Result ------------------------------ */

function ResultScreen({
  quiz,
  score,
  results,
  onReplay,
  onHome,
}: {
  quiz: Quiz;
  score: number;
  results: RoundResult[];
  onReplay: () => void;
  onHome: () => void;
}) {
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center text-white">
      <h1 className="text-3xl font-black sm:text-4xl">{message}</h1>

      <div className="w-full rounded-2xl bg-white/10 p-6">
        <p className="text-sm uppercase tracking-wide text-white/70">
          Tổng điểm
        </p>
        <p className="text-5xl font-black text-amber-300">
          {score.toLocaleString("vi-VN")}
        </p>
        <p className="mt-3 text-white/90">
          Đúng {correctCount}/{total} câu ({pct}%)
        </p>
      </div>

      {/* Chi tiết từng câu */}
      <div className="w-full overflow-hidden rounded-2xl bg-white/5">
        {results.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-sm last:border-0"
          >
            <span className="text-white/80">Câu {i + 1}</span>
            <span className={r.correct ? "text-emerald-300" : "text-rose-300"}>
              {r.correct ? "✓ Đúng" : r.responseMs === null ? "⏰ Hết giờ" : "✕ Sai"}
              {"  "}+{r.earned.toLocaleString("vi-VN")}
            </span>
          </div>
        ))}
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button
          onClick={onReplay}
          className="flex-1 rounded-xl bg-white px-6 py-3 font-extrabold text-violet-700 shadow-lg transition hover:brightness-95 active:scale-95"
        >
          ↻ Chơi lại
        </button>
        <button
          onClick={onHome}
          className="flex-1 rounded-xl bg-white/15 px-6 py-3 font-bold text-white transition hover:bg-white/25"
        >
          ⌂ Về trang chủ
        </button>
      </div>
    </div>
  );
}
