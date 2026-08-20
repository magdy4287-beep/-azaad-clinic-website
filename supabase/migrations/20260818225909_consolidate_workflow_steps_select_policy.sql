DROP POLICY IF EXISTS clinic_workflow_management ON public.clinic_workflow_steps;
DROP POLICY IF EXISTS clinic_workflow_staff_select ON public.clinic_workflow_steps;
CREATE POLICY clinic_workflow_management ON public.clinic_workflow_steps
AS PERMISSIVE FOR ALL TO authenticated
USING (
  (SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = ANY (ARRAY['OWNER'::text, 'ADMIN'::text, 'MANAGER'::text])
  OR active = true
)
WITH CHECK (
  (SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text)) = ANY (ARRAY['OWNER'::text, 'ADMIN'::text, 'MANAGER'::text])
);
