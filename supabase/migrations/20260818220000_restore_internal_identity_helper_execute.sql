-- Internal identity helpers are SECURITY DEFINER and intentionally not exposed as public RPCs.
-- They are called by protected application RPCs and by authenticated table defaults/policies,
-- so authenticated must retain EXECUTE on the helpers themselves. They return only the
-- caller's own staff/doctor UUID and remain unavailable to anon.
revoke execute on function public.clinic_current_staff_id() from anon;
revoke execute on function public.clinic_current_doctor_id() from anon;
grant execute on function public.clinic_current_staff_id() to authenticated;
grant execute on function public.clinic_current_doctor_id() to authenticated;

alter function public.clinic_current_staff_id() set search_path = public, pg_catalog;
alter function public.clinic_current_doctor_id() set search_path = public, pg_catalog;
