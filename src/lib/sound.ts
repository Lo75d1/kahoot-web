// Âm thanh game bằng Web Audio (tự sinh tone, không cần file asset -> hợp CSP).
// Có công tắc bật/tắt lưu ở localStorage. Mọi lỗi được nuốt để không phá app.

let ctx: AudioContext | null = null;
let enabled = true;

export function initSound() {
  if (typeof window === "undefined") return;
  enabled = localStorage.getItem("quiz-sound") !== "off";
}

export function soundEnabled() {
  return enabled;
}

export function toggleSound(): boolean {
  enabled = !enabled;
  try {
    localStorage.setItem("quiz-sound", enabled ? "on" : "off");
  } catch {
    /* ignore */
  }
  return enabled;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  durMs: number,
  type: OscillatorType = "sine",
  gain = 0.15,
  delay = 0,
) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + delay;
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
    o.start(t);
    o.stop(t + durMs / 1000 + 0.03);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  correct() {
    tone(660, 130, "triangle");
    tone(880, 170, "triangle", 0.15, 0.1);
  },
  wrong() {
    tone(196, 240, "sawtooth", 0.12);
  },
  join() {
    tone(523, 90, "sine", 0.12);
    tone(784, 100, "sine", 0.12, 0.08);
  },
  tick() {
    tone(440, 55, "square", 0.07);
  },
  start() {
    tone(523, 100, "triangle");
    tone(659, 100, "triangle", 0.15, 0.09);
    tone(784, 150, "triangle", 0.15, 0.18);
  },
  end() {
    tone(784, 150, "triangle");
    tone(659, 150, "triangle", 0.15, 0.14);
    tone(523, 220, "triangle", 0.15, 0.28);
  },
};
