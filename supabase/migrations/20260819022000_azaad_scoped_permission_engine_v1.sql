create or replace function private.clinic_has_scoped_permission(p_action_key text,p_department text default null,p_resource_type text default null,p_scope_type text default null)
returns boolean language sql stable security definer set search_path=public,pg_catalog as $$
  select exists (
    select 1 from public.clinic_staff s
    where s.auth_user_id=auth.uid() and s.active=true
      and (
        exists (
          select 1 from public.clinic_permission_scopes ps
          where ps.role=s.role and ps.action_key=p_action_key and ps.allowed=true
            and (ps.department is null or ps.department=s.department)
            and (ps.resource_type is null or ps.resource_type=p_resource_type)
            and (p_scope_type is null or ps.scope_type=p_scope_type)
        )
        or exists (
          select 1 from public.clinic_role_permissions rp
          where rp.role=s.role and rp.action_key=p_action_key and rp.allowed=true
        )
      )
  );
$$;
revoke all on function private.clinic_has_scoped_permission(text,text,text,text) from public;
grant execute on function private.clinic_has_scoped_permission(text,text,text,text) to authenticated;

create or replace function public.clinic_has_scoped_permission(p_action_key text,p_department text default null,p_resource_type text default null,p_scope_type text default null)
returns boolean language sql stable set search_path=public,pg_catalog as $$
  select private.clinic_has_scoped_permission(p_action_key,p_department,p_resource_type,p_scope_type);
$$;
revoke all on function public.clinic_has_scoped_permission(text,text,text,text) from public;
grant execute on function public.clinic_has_scoped_permission(text,text,text,text) to authenticated;

insert into public.clinic_permission_scopes(role,department,action_key,resource_type,scope_type,allowed)
select role,null,action_key,null,'global',allowed
from public.clinic_role_permissions
where action_key in ('workflow.manage','ai.view','ai.decide')
on conflict (role,department,action_key,resource_type,scope_type) do update set allowed=excluded.allowed;
