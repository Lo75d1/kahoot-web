-- M3: Multiplayer (phòng + PIN + realtime). Chạy trong SQL Editor hoặc qua script.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  pin text not null unique,
  host_id text not null,
  quiz jsonb not null,
  status text not null default 'lobby',        -- lobby | question | reveal | ended
  current_index int not null default 0,
  question_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  client_id text not null,
  name text not null,
  score int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  question_index int not null,
  choice int,
  is_correct boolean not null default false,
  points int not null default 0,
  created_at timestamptz not null default now(),
  unique (player_id, question_index)
);

-- RLS công khai (demo, giống bảng quizzes)
alter table public.rooms   enable row level security;
alter table public.players enable row level security;
alter table public.answers enable row level security;

do $$
declare t text;
begin
  foreach t in array array['rooms','players','answers'] loop
    execute format('drop policy if exists "public all" on public.%I', t);
    execute format('create policy "public all" on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;

-- Bật realtime (Postgres Changes)
alter table public.rooms   replica identity full;
alter table public.players replica identity full;
alter table public.answers replica identity full;

do $$
begin
  begin execute 'alter publication supabase_realtime add table public.rooms';   exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.players';  exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.answers';  exception when duplicate_object then null; end;
end $$;
