"use client";

import type { Player } from "@/lib/multiplayer";
import { avatarFor } from "@/lib/avatar";

export const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";

export const TILE = [
  { tint: "bg-rose-400/20", label: "A" },
  { tint: "bg-sky-400/20", label: "B" },
  { tint: "bg-amber-300/20", label: "C" },
  { tint: "bg-emerald-400/20", label: "D" },
];

export function PlayerChips({
  players,
  youId,
}: {
  players: Player[];
  youId?: string;
}) {
  if (players.length === 0)
    return (
      <p className="text-center text-white/60">Chưa có người chơi nào…</p>
    );
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {players.map((p) => {
        const a = avatarFor(p.id);
        return (
          <span
            key={p.id}
            className={`anim-pop flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold backdrop-blur-md ${
              p.id === youId
                ? "border-amber-200/50 bg-amber-300/25 text-amber-50"
                : "border-white/25 bg-white/15 text-white"
            }`}
          >
            <span className={`grid h-6 w-6 place-items-center rounded-full text-sm ${a.color}`}>
              {a.emoji}
            </span>
            {p.name}
            {p.id === youId ? " (bạn)" : ""}
          </span>
        );
      })}
    </div>
  );
}

export function Leaderboard({
  players,
  youId,
  top,
}: {
  players: Player[];
  youId?: string;
  top?: number;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const shown = top ? sorted.slice(0, top) : sorted;
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className={`w-full overflow-hidden rounded-3xl ${GLASS}`}>
      {shown.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-base last:border-0 ${
            p.id === youId ? "bg-amber-300/15" : ""
          }`}
        >
          <span className="flex items-center gap-2 font-semibold text-white">
            <span className="w-6 text-center">{medals[i] ?? i + 1}</span>
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-sm ${avatarFor(p.id).color}`}
            >
              {avatarFor(p.id).emoji}
            </span>
            {p.name}
            {p.id === youId ? " (bạn)" : ""}
          </span>
          <span className="font-black text-amber-200">
            {p.score.toLocaleString("vi-VN")}
          </span>
        </div>
      ))}
    </div>
  );
}
