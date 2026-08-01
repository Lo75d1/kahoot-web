-- Complete assessment operations: eligibility, proctoring, appeals and
-- maker-checker grade corrections. All mutations go through audited RPCs.

drop policy if exists "sessions_authenticated_read" on public.exam_sessions;
create policy "sessions_scoped_read" on public.exam_sessions
  for select to authenticated using (
    public.current_role() <> 'student'
    or exists (
      select 1 from public.exam_eligibility e
      where e.session_id=exam_sessions.id and e.student_id=auth.uid()
    )
  );

create or replace function public.set_exam_eligibility(
  requested_session_id uuid,
  requested_student_id uuid,
  requested_eligible boolean,
  requested_reason text default '',
  requested_attendance_percent numeric default null,
  requested_component_zero boolean default false
) returns public.exam_eligibility language plpgsql security definer set search_path=public
as $$
declare result public.exam_eligibility;
begin
  if not public.is_governance_role(array['assessment_officer','training_officer','admin']) then
    raise exception 'Bạn không có quyền xác nhận điều kiện dự thi.';
  end if;
  if not exists(select 1 from public.profiles where id=requested_student_id and role='student' and active) then
    raise exception 'Không tìm thấy sinh viên đang hoạt động.';
  end if;
  insert into public.exam_eligibility(session_id,student_id,eligible,reason,attendance_percent,component_zero,checked_by,checked_at)
  values(requested_session_id,requested_student_id,requested_eligible,left(coalesce(requested_reason,''),1000),requested_attendance_percent,requested_component_zero,auth.uid(),now())
  on conflict(session_id,student_id) do update set
    eligible=excluded.eligible,reason=excluded.reason,attendance_percent=excluded.attendance_percent,
    component_zero=excluded.component_zero,checked_by=auth.uid(),checked_at=now()
  returning * into result;
  perform public.audit_event('eligibility_set','exam_session',requested_session_id::text,null,to_jsonb(result));
  return result;
end;
$$;

create or replace function public.record_proctor_note(
  requested_attempt_id uuid,
  requested_note text,
  requested_severity text default 'info'
) returns bigint language plpgsql security definer set search_path=public
as $$
declare result_id bigint;
begin
  if not public.is_governance_role(array['proctor','assessment_officer','admin']) then
    raise exception 'Chỉ giám thị hoặc cán bộ khảo thí được lập biên bản.';
  end if;
  if char_length(trim(requested_note)) < 5 then raise exception 'Nội dung biên bản quá ngắn.'; end if;
  if requested_severity not in ('info','warning','critical') then raise exception 'Mức độ không hợp lệ.'; end if;
  insert into public.exam_events(attempt_id,actor_id,event_type,detail)
  values(requested_attempt_id,auth.uid(),'proctor_note',jsonb_build_object('note',left(trim(requested_note),2000),'severity',requested_severity))
  returning id into result_id;
  perform public.audit_event('proctor_note_added','exam_attempt',requested_attempt_id::text,null,jsonb_build_object('eventId',result_id,'severity',requested_severity));
  return result_id;
end;
$$;

create or replace function public.submit_grade_change(
  requested_attempt_id uuid, requested_score numeric, requested_reason text
) returns public.grade_changes language plpgsql security definer set search_path=public
as $$
declare attempt_row public.exam_attempts; result public.grade_changes;
begin
  if not public.is_governance_role(array['lecturer','department_head','assessment_officer','quality_officer','admin']) then
    raise exception 'Bạn không có quyền đề nghị điều chỉnh điểm.';
  end if;
  if requested_score < 0 or requested_score > 10 then raise exception 'Điểm phải từ 0 đến 10.'; end if;
  if char_length(trim(requested_reason)) < 10 then raise exception 'Lý do phải có ít nhất 10 ký tự.'; end if;
  select * into attempt_row from public.exam_attempts where id=requested_attempt_id;
  if attempt_row.id is null or attempt_row.status not in ('graded','published') then raise exception 'Bài thi chưa có điểm hợp lệ.'; end if;
  if exists(select 1 from public.grade_changes where attempt_id=requested_attempt_id and status='pending') then raise exception 'Đã có một đề nghị đang chờ duyệt.'; end if;
  insert into public.grade_changes(attempt_id,old_score,requested_score,reason,requested_by)
  values(requested_attempt_id,attempt_row.score_ten,round(requested_score,1),trim(requested_reason),auth.uid()) returning * into result;
  perform public.audit_event('grade_change_requested','exam_attempt',requested_attempt_id::text,null,to_jsonb(result));
  return result;
end;
$$;

