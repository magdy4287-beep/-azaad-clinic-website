# AZAAD CLINIC — MASTER EXECUTION PLAN

## 1. Product Goal

Build **AZAAD CLINIC MANAGEMENT SYSTEM** as a production-ready clinic operating system, not a collection of admin tabs.

Core rule:

> A module is complete only when the real end-to-end path works: UI → authorization → database/Edge Function → validation → audit/security → result/error handling → Arabic/English → responsive behavior → verification.

## 2. Non-Negotiable Architecture Rules

- Free-first / no paid service is required for core operation.
- Do not put Supabase service-role or secret keys in browser code.
- Preserve the existing patient-facing and booking experience unless a verified integration requires a change.
- Preserve the existing administration account and owner protection.
- Prefer existing Supabase tables, views, functions and workflows before creating duplicates.
- Archive historical clinical/financial entities instead of destructive deletion where relationships/history exist.
- Every privileged operation must respect role permissions and produce an audit/security trail where appropriate.
- English and Arabic are first-class modes; dynamic content must translate too.
- Production status is only READY after a real deployment and verification; a GitHub commit alone is not production proof.

## 3. Execution Order

### Phase 0 — Baseline & Safety Gate
**Goal:** freeze a known-good baseline before expanding the suite.

- [ ] Identify current production-ready deployment.
- [ ] Verify `main` baseline and open PR state.
- [ ] Confirm Supabase schema/functions used by the admin layer.
- [ ] Confirm role/permission model and owner protection.
- [ ] Confirm no secret keys are present in frontend assets.
- [ ] Establish regression checklist for login, patient, booking and existing admin flows.

**Exit gate:** baseline documented and reproducible.

### Phase 1 — Language & UI Foundation 🌐

- [x] `clinic_i18n` foundation.
- [x] English/Arabic admin layer.
- [x] RTL/LTR switching foundation.
- [x] Dynamic translation hardening foundation.
- [ ] Replace brittle text-scan translation with key-based/central translation where needed.
- [ ] Verify every new module in both languages.

**Exit gate:** no major admin UI remains untranslated in either mode.

### Phase 2 — Patient 360 + Appointment Center 🤢📅

- [ ] Patient search: name, phone, MRN, booking number.
- [ ] Real calendar: past, today, tomorrow and future dates.
- [ ] Patient profile and visit history.
- [ ] Bookings, rebooking and no-show handling.
- [ ] Clinical history and progress.
- [ ] Follow-ups and alerts.
- [ ] Invoice/payment/outstanding linkage.
- [ ] Patient merge with safe historical preservation.

**Exit gate:** one patient can be followed end-to-end from booking through visit, billing and follow-up.

### Phase 3 — Doctors Center 🧑‍⚕️

- [ ] Arabic/English profile.
- [ ] Photo, specialty, bio and services.
- [ ] Active/inactive/archive behavior.
- [ ] Schedule and performance linkage.
- [ ] Revenue, completion, no-show and patient metrics.

**Exit gate:** doctor lifecycle and historical relationships are safe and functional.

### Phase 4 — Services Center 🩺

- [ ] Service catalog.
- [ ] Arabic/English name and description.
- [ ] Price and duration.
- [ ] Active/inactive/archive.
- [ ] Doctor association.
- [ ] Booking and invoice linkage.

**Exit gate:** a service can flow from catalog → booking → invoice without duplicated definitions.

### Phase 5 — Doctor Scheduling 🕐

- [x] Explicit weekday payload foundation.
- [ ] Verify actual persistence table/function used by production schema.
- [ ] Working days and closures.
- [ ] Breaks.
- [ ] Slot duration.
- [ ] Buffer.
- [ ] Maximum bookings.
- [ ] Booking-mode rules.
- [ ] Conflict/overlap validation.

**Exit gate:** generated availability is deterministic and matches the saved schedule.

### Phase 6 — Marketing Workspace 📣

