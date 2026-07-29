-- Kashot baseline migration.
-- Idempotent replacement for schema.sql + m3_schema.sql + auth_schema.sql.

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  pin text not null unique,
  host_id text not null,
  quiz jsonb not null,
  status text not null default 'lobby'
    check (status in ('lobby', 'question', 'reveal', 'ended')),
  current_index integer not null default 0 check (current_index >= 0),
  question_started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  client_id text not null,
  name text not null check (char_length(name) between 1 and 20),
  score integer not null default 0 check (score >= 0),
  created_at timestamptz not null default now(),
  unique (room_id, client_id)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  choice integer,
  is_correct boolean not null default false,
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  unique (player_id, question_index)
);

alter table public.quizzes enable row level security;
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.answers enable row level security;

drop policy if exists "public read" on public.quizzes;
drop policy if exists "public insert" on public.quizzes;
drop policy if exists "public update" on public.quizzes;
drop policy if exists "public delete" on public.quizzes;
drop policy if exists "public all" on public.quizzes;
drop policy if exists "own_select" on public.quizzes;
drop policy if exists "own_insert" on public.quizzes;
drop policy if exists "own_update" on public.quizzes;
drop policy if exists "own_delete" on public.quizzes;

create policy "own_select" on public.quizzes
  for select to authenticated using (auth.uid() = owner_id);
create policy "own_insert" on public.quizzes
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "own_update" on public.quizzes
  for update to authenticated using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy "own_delete" on public.quizzes
  for delete to authenticated using (auth.uid() = owner_id);

-- Compatibility policies for the current anonymous live-game client.
-- Replaced by server-only RPC policies in the live-security migration.
do $$
declare table_name text;
begin
  foreach table_name in array array['rooms', 'players', 'answers'] loop
    execute format('drop policy if exists "public all" on public.%I', table_name);
    execute format(
      'create policy "public all" on public.%I for all using (true) with check (true)',
      table_name
    );
  end loop;
end $$;

alter table public.rooms replica identity full;
alter table public.players replica identity full;
alter table public.answers replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.players;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.answers;
  exception when duplicate_object then null;
  end;
end $$;
