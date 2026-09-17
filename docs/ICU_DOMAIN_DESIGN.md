# AZAAD ICU Domain

## Ownership

ICU owns critical-care unit/bed lifecycle, ICU stay lifecycle, critical-care observations, flowsheet entries, escalation workflow, and ICU audit events.

Admission/Ward remains the owner of general admission, ward beds, ward transfers, and discharge lifecycle. Nursing remains the owner of nursing assignment, nursing observations, care plans, handoffs, and nursing tasks. ICU consumes those boundaries instead of duplicating them.

## Runtime

Browser/UI -> Appwrite HttpOnly session -> Vercel `/api/icu` -> Neon PostgreSQL.

Supabase is retired.

## Safety

The API records clinician-entered observations and escalation requests. It does not autonomously diagnose, triage, prescribe, ventilate, admit to ICU, or discharge a patient. Escalation is a human workflow signal.

## Integration boundaries

- Admission/Ward: admission and transfer context.
- Nursing: nursing observations, assignments, care plans and handoff.
- Laboratory/Radiology/Pharmacy: future canonical domain APIs; ICU must consume them through their owners.
- Operating Room/Anesthesia: future perioperative handoff.
- RCM: financial events must never block emergency or clinically necessary care.

## Production gate

Schema migration, server-side RBAC, contract test, source canonicality, zero-Supabase, integration tests, browser E2E against the intended artifact, security regression, exact SHA evidence, and production smoke/rollback evidence are required before production readiness is claimed.
