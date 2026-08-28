-- Harden the canonical staff-login lookup boundary against transient PostgREST availability issues.
-- The lookup is read-only and idempotent; keep it deterministic and indexed.

create or replace function public.staff_login_lookup(p_username text, p_email text default null)
returns table(
  id uuid,
  auth_user_id uuid,
  email text,
  username text,
  role text,
  active boolean
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.auth_user_id, s.email, s.username, s.role, s.active
  from public.clinic_staff s
  where s.active = true
    and (
      (p_username is not null and lower(s.username) = lower(p_username))
      or (p_email is not null and lower(s.email) = lower(p_email))
    )
  order by case
    when p_username is not null and lower(s.username) = lower(p_username) then 0
    else 1
  end
  limit 1;
$$;

-- Explicitly preserve the two lookup indexes used by this function.
create index if not exists clinic_staff_username_active_lower_idx
  on public.clinic_staff (lower(username))
  where active = true and username is not null;

create index if not exists clinic_staff_email_active_lower_idx
  on public.clinic_staff (lower(trim(email)))
  where active = true and email is not null and trim(email) <> '';
