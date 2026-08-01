// Lớp lưu trữ ngân hàng đề.
// M2a: adapter localStorage (chạy ngay, không cần tài khoản).
// M2b: viết thêm adapter Supabase cùng interface QuizStore -> đổi 1 dòng ở QuizApp.

import type { Quiz } from "./types";
import { parseQuiz } from "./parser";
import sampleRaw from "@/data/sample-quiz.json";
import sampleQuizzesRaw from "@/data/sample-quizzes.json";

export interface SavedQuiz extends Quiz {
  id: string;
  updatedAt: number;
}

export interface QuizStore {
  list(): Promise<SavedQuiz[]>;
  get(id: string): Promise<SavedQuiz | null>;
  /** Tạo mới (không id) hoặc cập nhật (có id). */
  save(quiz: Quiz & { id?: string }): Promise<SavedQuiz>;
  remove(id: string): Promise<void>;
}

const KEY = "quiz-bank-v1";
const SEED_FLAG = "quiz-bank-seeded-v1";
const SEED_PACK_FLAG = "quiz-bank-seeded-v2";

function readAll(): SavedQuiz[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as SavedQuiz[]).map((saved) => ({
      ...saved,
      ...parseQuiz(saved),
    }));
  } catch {
    return [];
  }
}

function writeAll(list: SavedQuiz[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const localStore: QuizStore = {
  async list() {
    return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async get(id) {
    return readAll().find((q) => q.id === id) ?? null;
  },
  async save(quiz) {
    const all = readAll();
    const id = quiz.id ?? uid();
    const saved: SavedQuiz = {
      id,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions,
      version: quiz.version,
      tags: quiz.tags,
      updatedAt: Date.now(),
    };
    const idx = all.findIndex((q) => q.id === id);
    if (idx >= 0) all[idx] = saved;
    else all.push(saved);
    writeAll(all);
    return saved;
  },
  async remove(id) {
    writeAll(readAll().filter((q) => q.id !== id));
  },
};

/** Nạp đề mẫu lần đầu để ngân hàng không trống. Gọi một lần khi app mở. */
export async function ensureSeeded(
  store: QuizStore = localStore,
  scope = "guest",
) {
  if (typeof window === "undefined") return;
  const firstFlag = `${SEED_FLAG}:${scope}`;
  const packFlag = `${SEED_PACK_FLAG}:${scope}`;
  const existingTitles = new Set(
    (await store.list()).map((quiz) => quiz.title.trim().toLocaleLowerCase("vi")),
  );
  if (!window.localStorage.getItem(firstFlag)) {
    try {
      const sample = parseQuiz(sampleRaw);
      if (!existingTitles.has(sample.title.toLocaleLowerCase("vi"))) {
        await store.save(sample);
      }
    } catch {
      // bỏ qua nếu đề mẫu lỗi
    }
    window.localStorage.setItem(firstFlag, "1");
  }
  if (!window.localStorage.getItem(packFlag)) {
    for (const raw of sampleQuizzesRaw) {
      try {
        const sample = parseQuiz(raw);
        if (!existingTitles.has(sample.title.toLocaleLowerCase("vi"))) {
          await store.save(sample);
          existingTitles.add(sample.title.toLocaleLowerCase("vi"));
        }
      } catch {
        // một đề lỗi không chặn các đề mẫu còn lại
      }
    }
    window.localStorage.setItem(packFlag, "1");
  }
}
