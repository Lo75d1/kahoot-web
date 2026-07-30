"use client";

import { useState } from "react";
import type { Quiz } from "@/lib/types";
import { QuizParseError } from "@/lib/parser";
import { parseMarkerText, parseCsv } from "@/lib/textFormat";
import { parseByRules, buildRulesPrompt } from "@/lib/ruleParser";

const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";
const INPUT =
  "w-full rounded-xl border border-white/40 bg-white/90 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200";
const LIGHT =
  "rounded-2xl border border-white/50 bg-white/85 px-6 py-3 font-extrabold text-emerald-900 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95 disabled:opacity-50";
const GHOST =
  "rounded-2xl border border-white/25 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-md transition hover:bg-white/20";

type Fmt = "marker" | "csv" | "rules";

const EXAMPLE: Record<"marker" | "csv", string> = {
  marker: `# Địa lý Việt Nam
> Bộ đề mẫu

Thủ đô của Việt Nam?
* Hà Nội
- TP.HCM
- Huế
- Đà Nẵng

2 + 2 x 2 = ?  [time=15] [points=1200]
- 8
* 6
- 4`,
  csv: `Câu hỏi,Đáp án A,Đáp án B,Đáp án C,Đáp án D,Đáp án đúng
Thủ đô Việt Nam?,Hà Nội,TP.HCM,Huế,Đà Nẵng,A
2 + 2 x 2 = ?,8,6,4,,B`,
};

