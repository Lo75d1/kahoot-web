-- Secure official-exam payload and server-side grading.

drop policy if exists "exam_attempt_student_read" on public.exam_attempts;
create policy "exam_attempt_student_read" on public.exam_attempts
  for select to authenticated using (
    student_id=auth.uid() and status in ('in_progress','published')
  );

create or replace function public.get_exam_payload(requested_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare attempt_row public.exam_attempts; session_row public.exam_sessions; quiz_row public.quizzes;
declare safe_questions jsonb := '[]'::jsonb; question jsonb; answer jsonb; safe_answers jsonb;
begin
  select * into attempt_row from public.exam_attempts where id=requested_attempt_id and student_id=auth.uid();
  if attempt_row.id is null or attempt_row.status <> 'in_progress' then raise exception 'Phiên thi không hợp lệ.'; end if;
  select * into session_row from public.exam_sessions where id=attempt_row.session_id;
  select * into quiz_row from public.quizzes where id=session_row.quiz_id;
  if quiz_row.workflow_status <> 'sealed' then raise exception 'Đề thi chưa được niêm phong.'; end if;
  for question in select value from jsonb_array_elements(quiz_row.questions)
  loop
    safe_answers := '[]'::jsonb;
    for answer in select value from jsonb_array_elements(coalesce(question->'answers','[]'::jsonb))
    loop
      safe_answers := safe_answers || jsonb_build_array(answer - 'correct');
    end loop;
    safe_questions := safe_questions || jsonb_build_array(
      (question - 'explanation' - 'hint' - 'sourceRefs' - 'confidence') || jsonb_build_object('answers',safe_answers)
    );
  end loop;
  return jsonb_build_object(
    'attemptId',attempt_row.id,
    'sessionId',session_row.id,
    'title',session_row.title,
    'durationMinutes',session_row.duration_minutes,
    'serverNow',now(),
    'deadline',least(session_row.ends_at,attempt_row.started_at + make_interval(mins=>session_row.duration_minutes)),
    'questions',safe_questions,
    'savedResponses',attempt_row.responses
  );
end;
$$;

drop function if exists public.submit_exam_attempt(uuid);
create function public.submit_exam_attempt(requested_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare attempt_row public.exam_attempts; quiz_questions jsonb; question jsonb; answer jsonb;
declare q_index integer := 0; a_index integer; selected_index integer; correct_index integer;
declare total integer := 0; correct_total integer := 0; score_value numeric(4,1); letter text;
begin
  select * into attempt_row from public.exam_attempts where id=requested_attempt_id and student_id=auth.uid() for update;
  if attempt_row.id is null or attempt_row.status <> 'in_progress' then raise exception 'Không thể nộp bài thi này.'; end if;
  select q.questions into quiz_questions
  from public.exam_sessions s join public.quizzes q on q.id=s.quiz_id
  where s.id=attempt_row.session_id and q.workflow_status='sealed';
  if quiz_questions is null then raise exception 'Không tìm thấy đề thi đã niêm phong.'; end if;
  for question in select value from jsonb_array_elements(quiz_questions)
  loop
    total := total + 1; correct_index := null; a_index := 0;
    for answer in select value from jsonb_array_elements(coalesce(question->'answers','[]'::jsonb))
    loop
      if coalesce((answer->>'correct')::boolean,false) and correct_index is null then correct_index := a_index; end if;
      a_index := a_index + 1;
    end loop;
    begin selected_index := (attempt_row.responses->>q_index::text)::integer; exception when others then selected_index := null; end;
    if selected_index is not null and selected_index=correct_index then correct_total := correct_total + 1; end if;
    q_index := q_index + 1;
  end loop;
  score_value := case when total=0 then 0 else round((correct_total::numeric/total::numeric)*10,1) end;
  letter := case when score_value>=8.5 then 'A' when score_value>=7 then 'B' when score_value>=5.5 then 'C' when score_value>=4 then 'D' else 'F' end;
  update public.exam_attempts set status='graded',submitted_at=now(),last_saved_at=now(),score_ten=score_value,grade_letter=letter
  where id=attempt_row.id;
  insert into public.exam_events(attempt_id,actor_id,event_type,detail)
  values(attempt_row.id,auth.uid(),'submitted',jsonb_build_object('answered',jsonb_object_length(attempt_row.responses)));
  perform public.audit_event('exam_attempt_submitted','exam_attempt',attempt_row.id::text,null,jsonb_build_object('scoreStored',true));
  return jsonb_build_object('receipt',attempt_row.id,'submittedAt',now(),'status','awaiting_publication');
end;
$$;

create or replace function public.set_exam_session_status(requested_session_id uuid, requested_status text)
returns public.exam_sessions language plpgsql security definer set search_path = public
as $$
declare row_value public.exam_sessions;
begin
  if not public.is_governance_role(array['assessment_officer','training_officer','admin']) then raise exception 'Bạn không có quyền điều hành ca thi.'; end if;
  if requested_status not in ('scheduled','open','paused','closed','cancelled') then raise exception 'Trạng thái ca thi không hợp lệ.'; end if;
  update public.exam_sessions set status=requested_status,
    opened_at=case when requested_status='open' then coalesce(opened_at,now()) else opened_at end,
    opened_by=case when requested_status='open' then auth.uid() else opened_by end,
    closed_at=case when requested_status='closed' then now() else closed_at end,
    closed_by=case when requested_status='closed' then auth.uid() else closed_by end
  where id=requested_session_id returning * into row_value;
  if row_value.id is null then raise exception 'Không tìm thấy ca thi.'; end if;
  perform public.audit_event('exam_session_'||requested_status,'exam_session',row_value.id::text,null,to_jsonb(row_value));
  return row_value;
end;
$$;

create or replace function public.publish_exam_results(requested_session_id uuid)
returns integer language plpgsql security definer set search_path = public
as $$
declare affected integer;
begin
  if not public.is_governance_role(array['assessment_officer','training_officer','admin']) then raise exception 'Bạn không có quyền công bố điểm.'; end if;
  update public.exam_attempts set status='published',published_at=now()
  where session_id=requested_session_id and status='graded';
  get diagnostics affected = row_count;
  perform public.audit_event('exam_results_published','exam_session',requested_session_id::text,null,jsonb_build_object('attempts',affected));
  return affected;
end;
$$;

revoke all on function public.get_exam_payload(uuid) from public;
revoke all on function public.set_exam_session_status(uuid,text) from public;
revoke all on function public.publish_exam_results(uuid) from public;
grant execute on function public.get_exam_payload(uuid) to authenticated;
grant execute on function public.set_exam_session_status(uuid,text) to authenticated;
grant execute on function public.publish_exam_results(uuid) to authenticated;
