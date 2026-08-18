-- Restore the execute grant required by RLS policies that call clinic_has_permission().
-- The helper remains SECURITY DEFINER and is not exposed to anon/public.
grant execute on function public.clinic_has_permission(text) to authenticated;
