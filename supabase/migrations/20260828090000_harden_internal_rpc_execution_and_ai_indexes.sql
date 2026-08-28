-- AZAAD production hardening: internal SECURITY DEFINER RPC boundaries.
-- These helpers are trigger/lifecycle or authenticated workflow internals, not public RPC APIs.
REVOKE EXECUTE ON FUNCTION public.apply_default_doctor_booking_settings() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_default_doctor_booking_settings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_default_doctor_services() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_default_doctor_services() FROM anon;
REVOKE EXECUTE ON FUNCTION public.broadcast_scheduling_invalidation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.broadcast_scheduling_invalidation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.clinic_doctor_service_defaults_on_write() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_doctor_service_defaults_on_write() FROM anon;
REVOKE EXECUTE ON FUNCTION public.clinic_doctor_service_is_enabled(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_doctor_service_is_enabled(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clinic_guard_doctor_schedule_active() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_guard_doctor_schedule_active() FROM anon;
REVOKE EXECUTE ON FUNCTION public.clinic_rebook_followup(uuid, date, time without time zone, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_rebook_followup(uuid, date, time without time zone, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clinic_sync_doctor_schedule_lifecycle() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_sync_doctor_schedule_lifecycle() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_inactive_doctor_no_public_schedule() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_inactive_doctor_no_public_schedule() FROM anon;

-- Cover the AI actor foreign keys identified by the production performance advisor.
CREATE INDEX IF NOT EXISTS clinic_ai_recommendations_human_actor_staff_id_idx
  ON public.clinic_ai_recommendations (human_actor_staff_id);
CREATE INDEX IF NOT EXISTS clinic_ai_usage_events_actor_staff_id_idx
  ON public.clinic_ai_usage_events (actor_staff_id);
