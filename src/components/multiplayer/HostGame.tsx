"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Quiz } from "@/lib/types";
import {
  answeredCount,
  createRoom,
  deleteRoom,
  getClientId,
  listPlayers,
  liveError,
  nextQuestion,
  revealQuestion,
  startGame,
  subscribePlayers,
  subscribeRoom,
  type Player,
  type Room,
} from "@/lib/multiplayer";
import { sfx } from "@/lib/sound";
import { GLASS, TILE, PlayerChips, Leaderboard } from "./mpUi";

export default function HostGame({
  quiz,
  onExit,
}: {
  quiz: Quiz;
  onExit: () => void;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answered, setAnswered] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const revealedRef = useRef(false);
  const prevCountRef = useRef(0);
  const endedRef = useRef(false);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Tạo phòng + đăng ký realtime (chỉ 1 lần).
  useEffect(() => {
    let chRoom: ReturnType<typeof subscribeRoom> | null = null;
    let chPlayers: ReturnType<typeof subscribePlayers> | null = null;
    (async () => {
      try {
        const r = await createRoom(quiz, getClientId());
        setRoom(r);
        setPlayers(await listPlayers(r.id));
        prevCountRef.current = 0;
        chRoom = subscribeRoom(r.id, (nr) => setRoom(nr));
        chPlayers = subscribePlayers(r.id, async () => {
          const list = await listPlayers(r.id);
          if (list.length > prevCountRef.current) sfx.join();
          prevCountRef.current = list.length;
          setPlayers(list);
        });
      } catch (e) {
        setError(liveError(e).message);
      }
    })();
    return () => {
      chRoom?.unsubscribe();
      chPlayers?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đồng hồ + tự hiện đáp án khi hết giờ (host là trọng tài).
  useEffect(() => {
    if (!room || room.status !== "question" || !room.question_started_at) return;
    revealedRef.current = false;
    const q = room.quiz.questions[room.current_index];
    const deadline = Date.parse(room.question_started_at) + q.timeLimit * 1000;

    const tick = setInterval(async () => {
      const left = Math.max(0, deadline - Date.now());
      setSecondsLeft(Math.ceil(left / 1000));
      try {
        setAnswered(await answeredCount(room.id, room.current_index));
      } catch {
        /* ignore */
      }
      if (left <= 0 && !revealedRef.current) {
        revealedRef.current = true;
        await revealQuestion(room.id);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [room]);

  // Âm thanh kết thúc.
  useEffect(() => {
    if (room?.status === "ended" && !endedRef.current) {
      endedRef.current = true;
      sfx.end();
    }
  }, [room?.status]);

  const doStart = useCallback(async () => {
    if (!room) return;
    try {
      sfx.start();
      await startGame(room.id);
    } catch (e) {
      setError(liveError(e).message);
    }
  }, [room]);

  const doClose = useCallback(async () => {
    const r = roomRef.current;
    if (r) {
      try {
        await deleteRoom(r.id);
      } catch {
        /* ignore */
      }
    }
    onExit();
  }, [onExit]);

  const doNext = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    await nextQuestion(r.id, r.current_index, r.quiz.questions.length);
  }, []);

  const doReveal = useCallback(async () => {
    const r = roomRef.current;
    if (r) await revealQuestion(r.id);
  }, []);

  if (error) {
    return (
      <Center>
        <div className={`rounded-3xl p-6 text-center ${GLASS}`}>
          <p className="mb-4 font-semibold text-rose-200">⚠ {error}</p>
          <GhostBtn onClick={onExit}>← Về ngân hàng đề</GhostBtn>
        </div>
      </Center>
    );
  }

  if (!room) {
    return (
      <Center>
        <p className="text-white/70">Đang tạo phòng…</p>
      </Center>
    );
  }

  const total = room.quiz.questions.length;

  // ---- LOBBY ----
  if (room.status === "lobby") {
    return (
      <Center>
        <div className={`flex flex-col items-center gap-5 rounded-[2rem] p-8 ${GLASS}`}>
          <p className="text-white/70">Mã tham gia (PIN)</p>
          <p className="text-6xl font-black tracking-[0.2em] text-amber-200">
            {room.pin}
          </p>
          <p className="text-sm text-white/60">
            Vào <span className="font-semibold text-white">web này</span> → “Tham
            gia PIN” → nhập mã trên.
          </p>
          <div className="w-full">
            <p className="mb-2 text-center text-sm font-semibold text-white/80">
              Người chơi ({players.length})
            </p>
            <PlayerChips players={players} />
          </div>
          <div className="flex w-full gap-2">
            <LightBtn onClick={doStart} disabled={players.length === 0} className="flex-1">
              ▶ Bắt đầu
            </LightBtn>
            <GhostBtn onClick={doClose}>Hủy</GhostBtn>
          </div>
          {players.length === 0 && (
            <p className="text-xs text-white/50">Chờ ít nhất 1 người vào phòng.</p>
          )}
        </div>
      </Center>
    );
  }

  // ---- ENDED ----
  if (room.status === "ended") {
    return (
      <Center>
        <h1 className="text-3xl font-black text-white drop-shadow-sm">
          🏁 Kết thúc!
        </h1>
        <Leaderboard players={players} />
        <GhostBtn onClick={doClose}>⌂ Về ngân hàng đề</GhostBtn>
      </Center>
    );
  }

  // ---- QUESTION / REVEAL (host view) ----
  const q = room.quiz.questions[room.current_index];
  const revealed = room.status === "reveal";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 text-white sm:p-6">
      <div className="flex items-center justify-between text-base font-semibold">
        <span className={`rounded-full border border-white/25 bg-white/15 px-3 py-1 backdrop-blur-md`}>
          Câu {room.current_index + 1}/{total}
        </span>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border border-white/25 bg-white/15 px-3 py-1 backdrop-blur-md`}>
            {revealed ? "Đáp án" : `⏱ ${secondsLeft}s`} · {answered} đã trả lời
          </span>
          <button
            onClick={doClose}
            aria-label="Đóng phòng"
            className="grid h-8 w-8 place-items-center rounded-full border border-rose-200/30 bg-rose-500/20 text-rose-100 backdrop-blur-md transition hover:bg-rose-500/35"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        key={room.current_index}
        className="anim-fade-up rounded-3xl border border-white/50 bg-white/75 px-5 py-7 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
      >
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{q.text}</h2>
      </div>

      <div key={`ans-${room.current_index}`} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {q.answers.map((a, i) => {
          const t = TILE[i % TILE.length];
          const good =
            revealed && room.revealed_correct_indexes?.includes(i);
          return (
            <div
              key={i}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`anim-fade-up flex items-center gap-4 rounded-[1.5rem] border px-5 py-5 text-xl font-semibold backdrop-blur-md ${
                good
                  ? "border-emerald-200/70 bg-emerald-400/30 ring-2 ring-emerald-200/60"
                  : `border-white/25 ${t.tint} ${revealed ? "opacity-45" : ""}`
              }`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-white/25 font-black">
                {t.label}
              </span>
              <span className="flex-1">{a.text}</span>
              {good && <span className="text-2xl">✓</span>}
            </div>
          );
        })}
      </div>

      {revealed && (
        <>
          <p className="text-center text-sm font-semibold text-white/70">
            Bảng xếp hạng
          </p>
          <Leaderboard players={players} top={5} />
        </>
      )}

      <div className="flex justify-center gap-2">
        {!revealed && <GhostBtn onClick={doReveal}>Hiện đáp án ngay</GhostBtn>}
        {revealed && (
          <LightBtn onClick={doNext}>
            {room.current_index + 1 >= total ? "Kết thúc →" : "Câu tiếp →"}
          </LightBtn>
        )}
      </div>
    </div>
  );
}

/* --- nút & layout nhỏ dùng chung trong file --- */
function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
      {children}
    </div>
  );
}
function LightBtn({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`rounded-2xl border border-white/50 bg-white/85 px-6 py-3 font-extrabold text-emerald-900 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
function GhostBtn({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`rounded-2xl border border-white/25 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-md transition hover:bg-white/20 ${className}`}
    >
      {children}
    </button>
  );
}
