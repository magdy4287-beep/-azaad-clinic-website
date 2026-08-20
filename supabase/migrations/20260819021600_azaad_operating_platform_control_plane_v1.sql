alter table public.clinic_staff add column if not exists department text;
alter table public.clinic_staff add column if not exists job_title text;
alter table public.clinic_staff add column if not exists public_profile_enabled boolean not null default false;
create index if not exists clinic_staff_department_idx on public.clinic_staff(department) where active=true;

create table if not exists public.clinic_permission_scopes (
  id uuid primary key default gen_random_uuid(), role text not null, department text,
  action_key text not null references public.clinic_ui_action_catalog(action_key) on delete cascade,
  resource_type text, scope_type text not null default 'department' check(scope_type in ('global','department','assigned','self','patient','visit','financial')),
  allowed boolean not null default true, created_at timestamptz not null default now(),
  unique(role,department,action_key,resource_type,scope_type)
);
alter table public.clinic_permission_scopes enable row level security;
drop policy if exists clinic_permission_scopes_staff on public.clinic_permission_scopes;
create policy clinic_permission_scopes_staff on public.clinic_permission_scopes for select to authenticated using (public.clinic_has_permission('security'));

create table if not exists public.clinic_workflow_instances (
  id uuid primary key default gen_random_uuid(), workflow_key text not null, workflow_version integer not null default 1,
  resource_type text not null, resource_id uuid, state text not null, context jsonb not null default '{}'::jsonb,
  started_by uuid references public.clinic_staff(id) on delete set null, completed_by uuid references public.clinic_staff(id) on delete set null,
  started_at timestamptz not null default now(), completed_at timestamptz, updated_at timestamptz not null default now()
);
create index if not exists clinic_workflow_instances_resource_idx on public.clinic_workflow_instances(resource_type,resource_id);
create index if not exists clinic_workflow_instances_state_idx on public.clinic_workflow_instances(workflow_key,state);
alter table public.clinic_workflow_instances enable row level security;
drop policy if exists clinic_workflow_instances_staff on public.clinic_workflow_instances;
create policy clinic_workflow_instances_staff on public.clinic_workflow_instances for all to authenticated using (public.clinic_has_permission('workflow.manage')) with check (public.clinic_has_permission('workflow.manage'));

create table if not exists public.clinic_ai_recommendations (
  id uuid primary key default gen_random_uuid(), department text, role text, context_type text not null, context_id uuid,
  recommendation text not null, evidence jsonb not null default '{}'::jsonb, provider text not null default 'local-free',
  status text not null default 'PROPOSED' check(status in ('PROPOSED','ACCEPTED','REJECTED','EXPIRED')),
  human_actor_staff_id uuid references public.clinic_staff(id) on delete set null, created_at timestamptz not null default now(), decided_at timestamptz
);
create index if not exists clinic_ai_recommendations_context_idx on public.clinic_ai_recommendations(context_type,context_id,created_at desc);
alter table public.clinic_ai_recommendations enable row level security;
drop policy if exists clinic_ai_recommendations_staff on public.clinic_ai_recommendations;
create policy clinic_ai_recommendations_staff on public.clinic_ai_recommendations for select to authenticated using (public.clinic_has_permission('ai.view'));
drop policy if exists clinic_ai_recommendations_decide on public.clinic_ai_recommendations;
create policy clinic_ai_recommendations_decide on public.clinic_ai_recommendations for update to authenticated using (public.clinic_has_permission('ai.decide')) with check (public.clinic_has_permission('ai.decide'));

insert into public.clinic_ui_action_catalog(action_key,label_ar,icon,tone,description_ar,requires_confirmation,active,label_en,description_en)
values
 ('workflow.manage','إدارة سير العمل','⚙️','primary','إدارة حالات وانتقالات سير العمل',true,true,'Manage workflow','Manage workflow states and transitions'),
 ('ai.view','عرض توصيات الذكاء الاصطناعي','🤖','secondary','عرض اقتراحات الذكاء الاصطناعي',false,true,'View AI recommendations','View AI recommendations'),
 ('ai.decide','اعتماد توصيات الذكاء الاصطناعي','🧠','gold','اعتماد أو رفض اقتراحات الذكاء الاصطناعي بشريًا',true,true,'Decide AI recommendations','Accept or reject AI recommendations as a human')
on conflict (action_key) do update set label_ar=excluded.label_ar,icon=excluded.icon,tone=excluded.tone,description_ar=excluded.description_ar,requires_confirmation=excluded.requires_confirmation,active=true,label_en=excluded.label_en,description_en=excluded.description_en;

