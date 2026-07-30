-- Additive compatibility migration for richer question-set metadata.
alter table public.quizzes
  add column if not exists version integer not null default 1,
  add column if not exists tags text[] not null default '{}';

alter table public.quizzes
  drop constraint if exists quizzes_version_check;
alter table public.quizzes
  add constraint quizzes_version_check check (version >= 1);

create index if not exists quizzes_owner_updated_idx
  on public.quizzes (owner_id, updated_at desc);
create index if not exists quizzes_tags_gin_idx
  on public.quizzes using gin (tags);
