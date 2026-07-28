"use client";

import { useState } from "react";
import type { Quiz } from "@/lib/types";
import type { SavedQuiz } from "@/lib/store";
import { parseQuiz, QuizParseError } from "@/lib/parser";

interface DraftAnswer {
  text: string;
  correct: boolean;
}
interface DraftQuestion {
  text: string;
  timeLimit: string;
  points: string;
  answers: DraftAnswer[];
}

const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";
const INPUT =
  "w-full rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200";
const BTN_LIGHT =
  "rounded-xl border border-white/50 bg-white/85 px-4 py-2 font-bold text-emerald-900 shadow backdrop-blur-md transition hover:bg-white active:scale-95";
const BTN_GHOST =
  "rounded-xl border border-white/25 bg-white/10 px-4 py-2 font-semibold text-white backdrop-blur-md transition hover:bg-white/20";

function blankQuestion(): DraftQuestion {
  return {
    text: "",
    timeLimit: "20",
    points: "1000",
    answers: [
      { text: "", correct: true },
      { text: "", correct: false },
      { text: "", correct: false },
      { text: "", correct: false },
    ],
  };
}

function toDraft(quiz: SavedQuiz): {
  title: string;
  description: string;
  questions: DraftQuestion[];
} {
  return {
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions.map((q) => ({
      text: q.text,
      timeLimit: String(q.timeLimit),
      points: String(q.points),
      answers: q.answers.map((a) => ({ text: a.text, correct: a.correct })),
    })),
  };
}

