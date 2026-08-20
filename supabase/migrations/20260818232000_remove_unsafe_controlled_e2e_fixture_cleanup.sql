DO $$
declare
  v_def text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
    into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'clinic_prepare_controlled_clinical_e2e_suite'
    and p.pronargs = 0;

  if v_def is null then
    raise exception 'Controlled clinical E2E fixture factory is missing';
  end if;

  v_new := regexp_replace(v_def, E'\\n[[:space:]]*delete from public\\.clinic_bookings[^;]*;', '', 'g');
  v_new := regexp_replace(v_new, E'\\n[[:space:]]*delete from public\\.clinic_patients[^;]*;', '', 'g');

  if v_new = v_def then
    raise exception 'Controlled E2E fixture cleanup statements were not found; refusing a no-op migration';
  end if;

  execute v_new;
end $$;
