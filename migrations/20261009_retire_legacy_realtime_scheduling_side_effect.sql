-- AZAAD canonical scheduling boundary repair.
-- Root cause: legacy DB trigger function called realtime.send(), but the canonical
-- Neon production database intentionally has no realtime schema.
-- The application uses same-origin BroadcastChannel + polling for scheduling
-- invalidation, so the legacy DB realtime side effect is not part of the
-- canonical runtime contract.
--
-- This migration is intentionally non-destructive: it preserves the existing
-- trigger/function names and replaces the obsolete side effect with a pure
-- trigger-safe return. A later cleanup can remove the legacy trigger/function
-- only after dependency evidence proves they are no longer referenced.

create or replace function public.broadcast_scheduling_invalidation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return coalesce(new, old);
end;
$function$;

-- Regression contract:
-- 1. No reference to schema realtime remains in the function body.
-- 2. Existing scheduling triggers remain attached to their tables.
-- 3. INSERT/UPDATE/DELETE trigger execution can no longer abort because
--    realtime.send() is unavailable.