export default function QuizEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: SavedQuiz | null;
  onSave: (quiz: Quiz & { id?: string }) => void;
  onCancel: () => void;
}) {
  const seed = initial
    ? toDraft(initial)
    : { title: "", description: "", questions: [blankQuestion()] };

  const [title, setTitle] = useState(seed.title);
  const [description, setDescription] = useState(seed.description);
  const [questions, setQuestions] = useState<DraftQuestion[]>(seed.questions);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importRaw, setImportRaw] = useState("");

  const patchQuestion = (qi: number, patch: Partial<DraftQuestion>) =>
    setQuestions((qs) => qs.map((q, i) => (i === qi ? { ...q, ...patch } : q)));

  const patchAnswer = (qi: number, ai: number, patch: Partial<DraftAnswer>) =>
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qi
          ? {
              ...q,
              answers: q.answers.map((a, j) =>
                j === ai ? { ...a, ...patch } : a,
              ),
            }
          : q,
      ),
    );

  const setCorrect = (qi: number, ai: number) =>
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qi
          ? {
              ...q,
              answers: q.answers.map((a, j) => ({ ...a, correct: j === ai })),
            }
          : q,
      ),
    );

  const addAnswer = (qi: number) =>
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === qi && q.answers.length < 4
          ? { ...q, answers: [...q.answers, { text: "", correct: false }] }
          : q,
      ),
    );

  const removeAnswer = (qi: number, ai: number) =>
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qi || q.answers.length <= 2) return q;
        const answers = q.answers.filter((_, j) => j !== ai);
        if (!answers.some((a) => a.correct)) answers[0].correct = true;
        return { ...q, answers };
      }),
    );

  const addQuestion = () => setQuestions((qs) => [...qs, blankQuestion()]);
  const removeQuestion = (qi: number) =>
    setQuestions((qs) => (qs.length <= 1 ? qs : qs.filter((_, i) => i !== qi)));

  const moveQuestion = (qi: number, dir: -1 | 1) =>
    setQuestions((qs) => {
      const j = qi + dir;
      if (j < 0 || j >= qs.length) return qs;
      const copy = [...qs];
      [copy[qi], copy[j]] = [copy[j], copy[qi]];
      return copy;
    });

  const importJson = () => {
    setError(null);
    try {
      const q = parseQuiz(importRaw);
      setTitle(q.title === "Bộ đề không tên" ? title : q.title);
      setDescription(q.description || description);
      setQuestions(
        q.questions.map((qq) => ({
          text: qq.text,
          timeLimit: String(qq.timeLimit),
          points: String(qq.points),
          answers: qq.answers.map((a) => ({ text: a.text, correct: a.correct })),
        })),
      );
      setShowImport(false);
      setImportRaw("");
    } catch (e) {
      setError(
        e instanceof QuizParseError
          ? e.message
          : "Không đọc được JSON để nhập.",
      );
    }
  };

  const handleSave = () => {
    setError(null);
    const raw = {
      title: title.trim() || "Bộ đề không tên",
      description: description.trim(),
      questions: questions.map((q) => ({
        text: q.text.trim(),
        timeLimit: Number(q.timeLimit) || 20,
        points: Number(q.points) || 1000,
        answers: q.answers
          .filter((a) => a.text.trim())
          .map((a) => ({ text: a.text.trim(), correct: a.correct })),
      })),
    };
    try {
      const quiz = parseQuiz(raw);
      onSave(initial ? { ...quiz, id: initial.id } : quiz);
    } catch (e) {
      setError(
        e instanceof QuizParseError ? e.message : "Đề chưa hợp lệ, kiểm tra lại.",
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 text-white sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black drop-shadow-sm">
          {initial ? "Sửa đề" : "Tạo đề mới"}
        </h1>
        <button onClick={onCancel} className={BTN_GHOST}>
          ← Quay lại
        </button>
      </div>

      {/* Thông tin đề */}
      <div className={`flex flex-col gap-3 rounded-3xl p-4 ${GLASS}`}>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Tên bộ đề
          <input
            className={INPUT}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Ôn tập chương 1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Mô tả (không bắt buộc)
          <input
            className={INPUT}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn"
          />
        </label>
        <button
          onClick={() => setShowImport((v) => !v)}
          className={`${BTN_GHOST} self-start text-sm`}
        >
          {showImport ? "Ẩn nhập JSON" : "⇪ Nhập nhanh từ JSON"}
        </button>
        {showImport && (
          <div className="flex flex-col gap-2">
            <textarea
              className={`${INPUT} h-32 font-mono text-xs`}
              value={importRaw}
              onChange={(e) => setImportRaw(e.target.value)}
              placeholder='{ "title": "...", "questions": [ ... ] }'
            />
            <button
              onClick={importJson}
              disabled={!importRaw.trim()}
              className={`${BTN_LIGHT} self-start disabled:opacity-50`}
            >
              Nhập vào form
            </button>
          </div>
        )}
      </div>

      {/* Danh sách câu hỏi */}
      {questions.map((q, qi) => (
        <div key={qi} className={`flex flex-col gap-3 rounded-3xl p-4 ${GLASS}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-200">Câu {qi + 1}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => moveQuestion(qi, -1)}
                disabled={qi === 0}
                className="text-lg text-white/80 transition hover:text-white disabled:opacity-25"
                aria-label="Chuyển câu lên"
              >
                ↑
              </button>
              <button
                onClick={() => moveQuestion(qi, 1)}
                disabled={qi === questions.length - 1}
                className="text-lg text-white/80 transition hover:text-white disabled:opacity-25"
                aria-label="Chuyển câu xuống"
              >
                ↓
              </button>
              <button
                onClick={() => removeQuestion(qi)}
                disabled={questions.length <= 1}
                className="text-sm text-rose-200 transition hover:text-rose-100 disabled:opacity-40"
              >
                ✕ Xóa câu
              </button>
            </div>
          </div>

          <input
            className={INPUT}
            value={q.text}
            onChange={(e) => patchQuestion(qi, { text: e.target.value })}
            placeholder="Nội dung câu hỏi?"
          />

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-xs font-semibold">
              Thời gian (giây)
              <input
                type="number"
                min={5}
                max={120}
                className={INPUT}
                value={q.timeLimit}
                onChange={(e) => patchQuestion(qi, { timeLimit: e.target.value })}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs font-semibold">
              Điểm tối đa
              <input
                type="number"
                min={100}
                step={100}
                className={INPUT}
                value={q.points}
                onChange={(e) => patchQuestion(qi, { points: e.target.value })}
              />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-white/80">
              Đáp án (chọn ⦿ cho đáp án đúng)
            </span>
            {q.answers.map((a, ai) => (
              <div key={ai} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={a.correct}
                  onChange={() => setCorrect(qi, ai)}
                  className="h-5 w-5 shrink-0 accent-emerald-400"
                  aria-label={`Đáp án ${ai + 1} đúng`}
                />
                <input
                  className={INPUT}
                  value={a.text}
                  onChange={(e) => patchAnswer(qi, ai, { text: e.target.value })}
                  placeholder={`Đáp án ${ai + 1}`}
                />
                <button
                  onClick={() => removeAnswer(qi, ai)}
                  disabled={q.answers.length <= 2}
                  className="shrink-0 px-2 text-rose-200 transition hover:text-rose-100 disabled:opacity-30"
                  aria-label="Xóa đáp án"
                >
                  ✕
                </button>
              </div>
            ))}
            {q.answers.length < 4 && (
              <button
                onClick={() => addAnswer(qi)}
                className={`${BTN_GHOST} self-start text-sm`}
              >
                + Thêm đáp án
              </button>
            )}
          </div>
        </div>
      ))}

      <button onClick={addQuestion} className={`${BTN_GHOST} self-start`}>
        + Thêm câu hỏi
      </button>

      {error && (
        <p className="rounded-2xl border border-rose-200/40 bg-rose-500/80 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md">
          ⚠ {error}
        </p>
      )}

      <div className="sticky bottom-3 flex gap-3">
        <button onClick={handleSave} className={`${BTN_LIGHT} flex-1 py-3 text-lg`}>
          💾 Lưu đề
        </button>
        <button onClick={onCancel} className={`${BTN_GHOST} py-3`}>
          Hủy
        </button>
      </div>
    </div>
  );
}
