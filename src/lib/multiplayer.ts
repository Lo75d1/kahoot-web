// Lõi multiplayer trên Supabase Realtime (Postgres Changes).
// Host cập nhật hàng "rooms" -> mọi người nhận qua subscribe.

import type { Quiz } from "./types";
import { supabase } from "./supabase";
import { computeScore } from "./scoring";

export type RoomStatus = "lobby" | "question" | "reveal" | "ended";

export interface Room {
  id: string;
  pin: string;
  host_id: string;
  quiz: Quiz;
  status: RoomStatus;
  current_index: number;
  question_started_at: string | null;
}

export interface Player {
  id: string;
  room_id: string;
  client_id: string;
  name: string;
  score: number;
}

function sb() {
  if (!supabase)
    throw new Error("Chưa cấu hình Supabase — cần key để chơi nhiều người.");
  return supabase;
}

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("quiz-client-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("quiz-client-id", id);
  }
  return id;
}

function genPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createRoom(quiz: Quiz, hostId: string): Promise<Room> {
  const client = sb();
  for (let i = 0; i < 6; i++) {
    const pin = genPin();
    const { data, error } = await client
      .from("rooms")
      .insert({ pin, host_id: hostId, quiz, status: "lobby", current_index: 0 })
      .select()
      .single();
    if (!error) return data as Room;
    if (error.code !== "23505") throw error; // 23505 = trùng PIN, thử lại
  }
  throw new Error("Không tạo được mã PIN, thử lại.");
}

export async function joinRoom(
  pin: string,
  name: string,
  clientId: string,
): Promise<{ room: Room; player: Player }> {
  const client = sb();
  const { data: room, error: rErr } = await client
    .from("rooms")
    .select("*")
    .eq("pin", pin.trim())
    .maybeSingle();
  if (rErr) throw rErr;
  if (!room) throw new Error("Không tìm thấy phòng với mã PIN này.");
  if (room.status !== "lobby")
    throw new Error("Phòng đã bắt đầu, không vào được nữa.");

  const { data: existing } = await client
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (existing) return { room: room as Room, player: existing as Player };

  const { data: player, error: pErr } = await client
    .from("players")
    .insert({ room_id: room.id, client_id: clientId, name: name.trim() })
    .select()
    .single();
  if (pErr) throw pErr;
  return { room: room as Room, player: player as Player };
}

export async function listPlayers(roomId: string): Promise<Player[]> {
  const { data, error } = await sb()
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Player[];
}

export async function fetchRoom(roomId: string): Promise<Room> {
  const { data, error } = await sb()
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  if (error) throw error;
  return data as Room;
}

export async function startGame(roomId: string) {
  const { error } = await sb()
    .from("rooms")
    .update({
      status: "question",
      current_index: 0,
      question_started_at: new Date().toISOString(),
    })
    .eq("id", roomId);
  if (error) throw error;
}

export async function revealQuestion(roomId: string) {
  const { error } = await sb()
    .from("rooms")
    .update({ status: "reveal" })
    .eq("id", roomId);
  if (error) throw error;
}

export async function nextQuestion(roomId: string, index: number, total: number) {
  const patch =
    index + 1 >= total
      ? { status: "ended" as const }
      : {
          status: "question" as const,
          current_index: index + 1,
          question_started_at: new Date().toISOString(),
        };
  const { error } = await sb().from("rooms").update(patch).eq("id", roomId);
  if (error) throw error;
}

/** Người chơi trả lời: tính điểm theo tốc độ, ghi answer + cộng điểm. */
export async function submitAnswer(
  room: Room,
  player: Player,
  choice: number,
): Promise<{ correct: boolean; points: number } | null> {
  const q = room.quiz.questions[room.current_index];
  const correct = !!q.answers[choice]?.correct;
  const startedAt = room.question_started_at
    ? Date.parse(room.question_started_at)
    : Date.now();
  const responseMs = Date.now() - startedAt;
  const points = correct
    ? computeScore(true, responseMs, q.timeLimit, q.points)
    : 0;

  const client = sb();
  const { error } = await client.from("answers").insert({
    room_id: room.id,
    player_id: player.id,
    question_index: room.current_index,
    choice,
    is_correct: correct,
    points,
  });
  if (error) {
    if (error.code === "23505") return null; // đã trả lời câu này
    throw error;
  }
  if (points > 0) {
    const { data: cur } = await client
      .from("players")
      .select("score")
      .eq("id", player.id)
      .single();
    await client
      .from("players")
      .update({ score: (cur?.score ?? 0) + points })
      .eq("id", player.id);
  }
  return { correct, points };
}

export async function deleteRoom(roomId: string) {
  const { error } = await sb().from("rooms").delete().eq("id", roomId);
  if (error) throw error;
}

export async function answeredCount(
  roomId: string,
  index: number,
): Promise<number> {
  const { count } = await sb()
    .from("answers")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("question_index", index);
  return count ?? 0;
}

export function subscribeRoom(roomId: string, cb: (room: Room) => void) {
  return sb()
    .channel(`room-${roomId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
      (payload) => cb(payload.new as Room),
    )
    .subscribe();
}

export function subscribePlayers(roomId: string, cb: () => void) {
  return sb()
    .channel(`players-${roomId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
      () => cb(),
    )
    .subscribe();
}
