// Xác thực giáo viên qua Supabase Auth (email + mật khẩu).

import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export type { User };

function sb() {
  if (!supabase) throw new Error("Chưa cấu hình Supabase.");
  return supabase;
}

/** Đăng ký + báo có cần xác nhận email không. */
export async function signUp(
  email: string,
  password: string,
  requestedRole: "student" | "lecturer" = "lecturer",
  fullName = "",
) {
  const { data, error } = await sb().auth.signUp({
    email,
    password,
    options: { data: { requested_role: requestedRole, full_name: fullName.trim() } },
  });
  if (error) throw error;
  return { user: data.user, needConfirm: !data.session };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

/** Đăng ký lắng nghe trạng thái đăng nhập; callback chạy ngay với phiên hiện tại. */
export function onAuthChange(cb: (user: User | null) => void) {
  if (!supabase) {
    cb(null);
    return { unsubscribe() {} };
  }
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return data.subscription;
}
