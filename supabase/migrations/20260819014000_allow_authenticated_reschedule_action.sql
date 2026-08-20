-- Rescheduling is already permission-gated and doctor-scoped inside the SECURITY DEFINER function.
-- Expose only the authenticated execution path so Secretary/Front Desk can reschedule
-- through the canonical backend mutation instead of bypassing scheduling controls.
GRANT EXECUTE ON FUNCTION public.clinic_reschedule_booking_action(uuid,date,time without time zone,uuid,uuid,text) TO authenticated;
