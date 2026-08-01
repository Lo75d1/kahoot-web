-- UDA Assessment Hub: organization, maker-checker review, sealed exams,
-- eligibility, proctoring events, grade changes, appeals and immutable audit.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,20}$'),
  name text not null check (char_length(name) between 2 and 160),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.departments (code, name) values
  ('CNTT', 'Khoa Công nghệ Thông tin'),
  ('QLDT', 'Phòng Quản lý đào tạo và Công tác sinh viên'),
  ('DBCL', 'Phòng Đảm bảo chất lượng - Thanh tra giáo dục - Pháp chế')
on conflict (code) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  university_id text unique,
  role text not null default 'lecturer'
    check (role in ('student', 'lecturer', 'department_head', 'assessment_officer', 'proctor', 'training_officer', 'quality_officer', 'admin')),
  department_id uuid references public.departments(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user_profile()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    case
      when new.raw_user_meta_data ->> 'requested_role' = 'student' then 'student'
      else 'lecturer'
    end
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

insert into public.profiles (id, full_name, role)
select id, split_part(coalesce(email, ''), '@', 1), 'lecturer'
from auth.users
on conflict (id) do nothing;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 2 and 30),
  name text not null check (char_length(name) between 2 and 180),
  credits numeric(3,1) not null default 3 check (credits > 0),
  department_id uuid references public.departments(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.quizzes
  add column if not exists course_id uuid references public.courses(id) on delete set null,
  add column if not exists workflow_status text not null default 'draft'
    check (workflow_status in ('draft', 'in_review', 'changes_requested', 'approved', 'sealed', 'retired')),
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists sealed_at timestamptz,
  add column if not exists sealed_by uuid references auth.users(id) on delete set null,
  add column if not exists content_hash text,
  add column if not exists version_no integer not null default 1 check (version_no > 0);

create table if not exists public.question_reviews (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approved', 'changes_requested')),
  comment text not null default '' check (char_length(comment) <= 4000),
  snapshot_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete restrict,
  quiz_id uuid not null references public.quizzes(id) on delete restrict,
  code text not null unique,
  title text not null check (char_length(title) between 2 and 180),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 480),
  status text not null default 'scheduled'
    check (status in ('draft', 'scheduled', 'open', 'paused', 'closed', 'cancelled')),
  settings jsonb not null default '{"shuffleQuestions":true,"shuffleAnswers":true,"fullscreen":true,"maxTabSwitches":3}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  opened_by uuid references auth.users(id) on delete restrict,
  closed_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  closed_at timestamptz,
  check (ends_at > starts_at)
);

create table if not exists public.exam_eligibility (
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  eligible boolean not null default true,
  reason text not null default '',
  attendance_percent numeric(5,2),
  component_zero boolean not null default false,
  checked_by uuid references auth.users(id) on delete set null,
  checked_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.exam_sessions(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'auto_submitted', 'void', 'graded', 'published')),
  question_order jsonb not null default '[]'::jsonb,
  answer_orders jsonb not null default '{}'::jsonb,
  responses jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_ten numeric(4,1) check (score_ten between 0 and 10),
  grade_letter text check (grade_letter in ('A', 'B', 'C', 'D', 'F')),
  published_at timestamptz,
  integrity_flags jsonb not null default '[]'::jsonb,
  unique (session_id, student_id)
);

create table if not exists public.exam_events (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('started', 'autosaved', 'tab_hidden', 'fullscreen_exit', 'reconnected', 'submitted', 'auto_submitted', 'proctor_note', 'paused', 'resumed')),
  detail jsonb not null default '{}'::jsonb,
  client_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.grade_changes (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete restrict,
  old_score numeric(4,1),
  requested_score numeric(4,1) not null check (requested_score between 0 and 10),
  reason text not null check (char_length(reason) between 10 and 2000),
  requested_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (approved_by is null or approved_by <> requested_by)
);

