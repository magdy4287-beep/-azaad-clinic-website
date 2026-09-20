# AZAAD Admission / Inpatient / Ward Domain

## Ownership

This domain owns admission lifecycle, wards, beds, bed assignments, inpatient transfers and discharge records. Nursing owns nursing care; ED owns emergency encounters; RCM owns financial events.

## Runtime boundary

Browser/UI → Appwrite HttpOnly identity → `api/admissions.js` → Neon PostgreSQL → server-side role enforcement → inpatient event ledger.

Supabase is not a runtime dependency.

## Lifecycle

REQUESTED → APPROVED → ADMITTED → TRANSFERRED → DISCHARGED

Cancellation is terminal for an admission request that does not proceed.

## Safety boundaries

- Bed availability is operational state and does not itself make a clinical admission decision.
- Discharge records must not be interpreted as autonomous clinical recommendations.
- Emergency treatment must not wait for financial authorization.
- Nursing observations, assessments, care plans and handoffs remain owned by the Nursing domain.
- ICU, OR and external transfer will consume explicit admission/transfer contracts rather than creating parallel admission records.

## Integration points

- ED: source of emergency admissions.
- Outpatient: source of planned admissions.
- Nursing: assignment and inpatient care.
- ICU: higher-acuity bed/transfer boundary.
- OR: perioperative admission/transfer boundary.
- Pharmacy/Lab/Radiology: clinical service orders and results.
- RCM/Insurance: financial and payer events without blocking emergency care.

## Production completion gate

Migration compatibility, API contract, server-side RBAC, audit/event coverage, integration tests, browser E2E against the deployed artifact, security regression, exact SHA evidence, production smoke and rollback evidence are required before this domain is considered production-ready.
