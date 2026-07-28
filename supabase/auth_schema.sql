-- Thêm quyền sở hữu đề cho giáo viên (Supabase Auth email+password).

alter table public.quizzes
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Bỏ policy công khai cũ
drop policy if exists "public read" on public.quizzes;
drop policy if exists "public insert" on public.quizzes;
drop policy if exists "public update" on public.quizzes;
drop policy if exists "public delete" on public.quizzes;
drop policy if exists "public all" on public.quizzes;

-- Chỉ chủ sở hữu (đã đăng nhập) mới thao tác đề của mình
create policy "own_select" on public.quizzes
  for select to authenticated using (auth.uid() = owner_id);
create policy "own_insert" on public.quizzes
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "own_update" on public.quizzes
  for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "own_delete" on public.quizzes
  for delete to authenticated using (auth.uid() = owner_id);

-- Dọn các đề cũ chưa có chủ (trước khi có auth)
delete from public.quizzes where owner_id is null;
