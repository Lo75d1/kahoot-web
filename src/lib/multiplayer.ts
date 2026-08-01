// Lõi multiplayer trên Supabase Realtime (Postgres Changes).
// Host cập nhật hàng "rooms" -> mọi người nhận qua subscribe.

import type { Quiz } from "./types";
import { supabase } from "./supabase";

export type RoomStatus = "lobby" | "question" | "reveal" | "ended";

export interface Room {
  id: string;
  pin: string;
  host_id: string;
  quiz: Quiz;
  status: RoomStatus;
  current_index: number;
  question_started_at: string | null;
  revealed_correct_indexes: number[];
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

export function liveError(
  error: unknown,
  fallback = "Live game gặp lỗi. Vui lòng thử lại.",
): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const parts = [candidate.message, candidate.details, candidate.hint].filter(
      (part): part is string => typeof part === "string" && part.trim().length > 0,
    );
    if (parts.length > 0) return new Error(parts.join(" · "));
  }
  if (typeof error === "string" && error.trim()) return new Error(error);
  return new Error(fallback);
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

function secretKey(kind: "host" | "player", id: string) {
  return `kashot-live-${kind}-${id}`;
}

function createSecret(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`;
}

function saveSecret(kind: "host" | "player", id: string, secret: string) {
  sessionStorage.setItem(secretKey(kind, id), secret);
}

function getSecret(kind: "host" | "player", id: string): string {
  const secret = sessionStorage.getItem(secretKey(kind, id));
  if (!secret) throw new Error("Phiên điều khiển đã hết. Hãy vào lại phòng.");
  return secret;
}

export async function createRoom(quiz: Quiz, hostId: string): Promise<Room> {
  const client = sb();
  for (let i = 0; i < 6; i++) {
    const pin = genPin();
    const secret = createSecret();
    const { data, error } = await client.rpc("create_live_room", {
      requested_pin: pin,
      requested_host_id: hostId,
      requested_quiz: quiz,
      host_secret: secret,
    });
    if (!error && data) {
      const room = data as Room;
      saveSecret("host", room.id, secret);
      return room;
    }
    if (!error || error.code !== "23505") {
      throw liveError(error, "Không tạo được phòng.");
    }
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
  if (rErr) throw liveError(rErr);
  if (!room) throw new Error("Không tìm thấy phòng với mã PIN này.");
  if (room.status !== "lobby")
    throw new Error("Phòng đã bắt đầu, không vào được nữa.");

  const { data: existing } = await client
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (existing) {
    const stored = sessionStorage.getItem(secretKey("player", existing.id));
    if (stored) return { room: room as Room, player: existing as Player };
  }

  const playerSecret = createSecret();
  const { data: player, error: pErr } = await client.rpc("join_live_room", {
    requested_pin: pin.trim(),
    requested_name: name.trim(),
    requested_client_id: clientId,
    player_secret: playerSecret,
  });
  if (pErr) throw liveError(pErr);
  saveSecret("player", (player as Player).id, playerSecret);
  return { room: room as Room, player: player as Player };
}

export async function listPlayers(roomId: string): Promise<Player[]> {
  const { data, error } = await sb()
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at");
  if (error) throw liveError(error);
  return (data ?? []) as Player[];
}

export async function fetchRoom(roomId: string): Promise<Room> {
  const { data, error } = await sb()
    .from("rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  if (error) throw liveError(error);
  return data as Room;
}

export async function startGame(roomId: string) {
  const { error } = await sb().rpc("control_live_room", {
    requested_room_id: roomId,
    host_secret: getSecret("host", roomId),
    requested_action: "start",
  });
  if (error) throw liveError(error);
}

export async function revealQuestion(roomId: string) {
  const { error } = await sb().rpc("control_live_room", {
    requested_room_id: roomId,
    host_secret: getSecret("host", roomId),
    requested_action: "reveal",
  });
  if (error) throw liveError(error);
}

export async function nextQuestion(roomId: string, index: number, total: number) {
  void index;
  void total;
  const { error } = await sb().rpc("control_live_room", {
    requested_room_id: roomId,
    host_secret: getSecret("host", roomId),
    requested_action: "next",
  });
  if (error) throw liveError(error);
}

/** Người chơi trả lời: tính điểm theo tốc độ, ghi answer + cộng điểm. */
export async function submitAnswer(
  room: Room,
  player: Player,
  choice: number,
): Promise<{ correct: boolean; points: number } | null> {
  const { data, error } = await sb().rpc("submit_live_answer", {
    requested_room_id: room.id,
    requested_player_id: player.id,
    player_secret: getSecret("player", player.id),
    requested_choice: choice,
  });
  if (error) {
    if (error.message.includes("đã trả lời")) return null;
    throw liveError(error);
  }
  const result = Array.isArray(data) ? data[0] : data;
  return {
    correct: Boolean(result?.correct),
    points: Number(result?.points ?? 0),
  };
}

export async function deleteRoom(roomId: string) {
  const { error } = await sb().rpc("control_live_room", {
    requested_room_id: roomId,
    host_secret: getSecret("host", roomId),
    requested_action: "close",
  });
  if (error) throw liveError(error);
}

export async function answeredCount(
  roomId: string,
  index: number,
): Promise<number> {
  const { data, error } = await sb().rpc("live_answer_count", {
    requested_room_id: roomId,
    requested_question_index: index,
  });
  if (error) throw liveError(error);
  return Number(data ?? 0);
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
