# AZAAD Hospital Master Domain Map

## Purpose

This is the canonical domain ownership map for evolving AZAAD from a clinic platform into a modular, internationally adaptable hospital information system without creating parallel implementations.

## Non-negotiable architecture

Browser/UI → Appwrite HttpOnly identity → Vercel domain API → Neon PostgreSQL → authorization → audit/event ledger → domain E2E → production verification.

Supabase is retired and must not return as runtime, database, auth, storage, API, browser SDK, secret source, migration dependency, or CI runtime.

## Canonical domains

| Domain | Primary responsibility | Core dependencies | Priority |
|---|---|---|---|
| Patient Administration / Registration | MPI, demographics, identifiers, contacts, guarantor | Patient 360, Scheduling | P0 |
| Emergency Department | Intake, triage, emergency encounter, orders, disposition | Registration, Nursing, Insurance, RCM, Admission | P0 |
| Outpatient / Clinics | Visits, clinical notes, orders, follow-up | Scheduling, Clinical AI, Pharmacy, Lab, Radiology | P0 |
| Inpatient / Wards | Bed/room, admission, rounds, transfers, discharge | Nursing, Pharmacy, Lab, Radiology, RCM | P0 |
| Nursing | Nursing assignment, observations, medication administration, care plans | ED, Inpatient, ICU, MAR | P0 |
| ICU | Critical-care beds, flowsheets, devices, escalation | Nursing, Lab, Radiology, Pharmacy, OR | P0 |
| Operating Room | Case scheduling, checklist, procedure record, PACU handoff | Surgery, Anesthesia, Admission, RCM | P0 |
| Anesthesia / PACU | Pre-op assessment, intra-op record, recovery | OR, Pharmacy, ICU | P1 |
| Pharmacy | Medication catalog, orders, dispense, reconciliation, inventory | Clinical Orders, Inpatient, RCM | P0 |
| Laboratory | Orders, specimen lifecycle, results, verification | Clinical Orders, LOINC mapping | P0 |
| Radiology / Imaging | Orders, scheduling, modality workflow, reports, DICOM boundary | Clinical Orders, PACS adapter | P0 |
| Blood Bank | Blood products, compatibility workflow, issue/return, traceability | Lab, OR, ED, Inpatient | P1 |
| Admissions / Discharge | Admission decision, bed placement, transfer, discharge | Wards, ICU, OR, RCM | P0 |
| Insurance / Payer | Eligibility, coverage, payer policy, authorization | Registration, ED, Orders, RCM | P0 |
| Prior Authorization | Clinical evidence package, request, response, appeal lifecycle | Insurance, Clinical Documentation | P0 |
| RCM / Claims | Charge capture, coding boundary, claim lifecycle, denial management | Insurance, Cashier, Clinical Events | P0 |
| Cashier / Finance | Patient financial transactions, receipts, refunds, payment reconciliation | RCM, Payer | P0 |
| Medical Records / HIM | Legal record lifecycle, amendments, release-of-information | All clinical domains | P0 |
| Scheduling | Provider/resource calendars, appointments, waitlists | Registration, Clinics, OR, Radiology | P0 |
| Referral / Transfer | Internal/external referral and transfer packages | ED, Admission, Clinics | P1 |
| Quality & Patient Safety | Incidents, safety events, quality indicators, corrective actions | Audit, Clinical Events | P1 |
| Infection Control | Isolation, surveillance, infection events, precautions | Nursing, ED, Inpatient | P1 |
| Inventory / Supply | Stock, lots, expiry, requisitions, consumption | Pharmacy, Blood Bank, Procurement | P1 |
| Procurement | Suppliers, purchase requests/orders, receiving | Inventory, Finance | P2 |
| Staff / Workforce | Staff identity, roles, credentials, assignments, lifecycle | Appwrite, RBAC | P0 |
| Audit / Compliance | Immutable operational audit and security evidence | All domains | P0 |
| Reporting / BI | Operational and financial reporting | Read-only domain projections | P1 |
| AI Safety / Operations | AI evidence, review, anomaly detection, engineering self-healing | All domains, human approval | P0 |

## Role model

Canonical roles currently include OWNER, ADMIN, MANAGER, SECRETARY, RECEPTION, CASHIER, DOCTOR, NURSE, MARKETING. NURSE is a first-class role and must be propagated through every backend role allow-list and security contract before production use.

A clinical role must never gain staff-management authority merely because it exists in the global role registry.

## Clinical safety boundary

AI may assist with summarization, missing-data detection, coding/authorization evidence preparation, workflow suggestions, and engineering diagnostics. AI must not autonomously decide triage acuity, diagnosis, medication, surgery, ICU admission, discharge, or other clinical disposition.

Emergency treatment must never be delayed by payment or financial verification.

## Internationalization strategy

The clinical core is country-neutral. Country-specific behavior is implemented by adapters:

- identity / patient identifier adapter
- terminology adapter
- coding adapter
- payer adapter
- claims adapter
- national health exchange adapter
- privacy / retention adapter
- consent / legal-record adapter
- localization / language adapter
- tax / currency adapter

No country adapter may fork the canonical clinical domain model.

## Standards-aligned interoperability boundary

Use standards-aligned interfaces where appropriate, including FHIR, HL7 v2, DICOM, SNOMED CT, LOINC, ICD and IHE profiles. AZAAD must not claim formal conformance until a dedicated conformance test suite passes for the relevant implementation guide/profile.

## Free-first operating model

Prefer GitHub Actions, Vercel free capabilities, Neon free capabilities, Appwrite free capabilities, browser-native APIs and open standards. Paid providers are optional adapters, never hidden mandatory dependencies. Clinical safety, security, backup and recovery requirements override cost optimization.

## Completion rule

A domain is not complete because a page exists. A domain reaches production readiness only after:

1. ownership is unique;
2. schema is canonical;
3. API boundary is canonical;
4. role/permission boundary is enforced server-side;
5. audit events are defined;
6. integrations are explicit;
7. migration compatibility is verified;
8. contract tests pass;
9. browser E2E passes against the intended artifact;
10. security regression passes;
11. exact SHA evidence is recorded;
12. production smoke/rollback evidence exists.

## Engineering anti-duplication rule

Before adding a file, API, table, workflow or page, search the ownership map and existing repository. If an existing canonical owner can safely absorb the responsibility, extend it rather than creating a v2/final/fix/nextgen duplicate.