- [ ] Posts and offers.
- [ ] Media.
- [ ] Arabic/English copy.
- [ ] Platforms.
- [ ] Draft/scheduled/published states.
- [ ] Leads and source.
- [ ] Conversion tracking.
- [ ] Employee ownership.
- [ ] Campaign performance.

**Exit gate:** lead → campaign/source → conversion can be measured.

### Phase 7 — Holidays & Closures 🚫

- [ ] Clinic-wide closure.
- [ ] Doctor-specific closure.
- [ ] Active-doctor selector.
- [ ] Date range and reason.
- [ ] Arabic/English notes.
- [ ] Booking engine enforcement.

**Exit gate:** unavailable periods cannot be booked and historical bookings remain intact.

### Phase 8 — Follow-up & Alerts 🔔

- [ ] Follow-up work queue.
- [ ] Alert priorities.
- [ ] SLA tracking.
- [ ] Owner/role assignment.
- [ ] Patient context.
- [ ] Completion/escalation.
- [ ] Dashboard metrics.

**Exit gate:** no follow-up disappears without a visible state/owner/outcome.

### Phase 9 — HR Management 👥

- [x] `clinic_staff_hr` foundation.
- [x] `clinic_staff_documents` foundation.
- [x] `clinic_compensation_rules` foundation.
- [ ] Profile, department and job title.
- [ ] Hire date and employment status.
- [ ] Salary and salary period.
- [ ] Commission rules.
- [ ] Targets.
- [ ] Documents/certificates and expiry.
- [ ] Shifts and attendance.
- [ ] Performance.
- [ ] Patients handled and revenue contribution.
- [ ] Employee of Month/Year.

**Exit gate:** HR data, compensation and performance are permissioned and auditable.

### Phase 10 — Clinic Configuration Center ⚙️

- [ ] Clinic identity/contact.
- [ ] WhatsApp/social configuration.
- [ ] Booking settings.
- [ ] Slot duration.
- [ ] Payment instructions/bank information.
- [ ] Notification templates.
- [ ] Arabic/English content.
- [ ] Workflow settings.
- [ ] AI settings.
- [ ] Security settings.
- [ ] Preserve administration account.

**Exit gate:** configuration changes are validated, scoped and auditable.

### Phase 11 — Administration + Workflow 👤⚙️

- [x] `clinic_workflow_steps` foundation.
- [ ] Role-specific workflow steps.
- [ ] SLA definitions.
- [ ] Ownership and escalation.
- [ ] Booking → Visit.
- [ ] No-show Recovery.
- [ ] Clinical Follow-up.
- [ ] Daily Closing.
- [ ] Marketing Lead.

**Exit gate:** workflow state is visible and actionable for each responsible role.

### Phase 12 — Analytics & Reports 📊

- [ ] Bookings.
- [ ] Completion.
- [ ] No-show/cancellation.
- [ ] Revenue/collection/outstanding.
- [ ] Expenses/net cash flow.
- [ ] Doctor performance.
- [ ] Employee performance.
- [ ] Daily/monthly/yearly views.
- [ ] Trends.
- [ ] Date/filter consistency.

**Exit gate:** dashboard numbers reconcile with source data for tested periods.

### Phase 13 — Invoices & RCM 🧾

- [x] `clinic_invoice_items` foundation.
- [ ] Invoice number and patient/MRN.
- [ ] Booking/doctor/service linkage.
- [ ] Multi-line invoice items.
- [ ] Subtotal/discount/total.
- [ ] Paid/remaining.
- [ ] Payment method.
- [ ] Verification.
- [ ] Refund.
- [ ] Void.
- [ ] Daily/monthly/yearly reports.
- [ ] Doctor/clinic revenue.
- [ ] Outstanding AR.

**Exit gate:** invoice totals and balances reconcile against payment records and source services.

### Phase 14 — IT Security 🛡️

- [x] `clinic_security_events` foundation.
- [ ] Login/failed-login events.
- [ ] Permission violations.
- [ ] Sensitive-action logging.
- [ ] IP/user-agent handling.
- [ ] Severity classification.
- [ ] Security dashboard.
- [ ] Audit trail integration.
- [ ] RLS review for exposed tables.
- [ ] Auth hardening, including leaked-password protection review.
- [ ] Secret/key exposure audit.

