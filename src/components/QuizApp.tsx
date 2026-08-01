"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  Edit3,
  FileUp,
  GraduationCap,
  LogIn,
  Plus,
  Presentation,
  Search,
  Shuffle,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import type { Quiz } from "@/lib/types";
import { ensureSeeded, localStore, type SavedQuiz } from "@/lib/store";
import { supabaseStore } from "@/lib/supabaseStore";
import { isSupabaseConfigured } from "@/lib/supabase";
import { onAuthChange, signOut, type User } from "@/lib/auth";
import {
  toExportJson,
  downloadText,
  slugify,
  totalSeconds,
  formatDuration,
  shuffleQuiz,
} from "@/lib/quizIo";
import Player from "./Player";
import QuizEditor from "./QuizEditor";
import HostGame from "./multiplayer/HostGame";
import PlayerGame from "./multiplayer/PlayerGame";
import AiCreator from "./AiCreator";
import AuthScreen from "./AuthScreen";
import ImportText from "./ImportText";
import LearningDashboard from "./LearningDashboard";
import ClassroomHub from "./ClassroomHub";
import {
  saveAssignmentAttempt,
  type Assignment,
} from "@/lib/classroom";
import { saveAttempt, type LearningMode } from "@/lib/learning";

type Mode =
  | "bank"
  | "editor"
  | "play"
  | "host"
  | "join"
  | "ai"
  | "auth"
  | "import"
  | "history"
  | "classes";

// Multiplayer cần Supabase (độc lập với đăng nhập).
const cloud = isSupabaseConfigured;

const GLASS =
  "border border-[#dfe3d5] bg-[#fbfaf5] shadow-[0_12px_36px_rgba(2,18,13,0.12)]";

