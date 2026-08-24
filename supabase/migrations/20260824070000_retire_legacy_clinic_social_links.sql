-- Retire the legacy duplicate social-links source.
-- Canonical public clinic social URLs live in public.clinic_settings:
-- facebook_url, instagram_url, linkedin_url, tiktok_url.
-- No PostgreSQL functions, triggers, views, or GitHub source references
-- depend on clinic_social_links; the patient UI consumes clinic_settings.
DROP TABLE IF EXISTS public.clinic_social_links;
