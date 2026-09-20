# AZAAD Nursing Domain — Canonical Ownership

## Ownership

Nursing owns nurse assignment, observations/vitals, nursing assessments, care plans, handoffs, nursing task queues, and the nursing event ledger.

Runtime boundary:

`Browser/UI → Appwrite HttpOnly session → /api/nursing → Neon PostgreSQL`

## Role boundary

`NURSE` is a first-class staff role. Nursing APIs authorize it explicitly. Nursing does **not** grant staff-management, unrestricted finance, marketing, or owner privileges.

The server is the security boundary; UI visibility is not authorization.

## Clinical safety

- Nurses record and act on clinician-approved workflows within their assigned scope.
- The system does not allow AI to autonomously diagnose, triage, prescribe, administer medication, decide ICU/OR admission, or discharge a patient.
- Escalation flags are workflow signals for human review, not autonomous clinical decisions.
- Medication administration will integrate with a future medication-order/MAR boundary rather than duplicating medication logic here.
- Emergency treatment must never be blocked by financial verification.

## Integration boundaries

Nursing integrates with ED, inpatient/ward, ICU, pharmacy/MAR, laboratory, radiology, admissions/discharge, and audit/compliance through stable IDs and events. It does not duplicate those domain owners.

## Production gate

Before production use, verify:

1. migration applies cleanly to a non-production Neon branch;
2. exact-head source canonicality passes;
3. zero-Supabase gate passes;
4. Nursing contract passes;
5. role/security regression confirms NURSE can perform nursing operations but cannot enter staff management;
6. browser E2E covers login/session persistence, assignment, observation, assessment, care plan, task, handoff, and audit visibility;
7. deployed artifact matches the verified commit.
