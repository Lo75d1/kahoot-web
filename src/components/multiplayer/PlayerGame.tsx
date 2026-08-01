"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getClientId,
  joinRoom,
  listPlayers,
  submitAnswer,
  subscribePlayers,
  subscribeRoom,
  type Player,
  type Room,
} from "@/lib/multiplayer";
import { sfx } from "@/lib/sound";
import { GLASS, TILE, PlayerChips, Leaderboard } from "./mpUi";

export default function PlayerGame({
  onExit,
  initialPin = "",
}: {
  onExit: () => void;
  initialPin?: string;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  const [pin, setPin] = useState(initialPin.replace(/\D/g, "").slice(0, 6));
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const [answeredIdx, setAnsweredIdx] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; points: number } | null>(
    null,
  );
  const [secondsLeft, setSecondsLeft] = useState(0);

  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const doJoin = async () => {
    setError(null);
    if (!pin.trim() || !name.trim()) {
      setError("Nhập cả mã PIN và tên.");
      return;
    }
    setJoining(true);
    try {
      const { room: r, player } = await joinRoom(pin, name, getClientId());
      setRoom(r);
      setMe(player);
      setPlayers(await listPlayers(r.id));
      subscribeRoom(r.id, (nr) => setRoom(nr));
      subscribePlayers(r.id, async () => setPlayers(await listPlayers(r.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setJoining(false);
    }
  };

  // Đồng hồ đếm ngược.
  useEffect(() => {
    if (!room || room.status !== "question" || !room.question_started_at) return;
    const q = room.quiz.questions[room.current_index];
    const deadline = Date.parse(room.question_started_at) + q.timeLimit * 1000;
    const tick = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(tick);
  }, [room]);

  const answer = useCallback(
    async (choice: number) => {
      const r = roomRef.current;
      if (!r || !me || answeredIdx === r.current_index) return;
      // Khoá: hết giờ thì không nhận trả lời (chống gian lận trả lời muộn).
      const q = r.quiz.questions[r.current_index];
      const started = r.question_started_at
        ? Date.parse(r.question_started_at)
        : Date.now();
      if (Date.now() - started > q.timeLimit * 1000) return;

      setAnsweredIdx(r.current_index);
      try {
        const res = await submitAnswer(r, me, choice);
        if (res) {
          setResult(res);
          setMe({ ...me, score: me.score + res.points });
          if (res.correct) sfx.correct();
          else sfx.wrong();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [me, answeredIdx],
  );

  /* ---------------- JOIN SCREEN ---------------- */
  if (!room || !me) {
    return (
      <Center>
        <div className={`flex w-full flex-col gap-4 rounded-[2rem] p-8 ${GLASS}`}>
          <h1 className="text-center text-3xl font-black text-white drop-shadow-sm">
            Tham gia phòng
          </h1>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="Mã PIN (6 số)"
            className="rounded-2xl border border-white/40 bg-white/90 px-4 py-3 text-center text-2xl font-black tracking-[0.2em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Tên của bạn"
            className="rounded-2xl border border-white/40 bg-white/90 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
          <LightBtn onClick={doJoin} disabled={joining}>
            {joining ? "Đang vào…" : "Vào phòng →"}
          </LightBtn>
          {error && (
            <p className="rounded-2xl border border-rose-200/40 bg-rose-500/80 px-4 py-2 text-sm font-semibold text-white">
              ⚠ {error}
            </p>
          )}
          <GhostBtn onClick={onExit}>← Quay lại</GhostBtn>
        </div>
      </Center>
    );
  }

  /* ---------------- LOBBY ---------------- */
  if (room.status === "lobby") {
    return (
      <Center>
        <div className={`flex w-full flex-col items-center gap-5 rounded-[2rem] p-8 ${GLASS}`}>
          <p className="text-5xl">⏳</p>
          <p className="text-lg font-semibold text-white">
            Đã vào phòng! Chờ chủ phòng bắt đầu…
          </p>
          <div className="w-full">
            <p className="mb-2 text-center text-sm font-semibold text-white/80">
              Người chơi ({players.length})
            </p>
            <PlayerChips players={players} youId={me.id} />
          </div>
          <GhostBtn onClick={onExit}>Rời phòng</GhostBtn>
        </div>
      </Center>
    );
  }

  /* ---------------- ENDED ---------------- */
  if (room.status === "ended") {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex((p) => p.id === me.id) + 1;
    return (
      <Center>
        <h1 className="text-3xl font-black text-white drop-shadow-sm">🏁 Kết thúc!</h1>
        <div className={`w-full rounded-3xl p-5 text-center ${GLASS}`}>
          <p className="text-white/70">Hạng của bạn</p>
          <p className="text-4xl font-black text-amber-200">#{rank}</p>
          <p className="text-white/80">
            {me.score.toLocaleString("vi-VN")} điểm
          </p>
        </div>
        <Leaderboard players={players} youId={me.id} top={5} />
        <GhostBtn onClick={onExit}>⌂ Thoát</GhostBtn>
      </Center>
    );
  }

  /* ---------------- QUESTION / REVEAL ---------------- */
  const q = room.quiz.questions[room.current_index];
  const revealed = room.status === "reveal";
  const iAnswered = answeredIdx === room.current_index;
  const activeResult = iAnswered ? result : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 text-white sm:p-6">
      <div className="flex items-center justify-between text-base font-semibold">
        <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 backdrop-blur-md">
          Câu {room.current_index + 1}/{room.quiz.questions.length}
        </span>
        <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 backdrop-blur-md">
          {revealed ? "Đáp án" : `⏱ ${secondsLeft}s`}
        </span>
      </div>

      <div
        key={room.current_index}
        className="anim-fade-up rounded-3xl border border-white/50 bg-white/75 px-5 py-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl"
      >
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{q.text}</h2>
      </div>

      {revealed ? (
        <div className={`flex flex-col items-center gap-3 rounded-3xl p-5 text-center ${GLASS}`}>
          {!iAnswered ? (
            <p className="text-lg font-bold text-white/80">Bạn chưa trả lời câu này.</p>
          ) : activeResult?.correct ? (
            <p className="text-xl font-bold text-emerald-200">
              🎉 Đúng! +{activeResult.points.toLocaleString("vi-VN")} điểm
            </p>
          ) : (
            <p className="text-xl font-bold text-rose-200">Sai rồi! +0 điểm</p>
          )}
          <p className="text-sm text-white/70">
            Tổng điểm của bạn: {me.score.toLocaleString("vi-VN")}
          </p>
          <Leaderboard players={players} youId={me.id} top={5} />
        </div>
      ) : iAnswered ? (
        <div className={`flex flex-col items-center gap-2 rounded-3xl p-8 text-center ${GLASS}`}>
          <p className="text-4xl">✅</p>
          <p className="text-lg font-semibold text-white">
            Đã trả lời! Chờ mọi người…
          </p>
        </div>
      ) : (
        <div key={`ans-${room.current_index}`} className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {q.answers.map((a, i) => {
            const t = TILE[i % TILE.length];
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`anim-fade-up flex items-center gap-4 rounded-[1.5rem] border border-white/25 px-5 py-6 text-left text-xl font-semibold text-white shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/25 active:scale-[0.98] ${t.tint}`}
              >
                <span className="grid h-11 w-11 place-items-center rounded-full border border-white/40 bg-white/25 text-lg font-black">
                  {t.label}
                </span>
                <span className="flex-1">{a.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --- helpers dùng chung trong file --- */
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
