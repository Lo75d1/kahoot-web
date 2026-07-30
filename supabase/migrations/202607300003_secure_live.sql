-- Secure live-game mutations behind secret-bearing RPCs.
-- Room content is sanitized before becoming readable through Realtime.

create extension if not exists pgcrypto;

alter table public.rooms
  add column if not exists revealed_correct_indexes integer[] not null default '{}';

create unique index if not exists players_room_client_unique
  on public.players (room_id, client_id);

create table if not exists public.room_keys (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  host_secret_hash bytea not null,
  correct_indexes jsonb not null
);

create table if not exists public.player_keys (
  player_id uuid primary key references public.players(id) on delete cascade,
  player_secret_hash bytea not null
);

alter table public.room_keys enable row level security;
alter table public.player_keys enable row level security;

drop policy if exists "public all" on public.rooms;
drop policy if exists "public all" on public.players;
drop policy if exists "public all" on public.answers;
create policy "live_rooms_read" on public.rooms for select using (true);
create policy "live_players_read" on public.players for select using (true);

create or replace function public.create_live_room(
  requested_pin text,
  requested_host_id text,
  requested_quiz jsonb,
  host_secret text
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  created_room public.rooms;
  question jsonb;
  answer jsonb;
  safe_questions jsonb := '[]'::jsonb;
  safe_answers jsonb;
  answer_keys jsonb := '[]'::jsonb;
  current_key jsonb;
  answer_index integer;
begin
  if host_secret is null or char_length(host_secret) < 24 then
    raise exception 'Host secret không hợp lệ.';
  end if;
  if jsonb_array_length(coalesce(requested_quiz->'questions', '[]'::jsonb)) < 1 then
    raise exception 'Bộ đề trống.';
  end if;

  for question in select value from jsonb_array_elements(requested_quiz->'questions')
  loop
    safe_answers := '[]'::jsonb;
    current_key := '[]'::jsonb;
    answer_index := 0;
    for answer in select value from jsonb_array_elements(question->'answers')
    loop
      if coalesce((answer->>'correct')::boolean, false) then
        current_key := current_key || to_jsonb(answer_index);
      end if;
      safe_answers := safe_answers || jsonb_set(answer, '{correct}', 'false'::jsonb);
      answer_index := answer_index + 1;
    end loop;
    safe_questions := safe_questions || jsonb_set(question, '{answers}', safe_answers);
    answer_keys := answer_keys || jsonb_build_array(current_key);
  end loop;

  insert into public.rooms (pin, host_id, quiz, status, current_index)
  values (
    requested_pin,
    requested_host_id,
    jsonb_set(requested_quiz, '{questions}', safe_questions),
    'lobby',
    0
  )
  returning * into created_room;

  insert into public.room_keys (room_id, host_secret_hash, correct_indexes)
  values (
    created_room.id,
    digest(host_secret, 'sha256'),
    answer_keys
  );
  return created_room;
end;
$$;

create or replace function public.join_live_room(
  requested_pin text,
  requested_name text,
  requested_client_id text,
  player_secret text
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.rooms;
  joined_player public.players;
begin
  select * into target_room
  from public.rooms
  where pin = trim(requested_pin);
  if target_room.id is null then raise exception 'Không tìm thấy phòng.'; end if;
  if target_room.status <> 'lobby' then raise exception 'Phòng đã bắt đầu.'; end if;
  if char_length(trim(requested_name)) < 1 or char_length(trim(requested_name)) > 20 then
    raise exception 'Tên phải có từ 1 đến 20 ký tự.';
  end if;
  if char_length(player_secret) < 24 then raise exception 'Player secret không hợp lệ.'; end if;

  select * into joined_player
  from public.players
  where room_id = target_room.id and client_id = requested_client_id;
  if joined_player.id is null then
    insert into public.players (room_id, client_id, name)
    values (target_room.id, requested_client_id, trim(requested_name))
    returning * into joined_player;
  end if;
  insert into public.player_keys (player_id, player_secret_hash)
  values (joined_player.id, digest(player_secret, 'sha256'))
  on conflict (player_id)
  do update set player_secret_hash = excluded.player_secret_hash;
  return joined_player;
end;
$$;

create or replace function public.control_live_room(
  requested_room_id uuid,
  host_secret text,
  requested_action text
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.rooms;
  keys jsonb;
  current_keys integer[];
begin
  if not exists (
    select 1 from public.room_keys
    where room_id = requested_room_id
      and host_secret_hash = digest(host_secret, 'sha256')
  ) then raise exception 'Không có quyền điều khiển phòng.'; end if;

  select * into target from public.rooms where id = requested_room_id for update;
  if requested_action = 'start' then
    update public.rooms
    set status = 'question', current_index = 0,
        question_started_at = now(), revealed_correct_indexes = '{}'
    where id = requested_room_id returning * into target;
  elsif requested_action = 'reveal' then
    select correct_indexes into keys from public.room_keys where room_id = requested_room_id;
    select coalesce(array_agg(value::integer), '{}')
      into current_keys
      from jsonb_array_elements_text(keys->target.current_index);
    update public.rooms
    set status = 'reveal', revealed_correct_indexes = current_keys
    where id = requested_room_id returning * into target;
  elsif requested_action = 'next' then
    if target.current_index + 1 >= jsonb_array_length(target.quiz->'questions') then
      update public.rooms set status = 'ended'
      where id = requested_room_id returning * into target;
    else
      update public.rooms
      set status = 'question', current_index = current_index + 1,
          question_started_at = now(), revealed_correct_indexes = '{}'
      where id = requested_room_id returning * into target;
    end if;
  elsif requested_action = 'close' then
    delete from public.rooms where id = requested_room_id;
  else
    raise exception 'Thao tác phòng không hợp lệ.';
  end if;
  return target;
end;
$$;

create or replace function public.submit_live_answer(
  requested_room_id uuid,
  requested_player_id uuid,
  player_secret text,
  requested_choice integer
)
returns table(correct boolean, points integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.rooms;
  target_player public.players;
  keys jsonb;
  expected jsonb;
  question jsonb;
  elapsed_ms numeric;
  limit_ms numeric;
  base_points integer;
  earned integer;
  is_correct boolean;
begin
  if not exists (
    select 1 from public.player_keys
    where player_id = requested_player_id
      and player_secret_hash = digest(player_secret, 'sha256')
  ) then raise exception 'Không có quyền trả lời.'; end if;

  select * into target_room from public.rooms
  where id = requested_room_id for update;
  select * into target_player from public.players
  where id = requested_player_id and room_id = requested_room_id for update;
  if target_room.status <> 'question' or target_player.id is null then
    raise exception 'Phòng không nhận câu trả lời lúc này.';
  end if;
  question := target_room.quiz->'questions'->target_room.current_index;
  limit_ms := greatest(coalesce((question->>'timeLimit')::numeric, 20) * 1000, 1);
  elapsed_ms := extract(epoch from (now() - target_room.question_started_at)) * 1000;
  if elapsed_ms > limit_ms + 1000 then raise exception 'Đã hết thời gian.'; end if;

  select correct_indexes into keys from public.room_keys where room_id = requested_room_id;
  expected := keys->target_room.current_index;
  is_correct :=
    jsonb_array_length(expected) = 1
    and (expected->>0)::integer = requested_choice;
  base_points := coalesce((question->>'points')::integer, 1000);
  earned := case when is_correct then
    round(base_points * (1 - least(greatest(elapsed_ms, 0) / limit_ms, 1) / 2))
  else 0 end;

  insert into public.answers (
    room_id, player_id, question_index, choice, is_correct, points
  ) values (
    requested_room_id, requested_player_id, target_room.current_index,
    requested_choice, is_correct, earned
  );
  update public.players set score = score + earned where id = requested_player_id;
  return query select is_correct, earned;
exception when unique_violation then
  raise exception 'Bạn đã trả lời câu này.';
end;
$$;

create or replace function public.live_answer_count(
  requested_room_id uuid,
  requested_question_index integer
)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer from public.answers
  where room_id = requested_room_id
    and question_index = requested_question_index;
$$;

revoke all on function public.create_live_room(text, text, jsonb, text) from public;
revoke all on function public.join_live_room(text, text, text, text) from public;
revoke all on function public.control_live_room(uuid, text, text) from public;
revoke all on function public.submit_live_answer(uuid, uuid, text, integer) from public;
revoke all on function public.live_answer_count(uuid, integer) from public;
grant execute on function public.create_live_room(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.join_live_room(text, text, text, text) to anon, authenticated;
grant execute on function public.control_live_room(uuid, text, text) to anon, authenticated;
grant execute on function public.submit_live_answer(uuid, uuid, text, integer) to anon, authenticated;
grant execute on function public.live_answer_count(uuid, integer) to anon, authenticated;
