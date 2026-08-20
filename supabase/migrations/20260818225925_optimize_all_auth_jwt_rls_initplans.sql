DO $$
DECLARE
  p record;
  role_sql text;
  qual_sql text;
  check_sql text;
  permissive_sql text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual,'') LIKE '%auth.jwt()%' OR coalesce(with_check,'') LIKE '%auth.jwt()%')
  LOOP
    role_sql := replace(replace(p.roles::text, '{', ''), '}', '');
    permissive_sql := CASE WHEN p.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;
    qual_sql := CASE WHEN p.qual IS NULL THEN NULL ELSE regexp_replace(p.qual, '(^|[^A-Za-z_])auth\.jwt\(\)', '\1(select auth.jwt())', 'g') END;
    check_sql := CASE WHEN p.with_check IS NULL THEN NULL ELSE regexp_replace(p.with_check, '(^|[^A-Za-z_])auth\.jwt\(\)', '\1(select auth.jwt())', 'g') END;
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    EXECUTE format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s', p.policyname, p.schemaname, p.tablename, permissive_sql, upper(p.cmd), role_sql,
      CASE WHEN qual_sql IS NOT NULL THEN format(' USING (%s)', qual_sql) ELSE '' END,
      CASE WHEN check_sql IS NOT NULL THEN format(' WITH CHECK (%s)', check_sql) ELSE '' END);
  END LOOP;
END $$;