insert into public.clinic_role_permissions(role,action_key,allowed)
values
 ('OWNER','workflow.manage',true),('ADMIN','workflow.manage',true),('MANAGER','workflow.manage',true),
 ('OWNER','ai.view',true),('ADMIN','ai.view',true),('MANAGER','ai.view',true),('DOCTOR','ai.view',true),('FRONTDESK','ai.view',true),('MARKETING','ai.view',true),
 ('OWNER','ai.decide',true),('ADMIN','ai.decide',true),('MANAGER','ai.decide',true),('DOCTOR','ai.decide',true),('FRONTDESK','ai.decide',true),('MARKETING','ai.decide',true)
on conflict (role,action_key) do update set allowed=excluded.allowed;

insert into public.clinic_workflow_definitions(workflow_key,version,active,states,transitions,approval_policy)
values
 ('refund',1,true,'["REQUESTED","DOCTOR_APPROVED","MANAGEMENT_APPROVED","PROCESSING","COMPLETED","REJECTED"]'::jsonb,'{"REQUESTED":["DOCTOR_APPROVED","REJECTED"],"DOCTOR_APPROVED":["MANAGEMENT_APPROVED","REJECTED"],"MANAGEMENT_APPROVED":["PROCESSING"],"PROCESSING":["COMPLETED"]}'::jsonb,'{"required":["DOCTOR","MANAGEMENT_OR_OWNER"],"ai_can_approve":false}'::jsonb),
 ('appointment',1,true,'["REQUESTED","CONFIRMED","CHECKED_IN","IN_PROGRESS","COMPLETED","CANCELLED","NO_SHOW"]'::jsonb,'{"REQUESTED":["CONFIRMED","CANCELLED"],"CONFIRMED":["CHECKED_IN","CANCELLED","NO_SHOW"],"CHECKED_IN":["IN_PROGRESS","CANCELLED"],"IN_PROGRESS":["COMPLETED"]}'::jsonb,'{"ai_can_approve":false}'::jsonb),
 ('clinical_followup',1,true,'["PROPOSED","CLINICIAN_REVIEW","SCHEDULED","COMPLETED","CANCELLED"]'::jsonb,'{"PROPOSED":["CLINICIAN_REVIEW","CANCELLED"],"CLINICIAN_REVIEW":["SCHEDULED","CANCELLED"],"SCHEDULED":["COMPLETED","CANCELLED"]}'::jsonb,'{"required":["DOCTOR"],"ai_can_approve":false}'::jsonb)
on conflict (workflow_key) do update set version=excluded.version,active=excluded.active,states=excluded.states,transitions=excluded.transitions,approval_policy=excluded.approval_policy,updated_at=now();

insert into public.clinic_feature_flags(key,enabled,rollout_percent,config,description)
values
 ('platform.ai_copilot',true,100,'{"mode":"assistive_only","human_decision_required":true}','Unified AI Copilot; suggestions only.'),
 ('platform.patient_360',true,100,'{"timeline":true,"privacy_default":true}','Patient 360 longitudinal workspace.'),
 ('platform.workflow_engine',true,100,'{"fail_closed":true}','Central workflow state/transition engine.'),
 ('platform.universal_audit',true,100,'{"before_after":true}','Universal sensitive-operation audit timeline.'),
 ('platform.executive_command_center',true,100,'{"drilldown":true}','Owner/Admin executive operational command center.'),
 ('platform.marketing_studio',true,100,'{"human_publish":true,"no_auto_spend":true}','Hybrid marketing workspace.'),
 ('platform.continuous_certification',true,100,'{"contract":true,"rls":true,"e2e":true}','Continuous production certification gates.')
on conflict (key) do update set enabled=excluded.enabled,rollout_percent=excluded.rollout_percent,config=excluded.config,description=excluded.description,updated_at=now();

insert into public.clinic_audit_events(actor_user_id,actor_staff_id,actor_role,action,entity_type,details)
select null,null,'SYSTEM','CONTROL_PLANE_INITIALIZED','platform',jsonb_build_object('version','v1','ai_human_approval_required',true,'refund_gate','REQUESTED -> DOCTOR_APPROVED -> MANAGEMENT_APPROVED -> PROCESSING -> COMPLETED')
where not exists (select 1 from public.clinic_audit_events where action='CONTROL_PLANE_INITIALIZED' and entity_type='platform');
