"use client";

import { useState } from "react";
import { signIn, signUp } from "@/lib/auth";

const GLASS =
  "border border-white/25 bg-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.18)]";
const INPUT =
  "w-full rounded-2xl border border-white/40 bg-white/90 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200";
const LIGHT =
  "rounded-2xl border border-white/50 bg-white/85 px-6 py-3 font-extrabold text-emerald-900 shadow-lg backdrop-blur-md transition hover:bg-white active:scale-95 disabled:opacity-50";
const GHOST =
  "rounded-2xl border border-white/25 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-md transition hover:bg-white/20";

function viError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Sai email hoặc mật khẩu.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Email đã được đăng ký — hãy đăng nhập.";
  if (m.includes("at least 6")) return "Mật khẩu tối thiểu 6 ký tự.";
  if (m.includes("not confirmed"))
    return "Email chưa xác nhận — kiểm tra hộp thư.";
  if (m.includes("unable to validate") || m.includes("invalid email"))
    return "Email không hợp lệ.";
  return msg;
}

export default function AuthScreen({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError("Nhập email và mật khẩu.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { needConfirm } = await signUp(email.trim(), password);
        if (needConfirm) {
          setInfo(
            "Đã gửi email xác nhận. Mở email bấm xác nhận rồi quay lại đăng nhập.",
          );
          setMode("login");
        } else {
          onDone();
        }
      } else {
        await signIn(email.trim(), password);
        onDone();
      }
    } catch (e) {
      setError(viError(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-5 p-6 text-white">
      <div className={`flex w-full flex-col gap-4 rounded-[2rem] p-8 ${GLASS}`}>
        <h1 className="text-center text-3xl font-black drop-shadow-sm">
          {mode === "login" ? "Đăng nhập giáo viên" : "Tạo tài khoản giáo viên"}
        </h1>
        <p className="text-center text-sm text-white/70">
          Đăng nhập để lưu &amp; quản lý đề của riêng bạn trên đám mây.
        </p>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={INPUT}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Mật khẩu (tối thiểu 6 ký tự)"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={INPUT}
        />

        <button onClick={submit} disabled={loading} className={LIGHT}>
          {loading
            ? "Đang xử lý…"
            : mode === "login"
              ? "Đăng nhập →"
              : "Đăng ký →"}
        </button>

        {error && (
          <p className="rounded-2xl border border-rose-200/40 bg-rose-500/80 px-4 py-2 text-sm font-semibold">
            ⚠ {error}
          </p>
        )}
        {info && (
          <p className="rounded-2xl border border-emerald-200/40 bg-emerald-500/70 px-4 py-2 text-sm font-semibold">
            ✓ {info}
          </p>
        )}

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
          className="text-sm text-white/80 underline underline-offset-2 hover:text-white"
        >
          {mode === "login"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>

      <button onClick={onCancel} className={GHOST}>
        ← Dùng như khách (lưu trên máy)
      </button>
    </div>
  );
}
