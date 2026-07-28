"use client";

import { useState } from "react";
import type { Quiz } from "@/lib/types";
import { parseQuiz, QuizParseError } from "@/lib/parser";
import { buildPrompt, extractJson, type AiConfig } from "@/lib/aiPrompt";

const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";
const INPUT =
  "w-full rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200";
const LIGHT =
  "rounded-2xl border border-white/50 bg-white/85 px-6 py-3 font-extrabold text-violet-700 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95 disabled:opacity-50";
const GHOST =
  "rounded-2xl border border-white/25 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-md transition hover:bg-white/20";

export default function AiCreator({
  onSave,
  onCancel,
}: {
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
}) {
  const [attach, setAttach] = useState(false);
  const [source, setSource] = useState("");
  const [count, setCount] = useState(8);
  const [answers, setAnswers] = useState(4);
  const [difficulty, setDifficulty] = useState("trung bình");
  const [notes, setNotes] = useState("");

  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pasteRaw, setPasteRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const gen = () => {
    if (!attach && !source.trim()) {
      setError("Nhập chủ đề hoặc dán văn bản nguồn trước.");
      return;
    }
    setError(null);
    const cfg: AiConfig = {
      source: source.trim(),
      attach,
      count: Math.min(Math.max(count, 1), 50),
      answers: Math.min(Math.max(answers, 2), 4),
      difficulty,
      language: "Tiếng Việt",
      timeLimit: 20,
      points: 1000,
      notes: notes.trim(),
    };
    setPrompt(buildPrompt(cfg));
    setCopied(false);
  };

  const copy = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* người dùng tự bôi chọn copy */
    }
  };

  const importResult = () => {
    setError(null);
    try {
      const quiz = parseQuiz(extractJson(pasteRaw));
      onSave(quiz);
    } catch (e) {
      setError(
        e instanceof QuizParseError
          ? e.message
          : "Không đọc được kết quả. Kiểm tra lại JSON AI trả về.",
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 text-white sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black drop-shadow-sm">✨ Tạo đề bằng AI</h1>
        <button onClick={onCancel} className={`${GHOST} px-4 py-2`}>
          ← Quay lại
        </button>
      </div>

      {/* Bước 1: cấu hình */}
      <div className={`flex flex-col gap-3 rounded-3xl p-4 ${GLASS}`}>
        <p className="font-bold text-amber-200">① Mô tả yêu cầu</p>

        {/* Chọn nguồn: gõ văn bản hay đính kèm tài liệu vào AI */}
        <div className="flex gap-2">
          <button
            onClick={() => setAttach(false)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold backdrop-blur-md transition ${
              !attach
                ? "border-amber-200/50 bg-amber-300/25 text-amber-50"
                : "border-white/25 bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            ⌨ Gõ / dán văn bản
          </button>
          <button
            onClick={() => setAttach(true)}
            className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold backdrop-blur-md transition ${
              attach
                ? "border-amber-200/50 bg-amber-300/25 text-amber-50"
                : "border-white/25 bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            📎 Đính kèm tài liệu / ảnh
          </button>
        </div>

        {attach ? (
          <div className="rounded-xl border border-white/20 bg-white/5 p-3 text-sm text-white/80">
            Bạn sẽ <b className="text-white">đính kèm file/ảnh thẳng vào AI</b>{" "}
            (ChatGPT/Gemini/Claude) ở bước sau — khỏi cần gõ lại. Ô dưới chỉ để
            ghi <i>phạm vi/yêu cầu thêm</i> (không bắt buộc).
          </div>
        ) : null}

        <label className="flex flex-col gap-1 text-sm font-semibold">
          {attach
            ? "Phạm vi / yêu cầu thêm (không bắt buộc)"
            : "Chủ đề hoặc văn bản nguồn"}
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder={
              attach
                ? "VD: chỉ ra câu hỏi từ chương 2, tập trung phần định nghĩa."
                : "VD: Sinh học 12 - di truyền học Mendel. Hoặc dán cả đoạn văn bản vào đây."
            }
            className={`${INPUT} h-28`}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold">
            Số câu
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className={INPUT}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold">
            Số đáp án/câu
            <input
              type="number"
              min={2}
              max={4}
              value={answers}
              onChange={(e) => setAnswers(Number(e.target.value))}
              className={INPUT}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs font-semibold">
            Độ khó
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={INPUT}
            >
              <option>dễ</option>
              <option>trung bình</option>
              <option>khó</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Ghi chú thêm (không bắt buộc)
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VD: tập trung phần lai hai cặp tính trạng, kèm câu tính xác suất"
            className={INPUT}
          />
        </label>
        <button onClick={gen} className={`${LIGHT} self-start`}>
          ⚙ Tạo prompt
        </button>
      </div>

      {/* Bước 2: prompt + hướng dẫn */}
      {prompt && (
        <div className={`flex flex-col gap-3 rounded-3xl p-4 ${GLASS}`}>
          <p className="font-bold text-amber-200">
            ② Copy prompt → dán vào AI (ChatGPT / Claude / Gemini)
          </p>
          <textarea
            readOnly
            value={prompt}
            onFocus={(e) => e.currentTarget.select()}
            className={`${INPUT} h-40 font-mono text-xs`}
          />
          <button onClick={copy} className={`${LIGHT} self-start`}>
            {copied ? "✓ Đã copy" : "📋 Copy prompt"}
          </button>
          <p className="text-xs text-white/60">
            {attach ? (
              <>
                Mở AI (ChatGPT/Gemini/Claude) → bấm <b>📎 đính kèm</b> chọn
                file/ảnh tài liệu → <b>dán prompt này</b> → gửi. AI sẽ trả về một
                đoạn JSON — copy toàn bộ rồi dán xuống ô bên dưới.
              </>
            ) : (
              <>
                Mở AI bất kỳ, dán prompt, gửi. AI sẽ trả về một đoạn JSON — copy
                toàn bộ rồi dán xuống ô bên dưới.
              </>
            )}
          </p>
        </div>
      )}

      {/* Bước 3: dán kết quả */}
      {prompt && (
        <div className={`flex flex-col gap-3 rounded-3xl p-4 ${GLASS}`}>
          <p className="font-bold text-amber-200">③ Dán kết quả AI trả về</p>
          <textarea
            value={pasteRaw}
            onChange={(e) => setPasteRaw(e.target.value)}
            placeholder='Dán JSON (hoặc cả đoạn AI trả về) vào đây — app tự bóc JSON.'
            className={`${INPUT} h-36 font-mono text-xs`}
          />
          <button
            onClick={importResult}
            disabled={!pasteRaw.trim()}
            className={`${LIGHT} self-start`}
          >
            ✓ Kiểm tra & nhập vào ngân hàng
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-2xl border border-rose-200/40 bg-rose-500/80 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
