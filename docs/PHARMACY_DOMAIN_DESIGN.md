# AZAAD Pharmacy Domain

## Scope
Canonical pharmacy for two operational channels: **INTERNAL** hospital pharmacy (inpatient/ED/ICU/OR supply) and **EXTERNAL** outpatient/retail dispensing. Both share one medication catalog and inventory/audit model; they are not duplicate systems.

## Boundary
Browser/UI → Appwrite HttpOnly identity → Vercel `/api/pharmacy` → Neon PostgreSQL → server-side RBAC → pharmacy event ledger.
Supabase is retired and is not a runtime, database, auth, storage, API, browser SDK, secret source, migration dependency, or CI runtime.

## Ownership
- Pharmacy owns medication catalog, formulary state, pharmacy locations, stock lots, dispensing, returns/reconciliation records, inventory events and pharmacy audit.
- Clinical domains own clinical diagnosis and treatment decisions.
- Prescribers create medication orders; pharmacy verifies/dispenses according to local policy.
- Nursing owns medication administration/MAR; pharmacy supplies and records dispensing, not bedside administration.
- RCM/Cashier own charge/payment lifecycle; payment status must not be used as a clinical authorization substitute.
- Admission/ED/ICU/OR consume pharmacy services through orders and dispensing boundaries rather than duplicating inventory.

## Internal pharmacy
Supports ward/ED/ICU/OR supply, stock by location/lot, expiry-aware dispensing, controlled medication flag, medication reconciliation, and audit events.

## External pharmacy
Supports outpatient prescriptions and external prescription intake, sellable/formulary flags, dispensing from EXTERNAL locations, and patient dispense history. External dispensing does not bypass clinician/prescriber ownership.

## Safety
AI may assist with missing-data detection, medication-history summarization, interaction/duplicate-order review when backed by validated rules/data, and workflow suggestions. AI must not autonomously prescribe, change a medication, override a pharmacist/clinician verification, or authorize unsafe dispensing.

## Production gate
Requires unique ownership, migration verification on the intended Neon branch, API contract, server-side RBAC, audit evidence, integration checks with Clinical Orders/Admission/Nursing/RCM, zero-Supabase/source-canonicality checks, browser E2E against the deployed artifact, security regression, exact SHA evidence, and rollback/smoke evidence.
