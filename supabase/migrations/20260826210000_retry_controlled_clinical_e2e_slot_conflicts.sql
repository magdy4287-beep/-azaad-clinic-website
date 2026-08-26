-- Controlled clinical E2E fixture creation can race with another active booking
-- between candidate selection and the canonical booking-overlap trigger.
-- Retry only the expected slot-conflict condition; never swallow other
-- uniqueness/auth/data errors.
create or replace function public.clinic_prepare_controlled_clinical_e2e_suite()
returns jsonb
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_attempt integer;
  v_result jsonb;
begin
  for v_attempt in 1..8 loop
    begin
      v_result := private.clinic_prepare_controlled_clinical_e2e_suite();
      return v_result;
    exception
      when unique_violation then
        if sqlerrm <> 'BOOKING_SLOT_CONFLICT' then
          raise;
        end if;
        if v_attempt = 8 then
          raise;
        end if;
    end;
  end loop;

  raise exception 'E2E_FIXTURE_RETRY_EXHAUSTED';
end;
$$;
