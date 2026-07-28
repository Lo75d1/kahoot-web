// Adapter QuizStore chạy trên Supabase (bảng "quizzes").
// Cùng interface với localStore -> QuizApp chỉ chọn adapter, không đổi UI.

import type { Quiz } from "./types";
import type { QuizStore, SavedQuiz } from "./store";
import { supabase } from "./supabase";

const TABLE = "quizzes";

interface Row {
  id: string;
  title: string;
  description: string | null;
  questions: Quiz["questions"] | null;
  updated_at: string | null;
}

function rowToSaved(r: Row): SavedQuiz {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    questions: r.questions ?? [],
    updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
  };
}

export const supabaseStore: QuizStore = {
  async list() {
    const { data, error } = await supabase!
      .from(TABLE)
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(rowToSaved);
  },

  async get(id) {
    const { data, error } = await supabase!
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToSaved(data as Row) : null;
  },

  async save(quiz) {
    const payload = {
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions,
      updated_at: new Date().toISOString(),
    };
    if (quiz.id) {
      const { data, error } = await supabase!
        .from(TABLE)
        .update(payload)
        .eq("id", quiz.id)
        .select()
        .single();
      if (error) throw error;
      return rowToSaved(data as Row);
    }
    const { data, error } = await supabase!
      .from(TABLE)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return rowToSaved(data as Row);
  },

  async remove(id) {
    const { error } = await supabase!.from(TABLE).delete().eq("id", id);
    if (error) throw error;
  },
};
