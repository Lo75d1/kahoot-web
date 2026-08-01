-- Supabase installs pgcrypto in the extensions schema. Live RPCs use digest(),
-- so include that schema in each security-definer function search path.

alter function public.create_live_room(text, text, jsonb, text)
  set search_path = public, extensions;
alter function public.join_live_room(text, text, text, text)
  set search_path = public, extensions;
alter function public.control_live_room(uuid, text, text)
  set search_path = public, extensions;
alter function public.submit_live_answer(uuid, uuid, text, integer)
  set search_path = public, extensions;
