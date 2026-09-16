# AZAAD Global Hospital Domain Architecture — 2026-09-16

## Purpose

AZAAD is being evolved from a clinic platform into a modular hospital information system. The design is **standards-aligned, region-neutral, and adapter-driven** rather than hard-coded to one country's payer, coding, or regulatory workflow.

This document is the domain ownership map. It prevents duplicate modules and establishes one canonical owner for each hospital capability.

## Non-negotiable platform boundary

`Browser/UI → Appwrite HttpOnly identity → Vercel domain API → Neon PostgreSQL → audit/event ledger`

Supabase is retired and is not a runtime owner, authentication provider, database, API, secret store, frontend SDK, or new migration target.

## Global interoperability profile

AZAAD uses a canonical internal model and optional external adapters:

- **FHIR R4**: exchange/API boundary where appropriate; do not claim conformance until resource-level validation is completed.
- **HL7 v2**: adapter boundary for legacy hospital interfaces.
- **DICOM**: imaging/PACS/RIS interoperability boundary.
- **SNOMED CT**: clinical terminology boundary where licensed/available for the deployment jurisdiction.
- **LOINC**: laboratory and clinical observation/result terminology; LOINC is available under an open license.
- **ICD / national diagnosis coding**: jurisdiction-specific coding adapter.
- **CPT/HCPCS or national procedure coding**: jurisdiction-specific claims adapter; never hard-code US-only assumptions into the core model.
- **IHE profiles**: integration workflow patterns selected per deployed capability and jurisdiction.
- **Payer authorization**: internal authorization state machine with optional Da Vinci CRD/DTR/PAS or national payer gateways.
- **Quality/safety**: ISO 7101 quality-management principles and WHO/IHI safety-learning patterns inform governance, incident learning, risk management and continuous improvement.
- **Security**: health-specific security controls follow the direction of ISO 27799:2025, while implementation remains subject to the deployed country's law and regulatory requirements.

## Canonical hospital domains

| Domain | Canonical responsibility | Primary actors | Key downstream contracts |
|---|---|---|---|
| Patient Administration / Registration | Identity, demographics, MRN, contacts, consent | Registration, Reception | Patient 360, scheduling, billing |
| Emergency Department | Emergency encounter, triage, emergency care | Reception, Nurse, Doctor | Admission, OR, ICU, pharmacy, RCM |
| Outpatient / Clinics | Ambulatory encounters and orders | Doctor, Nurse, Reception | Lab, imaging, pharmacy, billing |
| Inpatient / Wards | Bed-based episodes and daily care | Nurse, Doctor | Pharmacy, lab, imaging, discharge |
| ICU | Critical-care episode, monitoring, escalation | ICU Nurse, Doctor | Lab, imaging, pharmacy, OR |
| Operating Room | Surgical case, scheduling, checklist, intra-op record | Surgeon, Nurse, Anesthesia | Admission, ICU, pathology, billing |
| Anesthesia / PACU | Pre-op assessment, anesthesia, recovery | Anesthesiologist, Nurse | OR, ICU, discharge |
| Laboratory | Orders, specimen lifecycle, results, verification | Lab Staff, Doctor | LOINC/FHIR/HL7 adapters, RCM |
| Radiology / Imaging | Orders, scheduling, acquisition, report, image link | Radiologist, Technologist | DICOM/IHE, FHIR/HL7, RCM |
| Pharmacy | Medication orders, verification, dispensing, administration linkage | Pharmacist, Nurse, Doctor | Inventory, MAR, billing |
| Blood Bank | Blood product inventory, compatibility, issue/return, traceability | Blood Bank Staff | Lab, OR, ICU, emergency |
| Nursing | Nursing assignment, assessments, care plans, medication administration, handoff | Nurse | ED, wards, ICU, OR |
| Admissions & Discharge | Admission episode, bed assignment, transfer, discharge | Admission, Nurse, Doctor | RCM, pharmacy, follow-up |
| Insurance / Payer Relations | Coverage, eligibility, benefits, authorization | Reception, Payer Staff | ED, admission, RCM |
| Prior Authorization | Request, clinical evidence, payer response, appeal/review | Clinical + Payer Staff | Insurance, clinical domains |
| RCM / Billing / Claims | Charge capture, invoices, claims, denials, reconciliation | RCM, Cashier | All billable clinical domains |
| Cashier / Finance | Patient payments, refunds, receipts, financial controls | Cashier, Finance | RCM |
| Medical Records / HIM | Record integrity, release, retention, coding governance | HIM | All clinical domains |
| Scheduling | Appointment, resource, waiting list, availability | Reception, Scheduler | Clinics, OR, imaging, lab |
| Referral / Transfer | Internal/external referral and transfer workflow | Doctor, Admission | ED, inpatient, specialty care |
| Quality & Patient Safety | Incident, near miss, safety investigation, CAPA | Quality | All domains |
| Infection Control | Infection surveillance, precautions, isolation | Infection Control | Nursing, lab, wards, ED |
| Supply / Inventory | Stock, lots, expiry, consumption, replenishment | Stores, Pharmacy | Pharmacy, OR, lab |
| Procurement | Requisition, purchase order, receiving, supplier lifecycle | Procurement | Inventory, finance |
| Staff / HR | Staff identity, credentials, assignment, training, performance | HR, Management | RBAC, nursing, clinical domains |
| Audit / Compliance | Immutable operational audit and access review | Compliance | All domains |
| Reporting / BI | Operational, clinical, financial and quality analytics | Management | Read-only analytical boundary |
| AI Safety / Operations | AI proposals, evidence, confidence, approvals, rollback, incident learning | Authorized humans + AI | All domains |

