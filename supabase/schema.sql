-- Chạy trong Supabase → SQL Editor → New query → Run.
-- Tạo bảng ngân hàng đề cho kahoot-web (M2b).

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.quizzes enable row level security;

-- DEMO: cho phép mọi người đọc/ghi (chưa có đăng nhập).
-- ⚠️ Ai có link cũng sửa được. Sẽ siết lại khi thêm Auth ở bước sau.
drop policy if exists "public read" on public.quizzes;
drop policy if exists "public insert" on public.quizzes;
drop policy if exists "public update" on public.quizzes;
drop policy if exists "public delete" on public.quizzes;

create policy "public read"   on public.quizzes for select using (true);
create policy "public insert" on public.quizzes for insert with check (true);
create policy "public update" on public.quizzes for update using (true);
create policy "public delete" on public.quizzes for delete using (true);
