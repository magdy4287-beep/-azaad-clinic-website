CREATE SCHEMA IF NOT EXISTS private;

DO $$
DECLARE
  r record;
  v_def text;
  v_call text;
  v_wrapper text;
  v_volatility text;
  i int;
BEGIN
  FOR r IN
    SELECT f.oid,
           f.proname,
           pg_get_function_identity_arguments(f.oid) AS identity_args,
           pg_get_function_arguments(f.oid) AS function_args,
           pg_get_function_result(f.oid) AS return_type,
           f.proargnames,
           f.provolatile
    FROM pg_proc f
    JOIN pg_namespace n ON n.oid=f.pronamespace
    WHERE n.nspname='public'
      AND f.proname IN (
        'clinic_current_doctor_id',
        'clinic_current_staff_id',
        'clinic_frontdesk_checkin',
        'clinic_has_permission',
        'clinic_prepare_controlled_clinical_e2e_suite',
        'clinic_start_clinical_visit',
        'clinic_update_patient_demographics',
        'owner_set_staff_account_status'
      )
      AND f.prosecdef=true
  LOOP
    v_def := replace(
      pg_get_functiondef(r.oid),
      'CREATE OR REPLACE FUNCTION public.'||r.proname,
      'CREATE OR REPLACE FUNCTION private.'||r.proname
    );
    EXECUTE v_def;

    v_call := '';
    IF r.proargnames IS NOT NULL THEN
      FOR i IN 1..array_length(r.proargnames,1) LOOP
        IF i > 1 THEN v_call := v_call || ', '; END IF;
        v_call := v_call || format('%I', r.proargnames[i]);
      END LOOP;
    END IF;

    v_volatility := CASE r.provolatile
      WHEN 'i' THEN 'IMMUTABLE'
      WHEN 's' THEN 'STABLE'
      ELSE 'VOLATILE'
    END;

    v_wrapper := format(
      'CREATE OR REPLACE FUNCTION public.%I(%s) RETURNS %s LANGUAGE sql %s SECURITY INVOKER SET search_path TO public, pg_catalog AS %L',
      r.proname,
      r.function_args,
      r.return_type,
      v_volatility,
      CASE
        WHEN r.return_type IN ('jsonb','boolean','uuid')
          THEN format('SELECT private.%I(%s);', r.proname, v_call)
        ELSE format('SELECT * FROM private.%I(%s);', r.proname, v_call)
      END
    );
    EXECUTE v_wrapper;

    EXECUTE format('REVOKE ALL ON FUNCTION private.%I(%s) FROM PUBLIC, anon, authenticated', r.proname, r.identity_args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION private.%I(%s) TO authenticated', r.proname, r.identity_args);
  END LOOP;
END $$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
