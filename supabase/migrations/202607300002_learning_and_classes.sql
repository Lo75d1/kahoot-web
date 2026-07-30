-- Learning history, review scheduling, classes and assignments.

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  title text not null,
  mode text not null default 'practice'
    check (mode in ('learn', 'practice', 'exam')),
  due_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete set null,
  quiz_id uuid references public.quizzes(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('learn', 'practice', 'exam')),
  score integer not null default 0,
  correct_count integer not null default 0,
  total_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_index integer not null,
  response jsonb not null default '{}'::jsonb,
  is_correct boolean not null default false,
  points integer not null default 0,
  response_ms integer,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_index)
);

create table if not exists public.review_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_index integer not null,
  due_at timestamptz not null default now(),
  stability real not null default 0,
  difficulty real not null default 0,
  lapses integer not null default 0,
  last_result boolean,
  updated_at timestamptz not null default now(),
  primary key (user_id, quiz_id, question_index)
);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.review_cards enable row level security;

create policy "class_owner_all" on public.classes
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "class_member_read" on public.classes
  for select to authenticated using (
    exists (
      select 1 from public.class_members member
      where member.class_id = id and member.user_id = auth.uid()
    )
  );

create policy "member_self_read" on public.class_members
  for select to authenticated using (
    user_id = auth.uid() or exists (
      select 1 from public.classes class
      where class.id = class_id and class.owner_id = auth.uid()
    )
  );
create policy "member_self_join" on public.class_members
  for insert to authenticated with check (user_id = auth.uid());
create policy "class_owner_manage_members" on public.class_members
  for delete to authenticated using (
    exists (
      select 1 from public.classes class
      where class.id = class_id and class.owner_id = auth.uid()
    )
  );

create policy "teacher_manage_assignments" on public.assignments
  for all to authenticated using (
    exists (
      select 1 from public.classes class
      where class.id = class_id and class.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.classes class
      where class.id = class_id and class.owner_id = auth.uid()
    )
  );
create policy "student_read_assignments" on public.assignments
  for select to authenticated using (
    exists (
      select 1 from public.class_members member
      where member.class_id = class_id and member.user_id = auth.uid()
    )
  );

create policy "attempt_owner_all" on public.attempts
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "teacher_read_attempts" on public.attempts
  for select to authenticated using (
    exists (
      select 1
      from public.assignments assignment
      join public.classes class on class.id = assignment.class_id
      where assignment.id = assignment_id and class.owner_id = auth.uid()
    )
  );
create policy "attempt_answer_owner_all" on public.attempt_answers
  for all to authenticated using (
    exists (
      select 1 from public.attempts attempt
      where attempt.id = attempt_id and attempt.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.attempts attempt
      where attempt.id = attempt_id and attempt.user_id = auth.uid()
    )
  );
create policy "teacher_read_attempt_answers" on public.attempt_answers
  for select to authenticated using (
    exists (
      select 1
      from public.attempts attempt
      join public.assignments assignment on assignment.id = attempt.assignment_id
      join public.classes class on class.id = assignment.class_id
      where attempt.id = attempt_id and class.owner_id = auth.uid()
    )
  );
create policy "review_owner_all" on public.review_cards
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists assignments_class_due_idx
  on public.assignments (class_id, due_at);
create index if not exists attempts_user_completed_idx
  on public.attempts (user_id, completed_at desc);
create index if not exists review_cards_due_idx
  on public.review_cards (user_id, due_at);
