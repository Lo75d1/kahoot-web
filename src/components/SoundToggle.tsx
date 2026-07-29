"use client";

import { useEffect, useState } from "react";
import { initSound, soundEnabled, toggleSound } from "@/lib/sound";

export default function SoundToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    initSound();
    const frame = requestAnimationFrame(() => setOn(soundEnabled()));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button
      onClick={() => setOn(toggleSound())}
      aria-label={on ? "Tắt âm thanh" : "Bật âm thanh"}
      className="fixed right-3 top-3 z-50 grid h-10 w-10 place-items-center rounded-full border border-white/25 bg-white/10 text-lg backdrop-blur-md transition hover:bg-white/20"
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}
