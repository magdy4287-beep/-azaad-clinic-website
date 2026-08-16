-- Scheduling/security hardening
-- Public/anonymous clients do not need direct access to the scheduling SECURITY DEFINER helpers.
-- Authenticated access is intentionally retained because the authenticated appointments Edge Function
-- forwards the user's JWT to these RPCs and the functions enforce the final authorization boundary.
revoke execute on function public.clinic_booking_action_scope(uuid) from anon;
revoke execute on function public.clinic_current_doctor_id() from anon;
revoke execute on function public.clinic_waiting_list_audit() from anon;

-- Cover scheduling-related foreign keys flagged by the Supabase performance advisor.
create index if not exists clinic_waiting_list_service_id_idx
  on public.clinic_waiting_list(service_id);
create index if not exists clinic_waiting_list_created_by_idx
  on public.clinic_waiting_list(created_by);
create index if not exists clinic_waiting_list_converted_booking_id_idx
  on public.clinic_waiting_list(converted_booking_id);

create index if not exists clinic_alerts_booking_id_idx
  on public.clinic_alerts(booking_id);

create index if not exists clinic_patient_transfers_booking_id_idx
  on public.clinic_patient_transfers(booking_id);
create index if not exists clinic_patient_transfers_from_doctor_id_idx
  on public.clinic_patient_transfers(from_doctor_id);

create index if not exists clinical_assessment_sessions_doctor_id_idx
  on public.clinical_assessment_sessions(doctor_id);
