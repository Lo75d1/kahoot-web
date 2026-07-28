// Avatar suy ra từ một chuỗi seed (id người chơi) — luôn cố định cho cùng seed.

const EMOJIS = [
  "🦊", "🐼", "🐯", "🐸", "🦉", "🐵", "🐧", "🦁", "🐶", "🐱",
  "🐨", "🐰", "🐹", "🦄", "🐙", "🐢", "🐬", "🦕", "🐝", "🦋",
];

const COLORS = [
  "bg-rose-400/80",
  "bg-sky-400/80",
  "bg-amber-400/80",
  "bg-emerald-400/80",
  "bg-violet-400/80",
  "bg-fuchsia-400/80",
  "bg-cyan-400/80",
  "bg-orange-400/80",
  "bg-lime-400/80",
  "bg-pink-400/80",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarFor(seed: string): { emoji: string; color: string } {
  const h = hash(seed || "x");
  return { emoji: EMOJIS[h % EMOJIS.length], color: COLORS[(h >> 3) % COLORS.length] };
}
