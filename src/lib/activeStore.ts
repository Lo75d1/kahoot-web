// Chọn nơi lưu trữ theo cấu hình: có Supabase -> đám mây, không -> máy này.

import { isSupabaseConfigured } from "./supabase";
import { localStore, type QuizStore } from "./store";
import { supabaseStore } from "./supabaseStore";

export const activeStore: QuizStore = isSupabaseConfigured
  ? supabaseStore
  : localStore;

export const storageMode: "cloud" | "local" = isSupabaseConfigured
  ? "cloud"
  : "local";
