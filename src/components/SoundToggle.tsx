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
      className="fixed right-4 top-4 z-50 grid h-11 w-11 place-items-center rounded-xl border border-[#018f41]/20 bg-[#018f41] text-lg shadow-lg transition hover:-translate-y-0.5 hover:bg-[#01823c]"
    >
      {on ? "🔊" : "🔇"}
    </button>
  );
}
