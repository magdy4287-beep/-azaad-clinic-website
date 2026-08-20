-- Explicitly remove anonymous/public execution from privileged visit RPCs.
-- Authenticated staff remain allowed; function bodies enforce role and doctor scope.
revoke execute on function public.clinic_start_visit(uuid) from public, anon;
revoke execute on function public.clinic_end_visit(uuid) from public, anon;
revoke execute on function public.clinic_reschedule_booking_action(uuid,date,time,uuid,uuid,text) from public, anon;
grant execute on function public.clinic_start_visit(uuid) to authenticated;
grant execute on function public.clinic_end_visit(uuid) to authenticated;
grant execute on function public.clinic_reschedule_booking_action(uuid,date,time,uuid,uuid,text) to authenticated;
