-- Reassert the controlled clinical RPC execution boundary after DR/restore validation.
-- Keep the public and anon roles denied; authenticated and service_role may execute
-- the RPC, while the function body remains responsible for clinical authorization.
REVOKE EXECUTE ON FUNCTION public.clinic_frontdesk_checkin(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clinic_frontdesk_checkin(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.clinic_frontdesk_checkin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clinic_frontdesk_checkin(uuid, text) TO service_role;
