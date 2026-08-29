-- The public clinical-visit RPC is an authenticated wrapper around the private SECURITY DEFINER implementation.
-- The wrapper itself has authenticated EXECUTE, but the private implementation must also be executable
-- by the calling role because the wrapper is SECURITY INVOKER.
GRANT EXECUTE ON FUNCTION private.clinic_start_clinical_visit(uuid) TO authenticated, service_role;
