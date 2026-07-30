"use client";

import { useCallback, useEffect, useState } from "react";
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
import { saveAttempt, type LearningMode } from "@/lib/learning";

type Mode =
  | "bank"
  | "editor"
  | "play"
  | "host"
  | "join"
  | "ai"
  | "auth"
  | "import";

// Multiplayer cần Supabase (độc lập với đăng nhập).
const cloud = isSupabaseConfigured;

const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";

export default function QuizApp() {
  const [mode, setMode] = useState<Mode>("bank");
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorInitial, setEditorInitial] = useState<SavedQuiz | null>(null);
  const [playQuiz, setPlayQuiz] = useState<Quiz | null>(null);
  const [hostQuiz, setHostQuiz] = useState<Quiz | null>(null);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [playMode, setPlayMode] = useState<LearningMode>("practice");
  const [toast, setToast] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

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
      if (!user) await ensureSeeded(localStore);
      await refresh();
    })();
  }, [authReady, user, refresh]);

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
    setPlayQuiz(shuffleOn ? shuffleQuiz(q) : q);
    setMode("play");
  };

  if (mode === "play" && playQuiz) {
    return (
      <Player
        quiz={playQuiz}
        mode={playMode}
        onComplete={(results, score) => {
          saveAttempt(playQuiz, playMode, results, score);
        }}
        onExit={() => setMode("bank")}
      />
    );
  }

  if (mode === "host" && hostQuiz) {
    return <HostGame quiz={hostQuiz} onExit={() => setMode("bank")} />;
  }

  if (mode === "join") {
    return <PlayerGame onExit={() => setMode("bank")} />;
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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4 text-white sm:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black drop-shadow-sm sm:text-4xl">
            Ngân hàng đề
          </h1>
          <p className="text-white/70">Chọn một bộ đề để chơi hoặc chỉnh sửa.</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs text-white/70 backdrop-blur-md">
              {user ? `☁ ${user.email}` : "📱 Lưu trên máy này (khách)"}
            </span>
            {cloud &&
              (user ? (
                <button
                  onClick={doLogout}
                  className="text-xs text-white/70 underline underline-offset-2 hover:text-white"
                >
                  Đăng xuất
                </button>
              ) : (
                <button
                  onClick={() => setMode("auth")}
                  className="text-xs font-semibold text-amber-200 underline underline-offset-2 hover:text-amber-100"
                >
                  👤 Đăng nhập giáo viên
                </button>
              ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {cloud && (
            <button
              onClick={() => setMode("join")}
              className="rounded-2xl border border-amber-200/50 bg-amber-300/90 px-4 py-3 font-extrabold text-amber-950 shadow-lg backdrop-blur-md transition hover:bg-amber-300 active:scale-95"
            >
              🔑 Tham gia PIN
            </button>
          )}
          <button
            onClick={() => setMode("ai")}
            className="rounded-2xl border border-amber-200/50 bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-3 font-extrabold text-emerald-950 shadow-lg backdrop-blur-md transition hover:brightness-110 active:scale-95"
          >
            ✨ Tạo bằng AI
          </button>
          <button
            onClick={() => setMode("import")}
            className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
          >
            📄 Nhập tài liệu
          </button>
          <button
            onClick={() => {
              setEditorInitial(null);
              setMode("editor");
            }}
            className="rounded-2xl border border-white/50 bg-white/85 px-4 py-3 font-extrabold text-emerald-900 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95"
          >
            + Tạo đề
          </button>
        </div>
      </div>

      {/* Toggle trộn câu hỏi */}
      <button
        onClick={() => setShuffleOn((v) => !v)}
        className={`flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-md transition ${
          shuffleOn
            ? "border-emerald-200/50 bg-emerald-400/25 text-emerald-50"
            : "border-white/25 bg-white/10 text-white/80 hover:bg-white/20"
        }`}
      >
        🔀 Trộn câu hỏi khi chơi: {shuffleOn ? "BẬT" : "TẮT"}
      </button>

      <div className={`rounded-2xl p-3 ${GLASS}`}>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/60">
          Cách sử dụng bộ đề
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["learn", "📖 Học"],
              ["practice", "🧠 Ôn"],
              ["exam", "📝 Thi"],
            ] as [LearningMode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPlayMode(value)}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                playMode === value
                  ? "border-amber-200/60 bg-amber-300/25 text-amber-50"
                  : "border-white/20 bg-white/5 text-white/75 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-white/70">Đang tải…</p>
      ) : quizzes.length === 0 ? (
        <div
          className={`flex flex-col items-center gap-3 rounded-3xl p-8 text-center ${GLASS}`}
        >
          <p className="text-white/80">Chưa có bộ đề nào.</p>
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
      ) : (
        <div className="flex flex-col gap-3">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className={`flex flex-col gap-3 rounded-3xl p-4 ${GLASS}`}
            >
              <div>
                <h2 className="text-xl font-bold">{q.title}</h2>
                {q.description && (
                  <p className="text-sm text-white/70">{q.description}</p>
                )}
                <p className="mt-1 text-xs text-white/60">
                  {q.questions.length} câu hỏi ·{" "}
                  {formatDuration(totalSeconds(q))}
                </p>
                {(q.tags.length > 0 ||
                  q.questions.some((question) => question.status === "needs_review")) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {q.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs text-white/75"
                      >
                        {tag}
                      </span>
                    ))}
                    {q.questions.some(
                      (question) => question.status === "needs_review",
                    ) && (
                      <span className="rounded-full border border-amber-200/40 bg-amber-300/20 px-2 py-0.5 text-xs font-semibold text-amber-100">
                        ⚠ Cần kiểm tra
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Hàng nút chính */}
              <div className="flex gap-2">
                <button
                  onClick={() => startPlay(q)}
                  className="flex-1 rounded-xl border border-white/50 bg-white/85 px-4 py-2 font-extrabold text-emerald-900 shadow backdrop-blur-md transition hover:bg-white active:scale-95"
                >
                  ▶ Chơi
                </button>
                <button
                  onClick={() => {
                    setEditorInitial(q);
                    setMode("editor");
                  }}
                  className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
                >
                  ✎ Sửa
                </button>
                <button
                  onClick={() => handleDelete(q)}
                  className="rounded-xl border border-rose-200/30 bg-rose-500/20 px-4 py-2 font-semibold text-rose-100 backdrop-blur-md transition hover:bg-rose-500/35"
                >
                  🗑
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
                    className="rounded-lg border border-amber-200/40 bg-amber-300/20 px-3 py-1.5 font-semibold text-amber-100 backdrop-blur-md transition hover:bg-amber-300/35"
                  >
                    🎉 Chủ trì (nhiều người)
                  </button>
                )}
                <button
                  onClick={() => handleDuplicate(q)}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 font-semibold text-white/85 backdrop-blur-md transition hover:bg-white/15"
                >
                  ⧉ Nhân bản
                </button>
                <button
                  onClick={() => handleExport(q)}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 font-semibold text-white/85 backdrop-blur-md transition hover:bg-white/15"
                >
                  ⬆ Xuất JSON
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