**Exit gate:** security-sensitive paths are demonstrably protected and logged.

### Phase 15 — Purchasing 🛒

- [x] Existing `clinic_purchases` foundation.
- [ ] Item/category/quantity.
- [ ] Unit/total price.
- [ ] Supplier.
- [ ] Payment method/date/notes.
- [ ] Daily/monthly/yearly reporting.
- [ ] Finance/profit linkage.

**Exit gate:** purchasing costs flow into finance without double counting.

### Phase 16 — Finance Center 💰

- [x] Existing payments/expenses/daily closing foundations.
- [ ] Revenue.
- [ ] Collection.
- [ ] Expenses.
- [ ] Doctor share.
- [ ] Clinic share.
- [ ] Net.
- [ ] Daily closing.
- [ ] Reconciliation.
- [ ] Daily/monthly/yearly reporting.

**Exit gate:** Revenue → Collection → Expenses → Doctor Share → Clinic Share → Net → Closing reconciles.

### Phase 17 — Free Smart Insights 🧠

- [x] `azaad-ai-insights` local/free foundation.
- [x] `clinic_ai_insights` storage foundation.
- [ ] No-show anomaly detection.
- [ ] Completion trend detection.
- [ ] Outstanding AR detection.
- [ ] Negative cash-flow detection.
- [ ] Follow-up backlog detection.
- [ ] Open-alert detection.
- [ ] Doctor performance signals.
- [ ] Arabic/English recommendations.
- [ ] Keep external AI optional and non-critical.

**Exit gate:** core management insights work without paid AI/API dependency.

## 4. Release Gates

### Gate A — Backend Integrity
- Tables exist and expected columns/types are verified.
- RLS and grants match the real access model.
- Edge Functions return expected contracts.
- No destructive migration is introduced without dependency review.

### Gate B — Frontend Integrity
- Admin loads without console/runtime errors.
- Existing patient/booking flows remain functional.
- New modules do not rely on brittle selectors that are absent in production.
- Arabic/English and RTL/LTR are verified.

### Gate C — Business Reconciliation
- Invoice totals reconcile.
- Payment totals reconcile.
- Finance totals reconcile.
- Analytics agrees with source data.
- Doctor/employee metrics use defined periods and source tables.

### Gate D — Security
- No secret/service-role keys in frontend.
- RLS verified on exposed tables.
- Privileged actions are authorized.
- Audit/security events are generated for sensitive operations.

### Gate E — Production
- GitHub checks pass.
- Deployment reaches READY.
- Browser smoke test passes.
- Critical paths are verified against the deployed environment.

## 5. Fast Execution Strategy

Work in small vertical slices rather than opening every module at once:

1. Discover the real backend contract.
2. Implement one bounded module slice.
3. Verify immediately against real data.
4. Fix root causes before adding the next slice.
5. Re-run regression checks.
6. Only then mark the slice complete.

Priority order for fastest useful value:

**Patient 360 → Calendar/Scheduling → Follow-up/Alerts → Invoices/RCM → Finance → Analytics → HR → Settings/Workflow → Marketing → Security hardening → Smart Insights polish.**

## 6. Current State Snapshot

- PR #9 is the current admin-suite foundation branch.
- PR #9 is not merged into `main`.
- Supabase contains the new HR, i18n, invoice-item, AI, workflow and security foundations.
- The current PR must pass technical review before merge.
- The schedule implementation requires verification against the actual production schema before it is treated as complete.

## 7. Definition of Done

A module is marked **DONE** only when:

- UI is usable.
- Real backend data is used.
- Permissions are enforced.
- Writes are validated.
- Errors are handled.
- Audit/security requirements are satisfied.
- Arabic/English work.
- RTL/LTR work.
- Existing flows still work.
- The deployed path has been verified.

**No tab-only completion. No placeholder completion. No production claim without deployment evidence.**
