-- AZAAD CLINIC
-- Doctor account provisioning guardrails
-- Free-first / no credentials stored in clinic_doctors.
-- This migration intentionally adds integrity constraints only.
-- Account creation/linking remains server-side through the existing staff-admin flow.

BEGIN;

-- A staff row may represent at most one doctor.
CREATE UNIQUE INDEX IF NOT EXISTS ux_clinic_staff_doctor_id
  ON public.clinic_staff (doctor_id)
  WHERE doctor_id IS NOT NULL;

-- A doctor identity must not be linked to more than one staff row.
CREATE UNIQUE INDEX IF NOT EXISTS ux_clinic_staff_auth_user_id
  ON public.clinic_staff (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- A doctor profile may have at most one Auth identity.
CREATE UNIQUE INDEX IF NOT EXISTS ux_clinic_doctors_auth_user_id
  ON public.clinic_doctors (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Prevent an inactive staff account from remaining linked to an active doctor.
-- This is enforced by application/service logic because PostgreSQL CHECK constraints
-- cannot safely express a cross-table invariant.

COMMIT;