export default function QuizApp() {
  const [mode, setMode] = useState<Mode>("bank");
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorInitial, setEditorInitial] = useState<SavedQuiz | null>(null);
  const [playQuiz, setPlayQuiz] = useState<Quiz | null>(null);
  const [hostQuiz, setHostQuiz] = useState<Quiz | null>(null);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [playMode, setPlayMode] = useState<LearningMode>("practice");
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [joinPin, setJoinPin] = useState("");

  // Chưa đăng nhập -> localStorage (khách). Đã đăng nhập -> Supabase (đề riêng).
  const store = user ? supabaseStore : localStore;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  // Theo dõi trạng thái đăng nhập.
  useEffect(() => {
    const sub = onAuthChange((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const pin = new URLSearchParams(window.location.search)
      .get("join")
      ?.replace(/\D/g, "")
      .slice(0, 6);
    if (pin?.length === 6) {
      window.setTimeout(() => {
        setJoinPin(pin);
        setMode("join");
      }, 0);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setQuizzes(await store.list());
    } catch {
      setQuizzes([]);
    }
    setLoading(false);
  }, [store]);

  // Nạp ngân hàng khi đã biết trạng thái đăng nhập.
  useEffect(() => {
    if (!authReady) return;
    (async () => {
      await ensureSeeded(store, user?.id ?? "guest");
      await refresh();
    })();
  }, [authReady, user, store, refresh]);

  const doLogout = async () => {
    await signOut();
  };

  const handleSave = async (quiz: Quiz & { id?: string }) => {
    await store.save(quiz);
    await refresh();
    setMode("bank");
  };

  const handleDelete = async (q: SavedQuiz) => {
    if (!window.confirm(`Xóa bộ đề "${q.title}"?`)) return;
    await store.remove(q.id);
    await refresh();
  };

  const handleDuplicate = async (q: SavedQuiz) => {
    await store.save({
      title: `${q.title} (bản sao)`,
      description: q.description,
      questions: q.questions,
      version: q.version,
      tags: q.tags,
    });
    await refresh();
    flash("Đã nhân bản đề ✓");
  };

  const handleExport = async (q: SavedQuiz) => {
    const json = toExportJson(q);
    try {
      await navigator.clipboard.writeText(json);
      flash("Đã copy JSON — dán để chia sẻ / nhập máy khác ✓");
    } catch {
      downloadText(`${slugify(q.title)}.json`, json);
      flash("Đã tải file JSON xuống ✓");
    }
  };

  const startPlay = (q: SavedQuiz) => {
    setActiveAssignment(null);
    setPlayQuiz(shuffleOn ? shuffleQuiz(q) : q);
    setMode("play");
  };

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("vi");
  const allTags = Array.from(new Set(quizzes.flatMap((quiz) => quiz.tags))).sort(
    (a, b) => a.localeCompare(b, "vi"),
  );
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch =
      !normalizedSearch ||
      `${quiz.title} ${quiz.description} ${quiz.tags.join(" ")}`
        .toLocaleLowerCase("vi")
        .includes(normalizedSearch);
    return matchesSearch && (tagFilter === "all" || quiz.tags.includes(tagFilter));
  });
  const totalQuestionCount = quizzes.reduce(
    (sum, quiz) => sum + quiz.questions.length,
    0,
  );
  const reviewCount = quizzes.reduce(
    (sum, quiz) =>
      sum + quiz.questions.filter((question) => question.status === "needs_review").length,
    0,
  );

  if (mode === "play" && playQuiz) {
    return (
      <Player
        quiz={playQuiz}
        mode={playMode}
        onComplete={(results, score) => {
          saveAttempt(playQuiz, playMode, results, score);
          if (activeAssignment) {
            saveAssignmentAttempt({
              assignment: activeAssignment,
              quiz: playQuiz,
              results,
              score,
            }).catch(() =>
              flash("Đã lưu trên máy; chưa đồng bộ được kết quả lên lớp."),
            );
          }
        }}
        onExit={() => setMode("bank")}
      />
    );
  }

  if (mode === "host" && hostQuiz) {
    return <HostGame quiz={hostQuiz} onExit={() => setMode("bank")} />;
  }

  if (mode === "join") {
    return <PlayerGame initialPin={joinPin} onExit={() => setMode("bank")} />;
  }

  if (mode === "ai") {
    return <AiCreator onSave={handleSave} onCancel={() => setMode("bank")} />;
  }

  if (mode === "import") {
    return <ImportText onSave={handleSave} onCancel={() => setMode("bank")} />;
  }

  if (mode === "auth") {
    return (
      <AuthScreen
        onDone={() => setMode("bank")}
        onCancel={() => setMode("bank")}
      />
    );
  }

  if (mode === "history") {
    return <LearningDashboard onBack={() => setMode("bank")} />;
  }

  if (mode === "classes" && user) {
    return (
      <ClassroomHub
        userId={user.id}
        quizzes={quizzes}
        onPlayAssignment={async (assignment: Assignment) => {
          const quiz = await supabaseStore.get(assignment.quiz_id);
          if (!quiz) throw new Error("Không tìm thấy bộ đề của bài giao.");
          setPlayMode(assignment.mode);
          setActiveAssignment(assignment);
          setPlayQuiz(quiz);
          setMode("play");
        }}
        onBack={() => setMode("bank")}
      />
    );
  }

  if (mode === "editor") {
    return (
      <QuizEditor
        initial={editorInitial}
        onSave={handleSave}
        onCancel={() => setMode("bank")}
      />
    );
  }

  // mode === "bank"
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-4 text-slate-900 sm:p-7 lg:p-10">
      <div className="grid gap-7 rounded-[2rem] border border-white/10 bg-[#f3efdf] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] sm:p-8 lg:grid-cols-[1fr_380px] lg:items-center lg:p-10">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-[#173c31] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#f8d46b]">
            <Sparkles size={13} aria-hidden /> Kashot Workspace
          </p>
          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-[#102b23] sm:text-5xl">
            Hôm nay bạn muốn học gì?
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Tạo đề từ tài liệu, tổ chức lớp học và biến mỗi lần ôn tập thành một phiên học hiệu quả.</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full border border-[#d6d7c8] bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600">
              {user ? `Đã đồng bộ · ${user.email}` : "Lưu riêng trên thiết bị này"}
            </span>
            {cloud &&
              (user ? (
                <button
                  onClick={doLogout}
                  className="text-xs font-semibold text-slate-500 underline underline-offset-4 hover:text-slate-900"
                >
                  Đăng xuất
                </button>
              ) : (
                <button
                  onClick={() => setMode("auth")}
                  className="text-xs font-bold text-emerald-800 underline underline-offset-4 hover:text-emerald-950"
                >
                  <span className="inline-flex items-center gap-1.5"><LogIn size={14} aria-hidden />Đăng nhập giáo viên</span>
                </button>
              ))}
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 rounded-3xl bg-[#102b23] p-3 shadow-xl sm:grid-cols-2">
          {cloud && (
            <button
              onClick={() => setMode("join")}
              className="rounded-2xl bg-[#f7ce62] px-4 py-3 text-sm font-extrabold text-[#173126] transition hover:-translate-y-0.5 hover:bg-[#ffdb78] active:scale-95"
            >
              <span className="inline-flex items-center justify-center gap-2"><Users size={18} aria-hidden />Tham gia PIN</span>
            </button>
          )}
          <button
            onClick={() => setMode("ai")}
            className="rounded-2xl bg-[#d7f37b] px-4 py-3 text-sm font-extrabold text-[#173126] transition hover:-translate-y-0.5 hover:bg-[#e4fa9b] active:scale-95"
          >
            <span className="inline-flex items-center justify-center gap-2"><Bot size={18} aria-hidden />Tạo bằng AI</span>
          </button>
          <button
            onClick={() => setMode("import")}
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/20 active:scale-95"
          >
            <span className="inline-flex items-center justify-center gap-2"><FileUp size={18} aria-hidden />Nhập tài liệu</span>
          </button>
          <button
            onClick={() => {
              setEditorInitial(null);
              setMode("editor");
            }}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-[#173126] transition hover:-translate-y-0.5 hover:bg-[#f7f4e9] active:scale-95"
          >
            <span className="inline-flex items-center justify-center gap-2"><Plus size={18} aria-hidden />Tạo đề</span>
          </button>
        </div>
      </div>

      <section className="grid grid-cols-3 gap-3" aria-label="Tổng quan ngân hàng đề">
        {[
          { Icon: BookOpen, value: quizzes.length, label: "Bộ đề" },
          { Icon: CheckCircle2, value: totalQuestionCount, label: "Câu hỏi" },
          { Icon: BarChart3, value: reviewCount, label: "Cần duyệt" },
        ].map(({ Icon, value, label }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-white backdrop-blur-md sm:p-4">
            <Icon size={20} className="mb-3 text-[#d7f37b]" aria-hidden />
            <p className="text-2xl font-extrabold">{value}</p>
            <p className="text-xs font-semibold text-white/65">{label}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setMode("history")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/20">
          <BarChart3 size={17} aria-hidden /> Tiến độ học
        </button>
        {user && cloud && (
          <button onClick={() => setMode("classes")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/20">
            <GraduationCap size={18} aria-hidden /> Lớp học &amp; giao bài
          </button>
        )}
        <button onClick={() => setShuffleOn((v) => !v)} aria-pressed={shuffleOn} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${shuffleOn ? "border-[#d7f37b] bg-[#d7f37b] text-[#173126]" : "border-white/15 bg-white/10 text-white/90 hover:bg-white/20"}`}>
          <Shuffle size={17} aria-hidden /> Trộn câu: {shuffleOn ? "Bật" : "Tắt"}
        </button>
      </div>

      <div className={`rounded-[1.5rem] p-4 ${GLASS}`}>
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
          Cách sử dụng bộ đề
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "learn" as LearningMode, label: "Học", Icon: BookOpen },
            { value: "practice" as LearningMode, label: "Ôn", Icon: Brain },
            { value: "exam" as LearningMode, label: "Thi", Icon: ClipboardCheck },
          ].map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setPlayMode(value)}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                playMode === value
                  ? "border-[#173c31] bg-[#173c31] text-white shadow-md"
                  : "border-[#dfe3d5] bg-white text-slate-600 hover:border-[#aeb8a8] hover:text-slate-900"
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2"><Icon size={17} aria-hidden />{label}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-[1.5rem] border border-white/10 bg-white/10 p-3 backdrop-blur-md" aria-label="Tìm và lọc bộ đề">
        <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
            <span className="sr-only">Tìm bộ đề</span>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm theo tên, mô tả hoặc chủ đề…" className="min-h-12 w-full rounded-xl border border-transparent bg-white pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#f5c95f]" />
          </label>
          <label>
            <span className="sr-only">Lọc theo chủ đề</span>
            <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="min-h-12 w-full rounded-xl border border-transparent bg-white px-3 text-sm font-semibold text-slate-700 focus:border-[#f5c95f]">
              <option value="all">Tất cả chủ đề</option>
              {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <p className="py-10 text-center text-white/70">Đang tải…</p>
      ) : quizzes.length === 0 ? (
        <div
          className={`flex flex-col items-center gap-3 rounded-3xl p-8 text-center ${GLASS}`}
        >
          <p className="text-slate-600">Chưa có bộ đề nào.</p>
          <button
            onClick={() => {
              setEditorInitial(null);
              setMode("editor");
            }}
            className="rounded-2xl border border-white/50 bg-white/85 px-6 py-3 font-extrabold text-emerald-900 shadow-lg backdrop-blur-md transition hover:bg-white"
          >
            + Tạo bộ đề đầu tiên
          </button>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className={`flex flex-col items-center gap-3 rounded-3xl p-8 text-center ${GLASS}`}>
          <Search size={28} className="text-slate-400" aria-hidden />
          <p className="font-bold text-slate-800">Không tìm thấy bộ đề phù hợp</p>
          <button onClick={() => { setSearchQuery(""); setTagFilter("all"); }} className="text-sm font-semibold text-emerald-800 underline underline-offset-4">Xóa bộ lọc</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredQuizzes.map((q) => (
            <div
              key={q.id}
              className={`flex flex-col gap-4 rounded-[1.75rem] p-5 transition hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(2,18,13,0.2)] ${GLASS}`}
            >
              <div>
                <h2 className="text-xl font-extrabold tracking-[-0.025em] text-[#173c31]">{q.title}</h2>
                {q.description && (
                  <p className="mt-1 text-sm leading-6 text-slate-600">{q.description}</p>
                )}
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {q.questions.length} câu hỏi ·{" "}
                  {formatDuration(totalSeconds(q))}
                </p>
                {(q.tags.length > 0 ||
                  q.questions.some((question) => question.status === "needs_review")) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#dfe3d5] bg-[#f2f3eb] px-2.5 py-1 text-xs font-semibold text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {q.questions.some(
                      (question) => question.status === "needs_review",
                    ) && (
                      <span className="rounded-full border border-amber-200/40 bg-amber-300/20 px-2 py-0.5 text-xs font-semibold text-amber-100">
                        Cần kiểm tra
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Hàng nút chính */}
              <div className="flex gap-2">
                <button
                  onClick={() => startPlay(q)}
                  className="flex-1 rounded-xl bg-[#173c31] px-4 py-2.5 font-extrabold text-white shadow-md transition hover:bg-[#205040] active:scale-95"
                >
                  <span className="inline-flex items-center justify-center gap-2"><Presentation size={17} aria-hidden />Bắt đầu</span>
                </button>
                <button
                  onClick={() => {
                    setEditorInitial(q);
                    setMode("editor");
                  }}
                  className="rounded-xl border border-[#d6dcd1] bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-[#9ba99d] hover:bg-[#f5f6f0]"
                >
                  <span className="inline-flex items-center gap-2"><Edit3 size={16} aria-hidden />Sửa</span>
                </button>
                <button
                  onClick={() => handleDelete(q)}
                  className="rounded-xl border border-rose-200/30 bg-rose-500/20 px-4 py-2 font-semibold text-rose-100 backdrop-blur-md transition hover:bg-rose-500/35"
                >
                  <Trash2 size={17} aria-hidden />
                </button>
              </div>

              {/* Hàng nút phụ */}
              <div className="flex flex-wrap gap-2 text-sm">
                {cloud && (
                  <button
                    onClick={() => {
                      setHostQuiz(q);
                      setMode("host");
                    }}
                    className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 font-semibold text-amber-900 transition hover:bg-amber-200"
                  >
                    <span className="inline-flex items-center gap-2"><Users size={16} aria-hidden />Chủ trì live</span>
                  </button>
                )}
                <button
                  onClick={() => handleDuplicate(q)}
                  className="rounded-lg border border-[#dfe3d5] bg-[#f2f3eb] px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-[#e7eadf] hover:text-slate-900"
                >
                  <span className="inline-flex items-center gap-2"><Copy size={15} aria-hidden />Nhân bản</span>
                </button>
                <button
                  onClick={() => handleExport(q)}
                  className="rounded-lg border border-[#dfe3d5] bg-[#f2f3eb] px-3 py-1.5 font-semibold text-slate-600 transition hover:bg-[#e7eadf] hover:text-slate-900"
                >
                  <span className="inline-flex items-center gap-2"><Download size={15} aria-hidden />Xuất JSON</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Thông báo nổi */}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-full border border-white/30 bg-slate-900/80 px-5 py-2.5 text-sm font-semibold text-white shadow-xl backdrop-blur-xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
