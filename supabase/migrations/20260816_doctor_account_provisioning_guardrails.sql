-- AZAAD CLINIC
-- Doctor account provisioning guardrails
--
-- IMPORTANT: the public.clinic_staff table in this production schema is the
-- public-facing staff/doctor directory and does NOT contain auth_user_id or
-- doctor_id. Account identity is managed by the separate staff/auth layer.
-- This migration therefore adds no assumptions about columns that do not exist.
--
-- The correct next step is to harden the existing staff-admin provisioning
-- function/Edge Function after its actual schema is inspected.

BEGIN;

-- No DDL is intentionally applied here yet.
-- Keeping this migration as a documented placeholder prevents schema drift
-- while the exact authenticated staff-account table is identified.

COMMIT;