create or replace function public.decide_grade_change(requested_change_id uuid, requested_approve boolean)
returns public.grade_changes language plpgsql security definer set search_path=public
as $$
declare change_row public.grade_changes; letter text;
begin
  if not public.is_governance_role(array['assessment_officer','quality_officer','admin']) then raise exception 'Bạn không có quyền duyệt điều chỉnh điểm.'; end if;
  select * into change_row from public.grade_changes where id=requested_change_id for update;
  if change_row.id is null or change_row.status <> 'pending' then raise exception 'Đề nghị không còn ở trạng thái chờ duyệt.'; end if;
  if change_row.requested_by=auth.uid() then raise exception 'Người đề nghị không được tự duyệt thay đổi điểm.'; end if;
  update public.grade_changes set status=case when requested_approve then 'approved' else 'rejected' end,
    approved_by=auth.uid(),decided_at=now() where id=change_row.id returning * into change_row;
  if requested_approve then
    letter := case when change_row.requested_score>=8.5 then 'A' when change_row.requested_score>=7 then 'B' when change_row.requested_score>=5.5 then 'C' when change_row.requested_score>=4 then 'D' else 'F' end;
    update public.exam_attempts set score_ten=change_row.requested_score,grade_letter=letter where id=change_row.attempt_id;
  end if;
  perform public.audit_event(case when requested_approve then 'grade_change_approved' else 'grade_change_rejected' end,'grade_change',change_row.id::text,null,to_jsonb(change_row));
  return change_row;
end;
$$;

create or replace function public.submit_exam_appeal(requested_attempt_id uuid, requested_reason text)
returns public.appeals language plpgsql security definer set search_path=public
as $$
declare result public.appeals;
begin
  if public.current_role() <> 'student' then raise exception 'Chỉ sinh viên được gửi phúc khảo.'; end if;
  if char_length(trim(requested_reason)) < 10 then raise exception 'Lý do phải có ít nhất 10 ký tự.'; end if;
  if not exists(select 1 from public.exam_attempts where id=requested_attempt_id and student_id=auth.uid() and status='published') then raise exception 'Chỉ được phúc khảo bài thi đã công bố điểm.'; end if;
  insert into public.appeals(attempt_id,student_id,reason) values(requested_attempt_id,auth.uid(),trim(requested_reason)) returning * into result;
  perform public.audit_event('appeal_submitted','exam_attempt',requested_attempt_id::text,null,to_jsonb(result));
  return result;
end;
$$;

create or replace function public.resolve_exam_appeal(requested_appeal_id uuid, requested_status text, requested_resolution text)
returns public.appeals language plpgsql security definer set search_path=public
as $$
declare result public.appeals;
begin
  if not public.is_governance_role(array['assessment_officer','quality_officer','admin']) then raise exception 'Bạn không có quyền xử lý phúc khảo.'; end if;
  if requested_status not in ('reviewing','resolved','rejected') then raise exception 'Trạng thái không hợp lệ.'; end if;
  if requested_status in ('resolved','rejected') and char_length(trim(requested_resolution)) < 10 then raise exception 'Kết luận phải có ít nhất 10 ký tự.'; end if;
  update public.appeals set status=requested_status,resolution=trim(requested_resolution),
    resolved_by=case when requested_status in ('resolved','rejected') then auth.uid() else null end,
    resolved_at=case when requested_status in ('resolved','rejected') then now() else null end
  where id=requested_appeal_id and status in ('submitted','reviewing') returning * into result;
  if result.id is null then raise exception 'Không tìm thấy phúc khảo đang xử lý.'; end if;
  perform public.audit_event('appeal_'||requested_status,'appeal',result.id::text,null,to_jsonb(result));
  return result;
end;
$$;

revoke all on function public.set_exam_eligibility(uuid,uuid,boolean,text,numeric,boolean) from public;
revoke all on function public.record_proctor_note(uuid,text,text) from public;
revoke all on function public.submit_grade_change(uuid,numeric,text) from public;
revoke all on function public.decide_grade_change(uuid,boolean) from public;
revoke all on function public.submit_exam_appeal(uuid,text) from public;
revoke all on function public.resolve_exam_appeal(uuid,text,text) from public;
grant execute on function public.set_exam_eligibility(uuid,uuid,boolean,text,numeric,boolean) to authenticated;
grant execute on function public.record_proctor_note(uuid,text,text) to authenticated;
grant execute on function public.submit_grade_change(uuid,numeric,text) to authenticated;
grant execute on function public.decide_grade_change(uuid,boolean) to authenticated;
grant execute on function public.submit_exam_appeal(uuid,text) to authenticated;
grant execute on function public.resolve_exam_appeal(uuid,text,text) to authenticated;
