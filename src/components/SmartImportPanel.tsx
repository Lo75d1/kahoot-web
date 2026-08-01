"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Sparkles, UploadCloud, X } from "lucide-react";
import type { Quiz } from "@/lib/types";
import { parseCommonQuizText, parseCsv, parseMarkerText } from "@/lib/textFormat";

type Intent = "extract" | "generate" | "outline";

const ACCEPT = ".pdf,.docx,.txt,.csv,.md,.tsv,.png,.jpg,.jpeg,.webp,.gif";

async function readJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error(response.ok ? "Máy chủ trả về dữ liệu không hợp lệ." : `Máy chủ lỗi (${response.status}). Vui lòng thử lại.`); }
}

export default function SmartImportPanel({ onSave }: { onSave: (quiz: Quiz) => Promise<void> | void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [intent, setIntent] = useState<Intent>("extract");
  const [dragging, setDragging] = useState(false);
  const [working, setWorking] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Quiz | null>(null);
  const [fileMeta, setFileMeta] = useState("");
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/ai/quiz", { method: "GET" })
      .then((response) => response.json())
      .then((result: { configured?: boolean }) => setAiConfigured(Boolean(result.configured)))
      .catch(() => setAiConfigured(null));
  }, []);

  const chooseFile = async (next: File) => {
    setFile(next); setPreview(null); setError(null); setFileMeta(next.name);
    if (next.type.startsWith("image/")) { setSource(""); setFileMeta(`${next.name} · AI sẽ đọc hình ảnh`); return; }
    setWorking("Đang đọc tài liệu…");
    try {
      if (/\.(txt|csv|tsv|md)$/i.test(next.name)) {
        setSource(await next.text()); setFileMeta(`${next.name} · đã đọc nội dung`);
      } else {
        const form = new FormData(); form.set("file", next);
        const response = await fetch("/api/documents/extract", { method: "POST", body: form });
        const result = await readJson(response);
        if (!response.ok || typeof result.text !== "string") throw new Error(String(result.error || "Không đọc được tài liệu."));
        setSource(result.text);
        setFileMeta(`${next.name}${result.pages ? ` · ${result.pages} trang` : ""}${result.truncated ? " · nội dung đã rút gọn" : ""}`);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không đọc được tài liệu."); }
    finally { setWorking(""); }
  };

  const localFallback = () => {
    if (!source.trim()) return null;
    const parsers = file?.name.toLowerCase().endsWith(".csv")
      ? [parseCsv, parseCommonQuizText, parseMarkerText]
      : [parseMarkerText, parseCommonQuizText, parseCsv];
    for (const parser of parsers) { try { return parser(source); } catch { /* thử cấu trúc kế tiếp */ } }
    return null;
  };

  const analyze = async () => {
    if (!file && !source.trim()) { setError("Thả tài liệu hoặc dán nội dung trước khi phân tích."); return; }
    setError(null); setPreview(null); setWorking("AI đang nhận diện câu hỏi, đáp án và cấu trúc đề…");
    try {
      let response: Response;
      const directVision = file && (file.type.startsWith("image/") || (!source.trim() && file.type === "application/pdf"));
      if (directVision) {
        const form = new FormData(); form.set("file", file); form.set("mode", intent); form.set("count", "20");
        response = await fetch("/api/ai/quiz-file", { method: "POST", body: form });
      } else {
        response = await fetch("/api/ai/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, mode: intent, count: 20 }) });
      }
      const result = await readJson(response) as unknown as Quiz & { error?: string; code?: string };
      if (!response.ok) {
        if (result.code === "AI_NOT_CONFIGURED") {
          const parsed = localFallback();
          if (parsed) { setPreview(parsed); setError("AI máy chủ chưa được cấu hình; hệ thống đã nhập nhanh bằng bộ phân tích cấu trúc có sẵn."); return; }
          throw new Error("Tính năng AI chưa được cấu hình trên máy chủ. Cần thêm OPENAI_API_KEY trên Vercel để phân tích tài liệu tự do hoặc ảnh scan.");
        }
        throw new Error(result.error || "AI chưa phân tích được tài liệu này.");
      }
      setPreview(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không phân tích được tài liệu."); }
    finally { setWorking(""); }
  };

  const clear = () => { setFile(null); setSource(""); setFileMeta(""); setPreview(null); setError(null); if (inputRef.current) inputRef.current.value = ""; };

  return <section className="rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_24px_80px_rgba(0,70,34,0.2)] sm:p-7" aria-labelledby="smart-import-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#018f41]"><Sparkles size={15}/>AI nhập đề</p><h2 id="smart-import-title" className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">Một ô — từ tài liệu thành bộ đề</h2><p className="mt-1 text-sm text-slate-500">Kéo thả file hoặc dán nội dung. Hệ thống tự đọc, nhận diện câu hỏi–đáp án và tạo bản nháp để bạn duyệt.</p></div>
      <div className="flex flex-wrap gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#01823c]">PDF · Word · ảnh · CSV · văn bản</span>{aiConfigured === false && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">AI cần cấu hình trên máy chủ</span>}</div>
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); const next=e.dataTransfer.files[0]; if(next) chooseFile(next); }} onClick={() => inputRef.current?.click()} className={`group relative flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-[#f58220] bg-orange-50" : "border-emerald-300 bg-emerald-50/55 hover:border-[#018f41] hover:bg-emerald-50"}`}>
        <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { const next=e.target.files?.[0]; if(next) chooseFile(next); }}/>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#018f41] text-white shadow-lg"><UploadCloud size={28}/></span>
        <p className="mt-4 text-base font-extrabold text-slate-900">Thả tài liệu vào đây</p><p className="mt-1 text-sm text-slate-500">hoặc nhấn để chọn file, tối đa 12 MB</p>
        {fileMeta && <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#01823c] shadow-sm"><FileText size={15}/>{fileMeta}<button type="button" aria-label="Bỏ tệp" onClick={(e) => { e.stopPropagation(); clear(); }} className="ml-1 rounded-full p-1 hover:bg-slate-100"><X size={14}/></button></div>}
      </div>
      <div className="flex flex-col">
        <label className="text-sm font-extrabold text-slate-700">Hoặc dán nội dung đề/tài liệu<textarea value={source} onChange={(e) => { setSource(e.target.value); setPreview(null); }} onClick={(e) => e.stopPropagation()} placeholder="Ví dụ: Câu 1… A… B… Đáp án…\nKhông cần định dạng chuẩn." className="mt-2 min-h-36 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-normal text-slate-900 outline-none focus:border-[#018f41] focus:bg-white"/></label>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">{([['extract','Nhập nguyên đề'],['generate','Tạo câu hỏi'],['outline','Đề cương']] as [Intent,string][]).map(([value,label]) => <button key={value} onClick={() => setIntent(value)} className={`min-h-10 rounded-lg px-2 text-xs font-bold transition ${intent===value?'bg-white text-[#01823c] shadow-sm':'text-slate-500 hover:text-slate-800'}`}>{label}</button>)}</div>
        <button onClick={analyze} disabled={!!working || (!file && !source.trim())} className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f58220] px-5 font-extrabold text-white shadow-md transition hover:bg-[#dc6d12] disabled:cursor-not-allowed disabled:opacity-45">{working ? <><Loader2 size={18} className="animate-spin"/>Đang xử lý…</> : <><Sparkles size={18}/>Phân tích & tạo bộ đề</>}</button>
      </div>
    </div>

    {error && <p role="alert" className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${preview ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{error}</p>}
    {preview && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 text-[#018f41]"/><div><p className="font-black text-[#01823c]">{preview.title}</p><p className="text-sm text-slate-600">Đã nhận diện {preview.questions.length} câu · lưu dưới dạng bản nháp cần duyệt</p></div></div><button onClick={() => onSave(preview)} className="rounded-xl bg-[#018f41] px-4 py-3 text-sm font-extrabold text-white">Lưu vào ngân hàng đề</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{preview.questions.slice(0,4).map((q,i)=><div key={`${i}-${q.text}`} className="rounded-xl bg-white p-3 text-sm text-slate-700"><b>{i+1}.</b> {q.text}</div>)}</div>{preview.questions.length>4&&<p className="mt-2 text-xs text-slate-500">Và {preview.questions.length-4} câu khác…</p>}</div>}
  </section>;
}