create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete restrict,
  student_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (char_length(reason) between 10 and 3000),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'resolved', 'rejected')),
  resolution text not null default '',
  resolved_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (attempt_id, student_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and active $$;

create or replace function public.protect_governed_quiz()
returns trigger language plpgsql set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.workflow_status in ('in_review','approved','sealed') and current_user <> 'postgres' then
    raise exception 'Đề đang trong quy trình kiểm duyệt, không thể xóa.';
  end if;
  if tg_op = 'UPDATE' and current_user <> 'postgres' then
    if new.workflow_status <> old.workflow_status then
      raise exception 'Trạng thái đề chỉ được thay đổi qua quy trình kiểm duyệt.';
    end if;
    if old.workflow_status not in ('draft','changes_requested') and
       (new.title,new.description,new.questions) is distinct from (old.title,old.description,old.questions) then
      raise exception 'Nội dung đã gửi duyệt hoặc niêm phong không thể sửa.';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

drop trigger if exists protect_governed_quiz_trigger on public.quizzes;
create trigger protect_governed_quiz_trigger
  before update or delete on public.quizzes
  for each row execute function public.protect_governed_quiz();

create or replace function public.is_governance_role(allowed text[])
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() = any(allowed), false) $$;

create or replace function public.audit_event(
  requested_action text, requested_entity_type text, requested_entity_id text,
  requested_before jsonb default null, requested_after jsonb default null,
  requested_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data, metadata)
  values(auth.uid(), requested_action, requested_entity_type, requested_entity_id, requested_before, requested_after, requested_metadata);
end;
$$;

create or replace function public.submit_quiz_for_review(requested_quiz_id uuid)
returns public.quizzes language plpgsql security definer set search_path = public
as $$
declare q public.quizzes; digest_value text;
begin
  select * into q from public.quizzes where id = requested_quiz_id for update;
  if q.id is null or q.owner_id <> auth.uid() then raise exception 'Bạn không có quyền gửi duyệt bộ đề này.'; end if;
  if q.workflow_status not in ('draft', 'changes_requested') then raise exception 'Trạng thái hiện tại không thể gửi duyệt.'; end if;
  digest_value := encode(extensions.digest(convert_to(coalesce(q.title,'') || coalesce(q.description,'') || coalesce(q.questions::text,''), 'UTF8'), 'sha256'), 'hex');
  update public.quizzes set workflow_status='in_review', submitted_at=now(), content_hash=digest_value where id=q.id returning * into q;
  perform public.audit_event('quiz_submitted','quiz',q.id::text,null,to_jsonb(q));
  return q;
end;
$$;

create or replace function public.review_quiz(requested_quiz_id uuid, requested_decision text, requested_comment text default '')
returns public.quizzes language plpgsql security definer set search_path = public
as $$
declare q public.quizzes; reviewer_role text; digest_value text;
begin
  reviewer_role := public.current_role();
  if reviewer_role not in ('department_head','assessment_officer','quality_officer','admin') then raise exception 'Bạn không có quyền phản biện đề.'; end if;
  if requested_decision not in ('approved','changes_requested') then raise exception 'Quyết định không hợp lệ.'; end if;
  select * into q from public.quizzes where id=requested_quiz_id for update;
  if q.id is null or q.workflow_status <> 'in_review' then raise exception 'Đề không ở trạng thái chờ duyệt.'; end if;
  if q.owner_id = auth.uid() then raise exception 'Người ra đề không được tự duyệt đề.'; end if;
  digest_value := encode(extensions.digest(convert_to(coalesce(q.title,'') || coalesce(q.description,'') || coalesce(q.questions::text,''), 'UTF8'), 'sha256'), 'hex');
  if digest_value <> q.content_hash then raise exception 'Nội dung đã thay đổi sau khi gửi duyệt.'; end if;
  insert into public.question_reviews(quiz_id,reviewer_id,decision,comment,snapshot_hash)
  values(q.id,auth.uid(),requested_decision,left(coalesce(requested_comment,''),4000),digest_value);
  update public.quizzes set workflow_status=requested_decision,
    approved_at=case when requested_decision='approved' then now() else null end,
    approved_by=case when requested_decision='approved' then auth.uid() else null end
  where id=q.id returning * into q;
  perform public.audit_event('quiz_'||requested_decision,'quiz',q.id::text,null,to_jsonb(q));
  return q;
