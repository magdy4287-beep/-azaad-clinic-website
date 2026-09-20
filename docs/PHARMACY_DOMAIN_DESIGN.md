# AZAAD Pharmacy Domain

## Scope
AZAAD Pharmacy is one domain with **two separate operational pharmacies**:

1. **Internal Pharmacy** — hospital/inpatient medication supply for wards, ICU, ED, OR and PACU.
2. **External Pharmacy** — outpatient/community dispensing for outpatient prescriptions, discharge prescriptions and external prescriptions.

They share the canonical medication master and patient identity, but they do **not** share operational inventory, prescription/order tables, dispensing tables, or event ledgers.

## Boundary
Browser/UI → Appwrite HttpOnly identity → Vercel `/api/pharmacy` → Neon PostgreSQL → server-side RBAC → pharmacy event ledger.

Supabase is retired and is not a runtime, database, auth, storage, API, browser SDK, secret source, migration dependency, or CI runtime.

## Internal Pharmacy ownership
- Internal Pharmacy owns hospital medication supply, internal stock/lot/expiry, inpatient medication orders, dispensing to hospital locations, internal inventory events and audit.
- Sources are explicitly limited to INPATIENT, ED, ICU, OR, PACU and ADMISSION.
- Nursing owns bedside medication administration/MAR; Internal Pharmacy supplies and dispenses but does not administer medication.
- Internal dispensing may produce RCM charge-capture events through a separate financial boundary; payment is not a clinical authorization substitute and must not block emergency treatment.

## External Pharmacy ownership
- External Pharmacy owns outpatient/community inventory, outpatient/discharge/external prescriptions, external dispensing, external inventory events and patient collection workflow.
- External inventory is physically and logically separate from Internal Pharmacy inventory.
- Cashier/RCM owns payment authority. Pharmacy may carry a payment reference but must not become the financial ledger.
- External dispensing may support substitution/partial dispensing only under configured clinical/pharmacy policy and never bypasses prescriber/pharmacist verification.

## Hard separation rules
- Internal inventory cannot be mutated by external dispensing.
- External inventory cannot be mutated by internal dispensing.
- Internal orders cannot be fulfilled by the external dispensing tables.
- External prescriptions cannot be fulfilled by the internal dispensing tables.
- Internal and external audit ledgers are separate.
- Shared medication catalog and reconciliation records are allowed because they are master/clinical-history boundaries, not inventory ownership.
- Do not introduce a `pharmacy-v2` duplicate API or another pharmacy runtime owner.

## Roles and security
The current global role registry is used; no new PHARMACIST role is introduced until the repository-wide role model is updated atomically. Backend authorization is authoritative; UI permissions are not a security boundary. No pharmacy API accepts provider credentials from the browser.

## Safety / AI
AI may assist with missing-data detection, medication-history summarization, interaction/duplicate-order review when backed by validated rules/data, and workflow suggestions. AI must not autonomously prescribe, change a medication, override verification, or authorize unsafe dispensing.

## Production gate
Requires unique ownership, migration verification on the intended Neon branch, separate Internal/External API contract tests, server-side RBAC, audit evidence, integration checks with Clinical Orders/Admission/Nursing/RCM, zero-Supabase/source-canonicality checks, browser E2E against the deployed artifact, security regression, exact SHA evidence, and rollback/smoke evidence.
