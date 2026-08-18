-- Tighten scheduling RLS to avoid overlapping permissive SELECT policies and add missing audit FK indexes.

 drop policy if exists doctor_weekly_schedules_manage on public.doctor_weekly_schedules;
 create policy doctor_weekly_schedules_manage on public.doctor_weekly_schedules for insert to authenticated with check ((select public.clinic_has_permission('security')));
 create policy doctor_weekly_schedules_manage_update on public.doctor_weekly_schedules for update to authenticated using ((select public.clinic_has_permission('security'))) with check ((select public.clinic_has_permission('security')));
 create policy doctor_weekly_schedules_manage_delete on public.doctor_weekly_schedules for delete to authenticated using ((select public.clinic_has_permission('security')));

 drop policy if exists doctor_schedule_overrides_manage on public.doctor_schedule_overrides;
 create policy doctor_schedule_overrides_manage on public.doctor_schedule_overrides for insert to authenticated with check ((select public.clinic_has_permission('security')));
 create policy doctor_schedule_overrides_manage_update on public.doctor_schedule_overrides for update to authenticated using ((select public.clinic_has_permission('security'))) with check ((select public.clinic_has_permission('security')));
 create policy doctor_schedule_overrides_manage_delete on public.doctor_schedule_overrides for delete to authenticated using ((select public.clinic_has_permission('security')));

 create index if not exists clinic_account_security_audit_actor_staff_idx on public.clinic_account_security_audit(actor_staff_id);
 create index if not exists clinic_patient_profile_audit_actor_user_idx on public.clinic_patient_profile_audit(actor_user_id);
