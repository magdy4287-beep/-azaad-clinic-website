-- Targeted second-pass RLS performance hardening.
-- Scope: only policies whose USING/WITH CHECK still contain a raw auth.uid().
-- Policy identity, roles, command, and permissive/restrictive mode are preserved by ALTER POLICY.
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
      AND (coalesce(qual, '') ~ '(^|[^A-Za-z_])auth\.uid\(\)' OR coalesce(with_check, '') ~ '(^|[^A-Za-z_])auth\.uid\(\)')
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
