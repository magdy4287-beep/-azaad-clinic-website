-- Azaad Clinic: enforce the Doctor ↔ Staff identity contract.
-- DOCTOR staff must be bound to an existing clinic_doctors row.
-- Non-DOCTOR staff must not carry a doctor binding.

alter table public.clinic_staff
  drop constraint if exists clinic_staff_doctor_role_consistency;

alter table public.clinic_staff
  add constraint clinic_staff_doctor_role_consistency
  check (
    (role = 'DOCTOR' and doctor_id is not null)
    or
    (role <> 'DOCTOR' and doctor_id is null)
  );
