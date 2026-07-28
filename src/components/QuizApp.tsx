"use client";

import { useCallback, useEffect, useState } from "react";
import type { Quiz } from "@/lib/types";
import { ensureSeeded, localStore, type SavedQuiz } from "@/lib/store";
import Player from "./Player";
import QuizEditor from "./QuizEditor";

// Đổi 1 dòng này sang adapter Supabase ở M2b.
const store = localStore;

type Mode = "bank" | "editor" | "play";

const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";

export default function QuizApp() {
  const [mode, setMode] = useState<Mode>("bank");
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorInitial, setEditorInitial] = useState<SavedQuiz | null>(null);
  const [playQuiz, setPlayQuiz] = useState<SavedQuiz | null>(null);

  const refresh = useCallback(async () => {
    setQuizzes(await store.list());
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await ensureSeeded(store);
      await refresh();
    })();
  }, [refresh]);

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

  if (mode === "play" && playQuiz) {
    return <Player quiz={playQuiz} onExit={() => setMode("bank")} />;
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
        </div>
        <button
          onClick={() => {
            setEditorInitial(null);
            setMode("editor");
          }}
          className="shrink-0 rounded-2xl border border-white/50 bg-white/85 px-4 py-3 font-extrabold text-violet-700 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95"
        >
          + Tạo đề
        </button>
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
            className="rounded-2xl border border-white/50 bg-white/85 px-6 py-3 font-extrabold text-violet-700 shadow-lg backdrop-blur-md transition hover:bg-white"
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
                  {q.questions.length} câu hỏi
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPlayQuiz(q);
                    setMode("play");
                  }}
                  className="flex-1 rounded-xl border border-white/50 bg-white/85 px-4 py-2 font-extrabold text-violet-700 shadow backdrop-blur-md transition hover:bg-white active:scale-95"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