## Department implementation rule

Every domain must have exactly one runtime owner and one data owner. A feature is not considered implemented when only a page exists.

Required vertical slice:

`UI → API boundary → Neon schema → authorization → audit → E2E contract → production verification`

## Clinical safety rule

AI is assistive. It may summarize, identify missing documentation, suggest coding/authorization evidence, detect anomalies and propose deterministic repairs. It must not autonomously decide triage, diagnosis, treatment, surgery, ICU admission, discharge, blood compatibility, medication administration, or payer appeal disposition.

Emergency care is never blocked by payment or authorization processing. WHO emergency-care guidance emphasizes systematic emergency care, triage, data quality and referral/counter-referral.

## Country-neutralization strategy

The core stores canonical clinical/business facts. Country-specific behavior lives behind configuration/adapters:

1. Country / jurisdiction profile
2. Currency and tax rules
3. Date/time/locale rules
4. Patient identifier rules
5. Diagnosis/procedure terminology mappings
6. Payer eligibility/authorization adapters
7. Claim/EDI adapters
8. National health exchange adapters
9. Consent/privacy/retention policy adapters
10. Local regulatory reporting adapters

No country adapter may change the clinical source of truth.

## Free-first implementation strategy

The core remains deployable without mandatory paid clearinghouses, proprietary AI APIs, or paid integration gateways. External payer, SMS, imaging, terminology, and national-health adapters are optional integration packages. Open standards and freely usable terminology resources are preferred where licensing permits.

## AI self-healing safety loop

`Detect → classify → reproduce → root cause → candidate patch → deterministic tests → security tests → human approval for production-risk changes → deploy → verify → rollback`

AI cannot directly mutate production clinical data, permissions, authentication policy, or destructive records.

## Duplicate-prevention rule

Before creating a new department/module, search the ownership registry, route registry, API inventory, migration inventory and existing UI surfaces. If a capability already has a canonical owner, extend that owner instead of creating a second implementation.

## Completion definition

A hospital domain becomes production-ready only after:

- canonical schema is validated against Neon;
- backend permission boundary is enforced server-side;
- audit events are written for material actions;
- bilingual/responsive UI is verified where applicable;
- browser E2E covers the main workflow and negative authorization cases;
- no retired-provider runtime residue exists;
- production artifact is tied to an exact commit SHA;
- DR/UAT evidence exists for the domain's critical workflow.
