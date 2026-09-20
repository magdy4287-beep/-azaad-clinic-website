# AZAAD Emergency Department — Hybrid Operating Model

## Purpose

AZAAD ED is a canonical emergency-care workflow, not a cashier-first workflow. Registration, insurance and revenue-cycle data are integrated with the clinical encounter, while clinically indicated emergency assessment and treatment are never delayed by payment collection.

## Global design basis

The model draws on internationally used emergency-care patterns:

- WHO/ICRC/MSF acuity-based triage and structured emergency-unit workflows.
- ESI-style five-level acuity where the facility adopts ESI.
- WHO IITT three-colour acuity can be recorded alongside the internal encounter when that protocol is used.
- Structured emergency documentation, clinical checklists, handover/referral, and case-based quality data.
- Standards-based payer interoperability through the existing Insurance Office: manual portal first, with optional FHIR PAS, X12 278, national gateway, or custom adapters later.

## Safety invariant

**Financial routing must never block clinically indicated emergency care.**

AZAAD may route lower-acuity patients to financial verification in parallel, but triage and clinical staff retain responsibility for determining urgency and treatment. The application does not use an acuity number as an automated medical decision.

## Core flow

Reception / Emergency Intake
→ Patient identity / minimum demographic registration
→ Insurance / coverage lookup
→ ED encounter
→ Triage by trained clinical staff
→ Doctor + nursing assignment
→ Clinical assessment / diagnosis / orders
→ Insurance authorization support when applicable
→ Diagnostics / medication / procedure / consultation
→ Disposition
→ Admission / ICU / OR / observation / transfer / discharge
→ Pharmacy / billing / RCM / claims
→ Audit + quality reporting

## Triage

The system supports `ESI` levels 1–5 and can record WHO `IITT` colour context. The actual clinical protocol used by a facility must be selected by the clinical governance team and configured locally.

The system stores:

- triage system
- acuity level
- colour where applicable
- high-risk flags
- immediate-intervention flag
- vitals
- red flags
- assessment notes
- assessor and timestamp

## AI policy

AI is a safety/completeness copilot only. It may:

- identify missing registration or documentation fields
- identify missing insurance information
- summarize workflow gaps
- suggest that a human review a missing item
- prepare structured submission material for human approval

AI must not:

- assign or override triage acuity
- diagnose a patient
- prescribe or independently order treatment
- decide admission, ICU, OR, transfer, or discharge
- approve/deny insurance authorization
- bypass RBAC or audit controls
- write directly to production clinical data without the controlled application boundary

## Disposition paths

Supported paths include:

- Discharge
- Admission
- ICU
- Surgery / OR
- Observation
- Transfer
- Left without being seen
- Death

Admission dispositions create a canonical admission episode and retain the ED encounter as the originating clinical episode.

## Revenue-cycle integration

Every ED encounter is designed to produce auditable financial events for:

- patient responsibility
- payer guarantee / authorization
- invoice linkage
- claim reference
- payment status
- downstream RCM reconciliation

No fake payer or financial data is seeded as production data.

## Future adapters

The internal domain is payer-neutral. Adapter boundaries can later support:

- FHIR Da Vinci PAS
- X12 278 / 275
- national health-information exchange gateways
- payer APIs
- manual portal workflows
- phone/email workflows

Adapters must remain outside the canonical clinical domain and must not create duplicate patient, coverage, encounter, or authorization ownership.

## Nursing role

The current repository's canonical staff-role matrix does not yet expose a first-class `NURSE` role. The ED therefore stores a dedicated nursing assignment reference without silently changing the global RBAC matrix. A future controlled RBAC expansion should add `NURSE` consistently across authentication, staff management, permissions, UI, QA contracts, and audit policy before nurse accounts are activated.

## Free-first architecture

No paid AI, clearinghouse, or proprietary payer platform is required for the core ED workflow. The canonical stack remains Appwrite authentication, Vercel API/runtime, Neon PostgreSQL, GitHub Actions, and browser-native UI.