end;
$$;

create or replace function public.seal_quiz(requested_quiz_id uuid)
returns public.quizzes language plpgsql security definer set search_path = public
as $$
declare q public.quizzes;
begin
  if not public.is_governance_role(array['assessment_officer','admin']) then raise exception 'Chỉ bộ phận khảo thí được niêm phong đề.'; end if;
  select * into q from public.quizzes where id=requested_quiz_id for update;
  if q.workflow_status <> 'approved' then raise exception 'Đề phải được duyệt trước khi niêm phong.'; end if;
  if q.owner_id = auth.uid() or q.approved_by = auth.uid() then raise exception 'Niêm phong yêu cầu người độc lập với người ra/duyệt đề.'; end if;
  update public.quizzes set workflow_status='sealed',sealed_at=now(),sealed_by=auth.uid() where id=q.id returning * into q;
  perform public.audit_event('quiz_sealed','quiz',q.id::text,null,to_jsonb(q));
  return q;
end;
$$;

create or replace function public.start_exam_attempt(requested_session_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare session_row public.exam_sessions; eligibility_row public.exam_eligibility; attempt_id uuid;
begin
  if public.current_role() <> 'student' then raise exception 'Chỉ tài khoản sinh viên được bắt đầu bài thi.'; end if;
  select * into session_row from public.exam_sessions where id=requested_session_id;
  if session_row.id is null or session_row.status <> 'open' or now() not between session_row.starts_at and session_row.ends_at then raise exception 'Ca thi chưa mở hoặc đã kết thúc.'; end if;
  select * into eligibility_row from public.exam_eligibility where session_id=requested_session_id and student_id=auth.uid();
  if eligibility_row.session_id is null or not eligibility_row.eligible then raise exception 'Bạn không đủ điều kiện dự thi.'; end if;
  insert into public.exam_attempts(session_id,student_id)
  values(requested_session_id,auth.uid()) on conflict(session_id,student_id) do update set last_saved_at=now()
  returning id into attempt_id;
  insert into public.exam_events(attempt_id,actor_id,event_type) values(attempt_id,auth.uid(),'started');
  perform public.audit_event('exam_attempt_started','exam_attempt',attempt_id::text,null,null);
  return attempt_id;
end;
$$;

create or replace function public.save_exam_responses(requested_attempt_id uuid, requested_responses jsonb, requested_event text default 'autosaved')
returns timestamptz language plpgsql security definer set search_path = public
as $$
declare saved_at timestamptz := now();
begin
  update public.exam_attempts set responses=requested_responses,last_saved_at=saved_at
  where id=requested_attempt_id and student_id=auth.uid() and status='in_progress';
  if not found then raise exception 'Bài thi không còn nhận câu trả lời.'; end if;
  insert into public.exam_events(attempt_id,actor_id,event_type)
  values(requested_attempt_id,auth.uid(),case when requested_event in ('tab_hidden','fullscreen_exit','reconnected') then requested_event else 'autosaved' end);
  return saved_at;
end;
$$;

create or replace function public.submit_exam_attempt(requested_attempt_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.exam_attempts set status='submitted',submitted_at=now(),last_saved_at=now()
  where id=requested_attempt_id and student_id=auth.uid() and status='in_progress';
  if not found then raise exception 'Không thể nộp bài thi này.'; end if;
  insert into public.exam_events(attempt_id,actor_id,event_type) values(requested_attempt_id,auth.uid(),'submitted');
  perform public.audit_event('exam_attempt_submitted','exam_attempt',requested_attempt_id::text,null,null);
end;
$$;

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.question_reviews enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.exam_eligibility enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_events enable row level security;
alter table public.grade_changes enable row level security;
alter table public.appeals enable row level security;
alter table public.audit_logs enable row level security;

create policy "departments_authenticated_read" on public.departments for select to authenticated using (true);
create policy "courses_authenticated_read" on public.courses for select to authenticated using (true);
create policy "profiles_self_read" on public.profiles for select to authenticated using (id=auth.uid());
create policy "profiles_governance_read" on public.profiles for select to authenticated using (public.is_governance_role(array['training_officer','quality_officer','admin']));
create policy "profiles_admin_manage" on public.profiles for all to authenticated using (public.current_role()='admin') with check (public.current_role()='admin');
create policy "reviews_participant_read" on public.question_reviews for select to authenticated using (reviewer_id=auth.uid() or public.is_governance_role(array['department_head','assessment_officer','quality_officer','admin']));
create policy "governance_quiz_read" on public.quizzes for select to authenticated using (public.is_governance_role(array['department_head','assessment_officer','quality_officer','admin']));
create policy "sessions_authenticated_read" on public.exam_sessions for select to authenticated using (true);
create policy "sessions_governance_manage" on public.exam_sessions for all to authenticated using (public.is_governance_role(array['assessment_officer','training_officer','admin'])) with check (public.is_governance_role(array['assessment_officer','training_officer','admin']));
create policy "eligibility_student_read" on public.exam_eligibility for select to authenticated using (student_id=auth.uid() or public.is_governance_role(array['assessment_officer','training_officer','proctor','admin']));
create policy "eligibility_governance_manage" on public.exam_eligibility for all to authenticated using (public.is_governance_role(array['assessment_officer','training_officer','admin'])) with check (public.is_governance_role(array['assessment_officer','training_officer','admin']));
create policy "exam_attempt_student_read" on public.exam_attempts for select to authenticated using (student_id=auth.uid());
create policy "exam_attempt_staff_read" on public.exam_attempts for select to authenticated using (public.is_governance_role(array['assessment_officer','training_officer','proctor','quality_officer','admin']));
create policy "exam_events_related_read" on public.exam_events for select to authenticated using (actor_id=auth.uid() or public.is_governance_role(array['assessment_officer','proctor','quality_officer','admin']));
create policy "grade_changes_related_read" on public.grade_changes for select to authenticated using (requested_by=auth.uid() or approved_by=auth.uid() or public.is_governance_role(array['assessment_officer','quality_officer','admin']));
create policy "appeals_student_insert" on public.appeals for insert to authenticated with check (student_id=auth.uid());
create policy "appeals_related_read" on public.appeals for select to authenticated using (student_id=auth.uid() or public.is_governance_role(array['assessment_officer','quality_officer','admin']));
create policy "appeals_governance_update" on public.appeals for update to authenticated using (public.is_governance_role(array['assessment_officer','quality_officer','admin'])) with check (public.is_governance_role(array['assessment_officer','quality_officer','admin']));
create policy "audit_governance_read" on public.audit_logs for select to authenticated using (public.is_governance_role(array['quality_officer','admin']));

revoke all on function public.submit_quiz_for_review(uuid) from public;
revoke all on function public.review_quiz(uuid,text,text) from public;
revoke all on function public.seal_quiz(uuid) from public;
revoke all on function public.start_exam_attempt(uuid) from public;
revoke all on function public.save_exam_responses(uuid,jsonb,text) from public;
revoke all on function public.submit_exam_attempt(uuid) from public;
grant execute on function public.submit_quiz_for_review(uuid) to authenticated;
grant execute on function public.review_quiz(uuid,text,text) to authenticated;
grant execute on function public.seal_quiz(uuid) to authenticated;
grant execute on function public.start_exam_attempt(uuid) to authenticated;
grant execute on function public.save_exam_responses(uuid,jsonb,text) to authenticated;
grant execute on function public.submit_exam_attempt(uuid) to authenticated;

create index if not exists quizzes_workflow_idx on public.quizzes(workflow_status,submitted_at desc);
create index if not exists reviews_quiz_idx on public.question_reviews(quiz_id,created_at desc);
create index if not exists exam_sessions_status_time_idx on public.exam_sessions(status,starts_at);
create index if not exists exam_attempts_session_status_idx on public.exam_attempts(session_id,status);
create index if not exists exam_events_attempt_time_idx on public.exam_events(attempt_id,created_at);
create index if not exists audit_entity_idx on public.audit_logs(entity_type,entity_id,created_at desc);
