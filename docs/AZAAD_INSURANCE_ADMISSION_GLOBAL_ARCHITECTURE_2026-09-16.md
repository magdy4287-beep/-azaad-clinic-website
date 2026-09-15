# AZAAD — Global Hybrid Insurance + Admission/Discharge Architecture

Date: 2026-09-16
Status: Controlled Evolution design + first vertical implementation

## 1. Global findings

AZAAD should not model insurance as a single payer API. Mature systems separate a canonical internal financial/clinical workflow from payer-specific transport adapters.

- HL7 Da Vinci PAS models prior authorization around Coverage, Patient, Claim/authorization request, supporting clinical information, Encounter, and ClaimResponse. The PAS workflow can bridge to X12 278 and supporting documentation while preserving a canonical FHIR-facing model.
- Saudi NPHIES separates eligibility, prior authorization, claims, supporting clinical information and payment flows. Its prior-authorization workflow explicitly supports insurer/TPA routing, approval, denial, additional-information requests and both real-time and deferred processing. Institutional authorization covers inpatient and hospital-based services.
- UAE Riayati e-Claims Post Office provides a unified exchange path for eligibility, authorizations and claims between providers and payers; Dubai eClaimLink publishes payer/facility/code-set and denial-code data for structured e-claims.
- Singapore private insurance commonly uses pre-authorisation before planned hospital admission/day surgery, with required medical and financial information and turnaround-time expectations. Emergency pathways may bypass pre-authorisation.
- Australia combines insurer coverage, hospital agreements, informed financial consent and patient out-of-pocket visibility; scheduled admissions require financial information before admission where applicable.
- Germany demonstrates the importance of machine-readable admission data exchange, including admission date/time/reason, diagnosis and expected duration.

## 2. AZAAD canonical model

`Patient → Coverage → Eligibility evidence → Authorization → Admission Episode → Bed → Clinical Care → Discharge Clearance → Final Invoice/Claim → Payer Response → RCM reconciliation`

The clinic never stores payer-specific workflow as its core domain. Instead:

`Canonical domain`
→ `Payer adapter`
→ `Manual portal / FHIR PAS / X12 / national gateway / custom API`

Manual portal mode is a first-class mode, not an error state. This preserves free-tier operation and allows a receptionist to work with payers that have no supported API.

## 3. Insurance Office

Reception can:

1. Search/select patient.
2. Register complete policy/coverage data.
3. Record subscriber/member/group/plan/network/effective dates.
4. Record copay, deductible, coinsurance and limits.
5. Attach insurance-card and supporting documents through the canonical document boundary.
6. Create prior authorization requests.
7. Capture diagnoses, requested services, clinical summary and estimated amount.
8. Run the local AI Copilot completeness/risk review.
9. Correct missing information.
10. Submit through manual portal/phone/email now, with standards-based adapters later.
11. Record approval, partial approval, denial and additional-information responses.
12. Preserve every submission/response event for auditability.

## 4. AI Copilot policy

AI is advisory and fail-safe:

`Collect → Validate → AI review → Human review → Submit → Payer response → Reconcile`

The current implementation uses a deterministic local rules engine (`azaad_rules`) so the feature has no mandatory paid AI runtime dependency. It identifies missing policy/member/payer data, inpatient length-of-stay gaps and invalid estimates. A future model adapter may generate richer drafts, but cannot bypass human approval or payer authorization.

## 5. Admission & Discharge Office

Admission is an episode, not just a room assignment.

Admission captures:
- admission type
- planned/actual timestamps
- primary doctor
- coverage and authorization linkage
- patient deposit
- payer guarantee
- estimated patient share
- reason/diagnosis summary

Bed management is separate:
- ward
- room
- bed
- availability/reservation/occupied/cleaning/blocked/maintenance
- active assignment with release timestamp

Discharge is gated by a checklist:
- clinical clearance
- medication reconciliation
- follow-up scheduled
- patient instructions
- financial clearance
- insurance clearance
- final invoice / claim reference
- discharge summary

The system must not convert a discharge button into a bypass of financial or insurance clearance.

## 6. RCM / Finance integration

Insurance and admission records reference existing patient, booking, clinical-visit and invoice domains. The discharge plan can carry the final invoice and claim reference. Payer guarantee and patient estimated share are stored before admission to support informed financial communication and later RCM reconciliation.

The next RCM workstream should add:
- authorization-to-charge matching
- approved-vs-rendered service variance
- patient responsibility calculation
- claim-ready queue
- denial/rework queue
- payment/remittance reconciliation
- authorization expiry alerts

## 7. Standards adapter roadmap

Phase A — Free/manual:
- manual payer portal workflow
- phone/email response recording
- structured internal authorization model

Phase B — Standards:
- FHIR PAS / Claim / ClaimResponse
- Coverage / Encounter / DocumentReference
- payer endpoint registry
- asynchronous pending status and inquiry

Phase C — Regional adapters:
- Saudi NPHIES
- UAE Riayati/e-Claims and Dubai eClaimLink
- other country-specific gateways only when the clinic has a real contractual endpoint

No regional connector becomes a runtime dependency until credentials, contract, security and production test evidence exist.

## 8. Security / governance

- Appwrite remains canonical identity.
- Neon remains canonical data owner.
- Vercel API remains the backend boundary.
- Browser never receives payer credentials or database credentials.
- Reception cannot change backend authorization policy.
- AI cannot approve, deny, change permissions, delete data or submit a payer request without an authorized human workflow.
- Every authorization submission/response is evented.
- Sensitive insurance documents use file references/hashes, not arbitrary browser storage.

## 9. Free-forever constraint

No mandatory paid clearinghouse, AI API or payer connector is introduced. External payer integration is an optional adapter. The clinic can operate in manual-portal mode using the canonical data model and audit trail.

## 10. Go-live gates for this domain

1. Migration applied to canonical Neon after controlled approval.
2. Coverage CRUD verified.
3. Authorization draft/edit/submit verified.
4. AI review verified and human approval enforced.
5. Payer response/denial/additional-information flow verified.
6. Admission episode verified.
7. Bed assignment/release verified.
8. Discharge checklist blocks incomplete discharge.
9. Invoice/claim reference linkage verified.
10. RBAC regression verified for every clinic role.
11. Browser E2E verified on exact production artifact.
12. Production SHA/artifact parity verified.
