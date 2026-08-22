-- Targeted second-pass RLS performance hardening.
-- Scope: only the policies currently reported by Supabase Performance Advisor
-- for auth_rls_initplan on the certified Production baseline.
-- Policy identity, roles, command, and permissive/restrictive mode are preserved.
DO $$
DECLARE
  p record;
  qual_sql text;
  check_sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename, policyname) IN (
          ('clinic_marketing_channels', 'clinic_marketing_channels_staff'),
          ('clinic_marketing_campaigns', 'clinic_marketing_campaigns_staff'),
          ('clinic_marketing_campaign_channels', 'clinic_marketing_campaign_channels_staff'),
          ('clinic_marketing_campaign_posts', 'clinic_marketing_campaign_posts_staff'),
          ('clinic_marketing_publications', 'clinic_marketing_publications_staff'),
          ('clinic_public_team_profiles', 'clinic_public_team_profiles_staff_write'),
          ('clinic_audit_events', 'clinic_audit_events_staff_select'),
          ('clinic_daily_reconciliations', 'clinic_daily_reconciliation_insert'),
          ('clinic_daily_reconciliations', 'clinic_daily_reconciliation_select'),
          ('clinic_ai_usage_events', 'clinic_ai_usage_events_actor_insert'),
          ('clinic_ai_usage_events', 'clinic_ai_usage_events_management_select')
        )
      )
  LOOP
    qual_sql := CASE
      WHEN p.qual IS NULL THEN NULL
      ELSE regexp_replace(p.qual, '(^|[^A-Za-z_])auth\.uid\(\)', '\1(select auth.uid())', 'g')
    END;
    check_sql := CASE
      WHEN p.with_check IS NULL THEN NULL
      ELSE regexp_replace(p.with_check, '(^|[^A-Za-z_])auth\.uid\(\)', '\1(select auth.uid())', 'g')
    END;

    IF qual_sql IS NOT NULL AND check_sql IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
        p.policyname, p.schemaname, p.tablename, qual_sql, check_sql);
    ELSIF qual_sql IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)',
        p.policyname, p.schemaname, p.tablename, qual_sql);
    ELSIF check_sql IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        p.policyname, p.schemaname, p.tablename, check_sql);
    END IF;
  END LOOP;
END $$;