export default function ImportText({
  onSave,
  onCancel,
}: {
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
}) {
  const [fmt, setFmt] = useState<Fmt>("marker");
  const [raw, setRaw] = useState("");
  const [rulesRaw, setRulesRaw] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<Quiz | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setWorking("Đang đọc tài liệu…");
    try {
      if (/\.(txt|csv|tsv|md)$/i.test(file.name)) {
        setRaw(await file.text());
      } else {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/documents/extract", {
          method: "POST",
          body: form,
        });
        const result = (await response.json()) as {
          text?: string;
          kind?: string;
          pages?: number;
          truncated?: boolean;
          error?: string;
        };
        if (!response.ok || !result.text) {
          throw new Error(result.error || "Không đọc được tài liệu.");
        }
        setRaw(result.text);
        setFileInfo(
          `${file.name}${result.pages ? ` · ${result.pages} trang` : ""}${
            result.truncated ? " · đã giới hạn nội dung dài" : ""
          }`,
        );
      }
      if (file.name.toLowerCase().endsWith(".csv")) setFmt("csv");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được tài liệu.");
    } finally {
      setWorking(null);
    }
  };

  const importWithAi = async (
    mode: "extract" | "generate" | "outline",
  ) => {
    setError(null);
    setWorking(
      mode === "extract"
        ? "AI đang nhận diện bộ đề…"
        : mode === "outline"
          ? "AI đang tạo đề cương…"
          : "AI đang tạo câu hỏi…",
    );
    try {
      const response = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: raw, mode, count: 20 }),
      });
      const result = (await response.json()) as Quiz & {
        error?: string;
        code?: string;
      };
      if (!response.ok) {
        throw new Error(
          result.code === "AI_NOT_CONFIGURED"
            ? "AI trực tiếp chưa được bật trên máy chủ. Bạn vẫn có thể dùng “Theo quy tắc (AI)” hoặc AI ngoài miễn phí."
            : result.error || "AI không xử lý được tài liệu.",
        );
      }
      setAiPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI không xử lý được tài liệu.");
    } finally {
      setWorking(null);
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildRulesPrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user tự bôi chọn */
    }
  };

  const doImport = () => {
    setError(null);
    try {
      const quiz =
        fmt === "csv"
          ? parseCsv(raw)
          : fmt === "rules"
            ? parseByRules(raw, rulesRaw)
            : parseMarkerText(raw);
      onSave(quiz);
    } catch (e) {
      setError(
        e instanceof QuizParseError || e instanceof Error
          ? e.message
          : "Không đọc được tài liệu.",
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 text-white sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black drop-shadow-sm">📄 Nhập từ tài liệu</h1>
        <button onClick={onCancel} className={`${GHOST} px-4 py-2`}>
          ← Quay lại
        </button>
      </div>

      <div className={`flex flex-col gap-3 rounded-3xl p-4 ${GLASS}`}>
        {/* Chọn định dạng */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["marker", "✍ Văn bản (* −)"],
              ["csv", "▦ CSV / Excel"],
              ["rules", "🧩 Theo quy tắc (AI)"],
            ] as [Fmt, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFmt(f)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold backdrop-blur-md transition ${
                fmt === f
                  ? "border-amber-200/50 bg-amber-300/25 text-amber-50"
                  : "border-white/25 bg-white/10 text-white/80 hover:bg-white/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Hướng dẫn ngắn */}
        <div className="rounded-xl border border-white/20 bg-white/5 p-3 text-xs text-white/80">
          {fmt === "marker" ? (
            <>
              <b className="text-white">#</b> tên đề · <b className="text-white">&gt;</b>{" "}
              mô tả · <b className="text-amber-200">*</b> đáp án đúng ·{" "}
              <b className="text-white">−</b> đáp án sai · dòng khác = câu hỏi.
            </>
          ) : fmt === "csv" ? (
            <>
              Cột đầu = câu hỏi, các cột sau = đáp án. Đánh dấu đúng bằng{" "}
              <b className="text-amber-200">*</b> trước đáp án, <i>hoặc</i> cột cuối
              ghi <b className="text-white">A/B/C/D</b>.
            </>
          ) : (
            <>
              Tài liệu <b className="text-white">định dạng bất kỳ</b>: đưa file cho AI
              kèm prompt bên dưới → AI trả về <b className="text-amber-200">quy tắc</b>{" "}
              → dán quy tắc vào đây → web tự tách đề.
            </>
          )}
        </div>

        {/* Bước lấy quy tắc (chỉ chế độ rules) */}
        {fmt === "rules" && (
          <div className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-white/5 p-3">
            <p className="text-sm font-bold text-amber-200">
              ① Lấy quy tắc từ AI
            </p>
            <p className="text-xs text-white/70">
              Mở ChatGPT/Gemini → đính kèm file tài liệu → dán prompt này → gửi. AI
              trả về một đoạn JSON quy tắc.
            </p>
            <button onClick={copyPrompt} className={`${LIGHT} self-start`}>
              {copied ? "✓ Đã copy prompt" : "📋 Copy prompt lấy quy tắc"}
            </button>
            <p className="mt-1 text-sm font-bold text-amber-200">② Dán quy tắc</p>
            <textarea
              value={rulesRaw}
              onChange={(e) => setRulesRaw(e.target.value)}
              placeholder='{ "questionRegex": "...", "answerRegex": "...", "correctMode": "key", ... }'
              className={`${INPUT} h-28 font-mono text-xs`}
            />
          </div>
        )}

        {/* Ô dán tài liệu + tải file */}
        {fmt === "rules" && (
          <p className="text-sm font-bold text-amber-200">③ Tài liệu gốc</p>
        )}
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Dán nội dung tài liệu vào đây…"
          className={`${INPUT} h-52 font-mono text-xs`}
        />
        {fileInfo && <p className="text-xs text-emerald-100">✓ {fileInfo}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <label className={`${GHOST} cursor-pointer px-4 py-2 text-sm`}>
            📎 Tải PDF / Word / CSV / văn bản
            <input
              type="file"
              accept=".pdf,.docx,.txt,.csv,.md,.tsv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {fmt !== "rules" && (
            <button
              onClick={() => setRaw(EXAMPLE[fmt])}
              className={`${GHOST} px-4 py-2 text-sm`}
            >
              Chèn ví dụ
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-amber-200/25 bg-amber-300/10 p-3">
          <p className="mb-2 text-sm font-bold text-amber-100">
            ✨ Xử lý tự động bằng AI trên Kashot
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => importWithAi("extract")}
              disabled={!raw.trim() || !!working}
              className={`${LIGHT} px-4 py-2 text-sm`}
            >
              Giữ nguyên bộ đề
            </button>
            <button
              onClick={() => importWithAi("generate")}
              disabled={!raw.trim() || !!working}
              className={`${GHOST} px-4 py-2 text-sm`}
            >
              Tạo câu hỏi
            </button>
            <button
              onClick={() => importWithAi("outline")}
              disabled={!raw.trim() || !!working}
              className={`${GHOST} px-4 py-2 text-sm`}
            >
              Tạo đề cương ôn
            </button>
          </div>
          <p className="mt-2 text-xs text-white/60">
            Câu AI chưa chắc đáp án sẽ được đánh dấu “Cần kiểm tra”.
          </p>
        </div>

        {aiPreview && (
          <section className="rounded-2xl border border-emerald-200/30 bg-emerald-300/10 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-emerald-100">
                  Bản nháp AI: {aiPreview.title}
                </p>
                <p className="text-xs text-white/65">
                  {aiPreview.questions.length} câu · tất cả đang chờ bạn kiểm tra
                </p>
              </div>
              <button
                onClick={() => setAiPreview(null)}
                className="text-sm text-white/65 underline"
              >
                Bỏ bản nháp
              </button>
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {aiPreview.questions.map((question, index) => (
                <article
                  key={`${index}-${question.text}`}
                  className="rounded-xl border border-white/15 bg-black/10 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {index + 1}. {question.text}
                    </p>
                    <span className="shrink-0 rounded-full bg-amber-300/20 px-2 py-0.5 text-[10px] text-amber-100">
                      {Math.round((question.confidence ?? 0) * 100)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-100/80">
                    Đúng:{" "}
                    {question.answers
                      .filter((answer) => answer.correct)
                      .map((answer) => answer.text)
                      .join(" / ")}
                  </p>
                </article>
              ))}
            </div>
            <button
              onClick={() => onSave(aiPreview)}
              className={`${LIGHT} mt-3`}
            >
              Lưu bản nháp để kiểm tra kỹ
            </button>
          </section>
        )}

        <button
          onClick={doImport}
          disabled={!raw.trim() || (fmt === "rules" && !rulesRaw.trim())}
          className={`${LIGHT} self-start`}
        >
          ✓ Chuyển thành bộ đề &amp; nhập
        </button>

        {working && (
          <p className="rounded-2xl border border-sky-200/30 bg-sky-400/20 px-4 py-3 text-sm font-semibold text-sky-50">
            ⏳ {working}
          </p>
        )}

        {error && (
          <p className="rounded-2xl border border-rose-200/40 bg-rose-500/80 px-4 py-3 text-sm font-semibold text-white backdrop-blur-md">
            ⚠ {error}
          </p>
        )}
      </div>
    </div>
  );
}
