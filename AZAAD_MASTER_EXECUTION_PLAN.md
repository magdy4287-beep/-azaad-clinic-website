# AZAAD CLINIC — MASTER EXECUTION PLAN

## 1. Product Goal

Build **AZAAD CLINIC MANAGEMENT SYSTEM** as a production-ready clinic operating system, not a collection of admin tabs.

Core rule:

> A module is complete only when the real end-to-end path works: UI → authorization → database/Edge Function → validation → audit/security → result/error handling → Arabic/English → responsive behavior → verification.

## 2. Non-Negotiable Architecture Rules

- Free-first / no paid service is required for core operation, now or in the foreseeable future.
- No paid AI, translation, messaging, analytics, hosting, or automation service may be a hard dependency of core clinic operation.
- External free-tier AI may be optional; core workflows must continue if quotas disappear.
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
- [x] English/Arabic admin layer foundation.
- [x] RTL/LTR switching foundation.
- [x] Dynamic translation hardening foundation.
- [ ] Replace brittle text-scan translation with stable translation keys / centralized renderer where practical.
- [ ] Translate headings, labels, buttons, placeholders, options, validation errors, empty states, toast messages, modal text and dynamically generated records.
- [ ] Verify that switching to English leaves **zero Arabic UI chrome** on the page.
- [ ] Verify that switching to Arabic restores Arabic UI chrome and RTL.
- [ ] Keep patient/doctor/service names bilingual where source data supports it.
- [ ] No paid translation dependency.

**Exit gate:** full admin chrome is language-complete in both modes; no mixed-language UI remains in the selected mode.

### Phase 2 — Patient 360 + Appointment Center 🤢📅

- [ ] Search by patient name.
- [ ] Search by phone.
- [ ] Search by MRN.
- [ ] Search by booking number.
- [ ] Show today's patient/booking files under the status filter area.
- [ ] Real calendar/date selector for yesterday, today, tomorrow and arbitrary future dates.
- [ ] Date selection filters real appointments/patients by appointment date.
- [ ] Show patient demographics, phone, MRN and booking details.
- [ ] Show upcoming appointments and previous visits.
- [ ] Show invoices, paid amounts and outstanding balances.
- [ ] Allow controlled editing of patient name/phone with validation and audit.
- [ ] Show warnings/alerts/clinical administrative notes with permission controls.
- [ ] Show clinical history to authorized doctors/admin.
- [ ] Show doctor notes per visit.
- [ ] Show longitudinal patient progress graph across visits.
- [ ] Show treatment/progress trend clearly enough to evaluate whether care is improving.
- [ ] Show next recommended session/follow-up date when available.
- [ ] Generate follow-up/no-show/missed-action alerts.
- [ ] Rebooking workflow.
- [ ] Safe patient merge with historical preservation and audit.
- [ ] Optional free/local Smart Insights for operational and progress signals; never make AI a dependency for clinical decisions.

**Exit gate:** one patient can be followed end-to-end from booking through visit, clinical progress, billing and follow-up, with real date/calendar behavior and auditable edits.

### Phase 3 — Doctors Center 🧑‍⚕️

- [ ] Show every registered doctor, not only the Add Doctor action.
- [ ] Photo beside each doctor.
- [ ] Add/change photo.
- [ ] Arabic/English name.
- [ ] Specialty.
- [ ] Bio.
- [ ] Services.
- [ ] Active/inactive state.
- [ ] Edit doctor.
- [ ] Archive doctor when leaving the clinic; preserve historical records.
- [ ] Schedule linkage.
- [ ] Performance, patients, completion, no-show and revenue metrics.
- [ ] Free/local AI suggestions for operational performance only.

**Exit gate:** doctor lifecycle, profile, scheduling and historical relationships are safe and functional.

### Phase 4 — Services Center 🩺

- [ ] Show all existing services on load.
- [ ] Add service.
- [ ] Edit service.
- [ ] Archive/remove service safely without breaking historical invoices.
- [ ] Price.
- [ ] Duration.
- [ ] Arabic/English name.
- [ ] Arabic/English description.
- [ ] Active/inactive.
- [ ] Ordering.
- [ ] Doctor association.
- [ ] Booking linkage.
- [ ] Invoice/RCM linkage.
- [ ] Free/local AI-assisted operational suggestions where useful.

**Exit gate:** a service can flow from catalog → doctor → booking → invoice without duplicated definitions.

### Phase 5 — Doctor Scheduling 🕐

- [x] Explicit weekday payload foundation.
- [x] `doctor_weekly_schedules` schema verified in Supabase.
- [ ] Load all active doctors into selector.
- [ ] Show each doctor's saved weekly schedule.
- [ ] Edit each weekday.
- [ ] Working days and closures.
- [ ] Start/end times.
- [ ] Break start/end.
- [ ] Slot duration.
- [ ] Buffer.
- [ ] Maximum bookings.
- [ ] Booking-mode rules.
- [ ] Conflict/overlap validation.
- [ ] Availability preview.
- [ ] Booking engine consistency check.
- [ ] Optional free/local AI scheduling suggestions without changing saved rules automatically.

**Exit gate:** generated availability is deterministic and matches the saved schedule.

### Phase 6 — Marketing Workspace 📣

- [ ] Show all existing posts/campaign records, not only New Post.
- [ ] Add post/offer.
- [ ] Image/media support.
- [ ] Video/media support where supported by existing storage.
- [ ] Caption and long description.
- [ ] Arabic/English copy.
- [ ] Platform selection.
- [ ] Draft/scheduled/published states.
- [ ] Edit.
- [ ] Archive/delete safely.
- [ ] Leads and source.
- [ ] Conversion tracking.
- [ ] Marketing employee ownership.
- [ ] Campaign performance.
- [ ] Free/local AI ideas, copy suggestions and campaign analysis.

**Exit gate:** lead → campaign/source → conversion can be measured and managed.

### Phase 7 — Holidays & Closures 🚫

- [ ] Clinic-wide closure.
- [ ] Doctor-specific closure.
- [ ] Selector includes all active doctors.
- [ ] Allow choosing any active doctor for a doctor-specific closure.
- [ ] Date range and reason.
- [ ] Arabic/English notes.
- [ ] Booking engine enforcement.
- [ ] Historical booking preservation.
- [ ] Free/local AI suggestions for closure/availability conflicts where useful.

**Exit gate:** unavailable periods cannot be booked and historical bookings remain intact.

### Phase 8 — General Working Hours 🕘

- [ ] Replace Save-only UI with a real editable weekly hours table.
- [ ] Each weekday.
- [ ] Enabled/closed state.
- [ ] Start/end time.
- [ ] Break start/end.
- [ ] Save/update validation.
- [ ] Preview of effective clinic hours.
- [ ] Booking engine linkage.
- [ ] Arabic/English.
- [ ] Free/local AI suggestions for operational hours only; no automatic changes without authorization.

**Exit gate:** saved clinic hours are visible, editable, persisted and honored by booking availability.

### Phase 9 — HR Management 👥

**Existing employee management is protected and must not be replaced.**

- [ ] Keep current employee-management workflow intact.
- [ ] Show active employees beneath the existing management area.
- [ ] Edit/details action per employee.
- [x] `clinic_staff_hr` foundation.
- [x] `clinic_staff_documents` foundation.
- [x] `clinic_compensation_rules` foundation.
- [ ] HR profile.
- [ ] Department.
- [ ] Job title.
- [ ] Hire date.
- [ ] Employment status.
- [ ] Salary and salary period.
- [ ] Commission percentage.
- [ ] Fixed per visit.
- [ ] Fixed per booking.
- [ ] Targets.
- [ ] Documents/certificates and expiry dates.
- [ ] Shifts and attendance.
- [ ] Performance.
- [ ] Patients handled.
- [ ] Revenue contribution.
- [ ] Doctor/employee share reporting.
- [ ] Monthly/yearly compensation reporting.
- [ ] Employee of Month/Year based on defined metrics.
- [ ] HR-style dashboards, records and reminders.
- [ ] Free/local AI workforce insights and improvement suggestions.

**Exit gate:** HR data, compensation and performance are permissioned, auditable and reconciled with finance/analytics.

### Phase 10 — Clinic Configuration Center ⚙️

- [ ] Replace empty Settings panel with a real configuration center.
- [ ] Clinic identity/contact.
- [ ] WhatsApp configuration.
- [ ] Social links.
- [ ] Booking settings.
- [ ] Slot duration defaults.
- [ ] Payment instructions.
- [ ] Bank information with appropriate access restrictions.
- [ ] Notification templates.
- [ ] Arabic/English content.
- [ ] Workflow settings.
- [ ] AI settings.
- [ ] Security settings.
- [ ] Validation and audit for every privileged configuration change.
- [ ] Preserve administration account.
- [ ] No secrets displayed unnecessarily in the UI.

**Exit gate:** configuration changes are validated, scoped, permissioned and auditable.

### Phase 11 — Administration + Workflow 👤⚙️

- [x] `clinic_workflow_steps` foundation.
- [ ] Keep current administration account unchanged.
- [ ] Role-specific workflow steps.
- [ ] SLA definitions.
- [ ] Ownership and escalation.
- [ ] Booking → Visit.
- [ ] No-show Recovery.
- [ ] Clinical Follow-up.
- [ ] Daily Closing.
- [ ] Marketing Lead.
- [ ] Automated reminders/escalations where supported by free infrastructure.
- [ ] Management recommendations from real reports.
- [ ] Doctor/service pricing and compensation-rule administration with strict authorization and audit.

**Exit gate:** workflow state is visible, actionable, permissioned and automatically escalates overdue work.

### Phase 12 — Analytics & Reports 📊

- [ ] Dedicated charts/dashboard section.
- [ ] Bookings.
- [ ] Completion rate.
- [ ] No-show.
- [ ] Cancellation.
- [ ] Revenue.
- [ ] Collected.
- [ ] Outstanding.
- [ ] Expenses.
- [ ] Net cash flow.
- [ ] Doctor share.
- [ ] Clinic share.
- [ ] Employee performance.
- [ ] Patients handled.
- [ ] Daily/monthly/yearly reports.
- [ ] Trends.
- [ ] Date/filter consistency.
- [ ] Recommendations for workflow, quality, productivity and profitability.
- [ ] Free/local AI analytics and recommendations.

**Exit gate:** dashboard numbers reconcile with source data for tested periods and recommendations are traceable to measured data.

### Phase 13 — Invoices & RCM 🧾

**Priority: #1 management center after Patient/Booking.**

- [x] `clinic_invoice_items` foundation.
- [ ] Show all existing invoices.
- [ ] Search by invoice number.
- [ ] Search by patient name.
- [ ] Search by phone.
- [ ] Search by MRN.
- [ ] Real invoice calendar/date filter.
- [ ] Daily invoice list.
- [ ] Invoice number.
- [ ] Patient/MRN/phone.
- [ ] Booking.
- [ ] Doctor.
- [ ] Service.
- [ ] Multi-line invoice items.
- [ ] Subtotal.
- [ ] Discount.
- [ ] Total.
- [ ] Paid.
- [ ] Remaining.
- [ ] Payment method.
- [ ] Verification.
- [ ] Refund.
- [ ] Void.
- [ ] Edit with controlled audit rules.
- [ ] Daily/monthly/yearly reports.
- [ ] Doctor revenue.
- [ ] Clinic revenue.
- [ ] Outstanding AR.
- [ ] RCM work queues and payment follow-up.
- [ ] Free/local AI for anomaly detection and collections prioritization.

**Exit gate:** invoice totals and balances reconcile against payment records and source services; all sensitive actions are authorized and audited.

### Phase 14 — IT Security 🛡️

- [x] `clinic_security_events` foundation.
- [ ] Login events.
- [ ] Failed-login events.
- [ ] Permission violations.
- [ ] Sensitive-action logging.
- [ ] IP/user-agent handling.
- [ ] Severity classification.
- [ ] Security dashboard.
- [ ] Audit trail integration.
- [ ] RLS review for exposed tables.
- [ ] Auth hardening, including leaked-password protection review.
- [ ] Secret/key exposure audit.
- [ ] Input validation and output encoding review.
- [ ] Rate limiting/abuse controls where supported by current free infrastructure.
- [ ] Backup/recovery verification and operational continuity plan.
- [ ] Monitoring for runtime failures and deployment regressions.
- [ ] Free/local AI-assisted anomaly summaries only; AI is never the security control itself.

**Exit gate:** security-sensitive paths are demonstrably protected, logged and recoverable; no single AI or external paid service is a security dependency.

### Phase 15 — Purchasing 🛒

- [x] Existing `clinic_purchases` foundation.
- [ ] Show existing purchases.
- [ ] Add/edit/archive purchase safely.
- [ ] Item/category/quantity.
- [ ] Unit/total price.
- [ ] Supplier.
- [ ] Payment method/date/notes.
- [ ] Daily/monthly/yearly reporting.
- [ ] Finance/profit linkage.
- [ ] Free/local AI suggestions for purchasing trends and waste control.

**Exit gate:** purchasing costs flow into finance without double counting.

### Phase 16 — Finance Center 💰

- [x] Existing payments/expenses/daily closing foundations.
- [ ] Show real finance data.
- [ ] Revenue.
- [ ] Collection.
- [ ] Expenses.
- [ ] Doctor share.
- [ ] Clinic share.
- [ ] Employee-related compensation where authorized.
- [ ] Net.
- [ ] Daily closing.
- [ ] Reconciliation.
- [ ] Daily/monthly/yearly reporting.
- [ ] Finance staffing visibility where applicable.
- [ ] Free/local AI financial anomaly and trend insights.

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
- [ ] Employee performance signals.
- [ ] Scheduling optimization suggestions.
- [ ] Marketing ideas and campaign analysis.
- [ ] Arabic/English recommendations.
- [ ] Explain the data/signals behind recommendations.
- [ ] Keep external AI optional and non-critical.

**Exit gate:** core management insights work without paid AI/API dependency and never silently modify clinical/financial decisions.

## 4. Cross-Cutting Acceptance Gates

### Language Gate 🌐
- English mode: no Arabic UI chrome remains.
- Arabic mode: Arabic UI chrome + RTL restored.
- Dynamic rows/modals/options/placeholders/toasts/errors are translated.
- Patient/doctor/service data uses bilingual fields where available.

### Patient/Clinical Gate 🤢
- Date search returns the correct appointment population.
- Patient identity is consistent across booking, visit and invoice.
- Clinical progress is historical and read-only where appropriate.
- AI never replaces clinician judgment.

### Financial Gate 💰
- Invoice totals reconcile.
- Payments reconcile.
- Outstanding reconciles.
- Doctor/clinic shares reconcile.
- Expenses and purchasing reconcile.
- Daily/monthly/yearly reports use consistent periods.

### Security Gate 🛡️
- No secret/service-role keys in frontend.
- RLS verified on exposed tables.
- Privileged actions are authorized.
- Sensitive operations are audited.
- Security events are available for investigation.
- Backups/recovery are verified.

### Free-First Gate 🆓
- Core clinic operation works without paid AI/API.
- Core clinic operation does not depend on a free quota that can unexpectedly become unavailable.
- Optional external AI integrations have a local/free fallback.
- No paid upgrade is introduced merely to bypass a deployment/build limit without explicit approval.

### Production Gate 🚀
- GitHub checks pass.
- Deployment reaches READY.
- Browser smoke test passes.
- Critical paths are verified against the deployed environment.
- Production is never declared updated from a GitHub commit alone.

## 5. Fast Execution Strategy

Work in small vertical slices rather than opening every module at once:

1. Discover the real backend contract.
2. Fix the current blocker.
3. Implement one bounded module slice.
4. Verify immediately against real data.
5. Fix root causes before adding the next slice.
6. Re-run regression checks.
7. Only then mark the slice complete.

Priority order for fastest useful value:

**English hardening → Patient 360/Calendar → Scheduling/Closures/Hours → Doctors → Services → Follow-up/Alerts → Invoices/RCM → Finance → Analytics → HR → Settings/Workflow → Marketing → Security hardening → Smart Insights polish.**

## 6. Current State Snapshot

- PR #9 is the current admin-suite foundation branch.
- PR #9 is not merged into `main`.
- Supabase contains the HR, i18n, invoice-item, AI, workflow and security foundations.
- `doctor_weekly_schedules` exists with weekday/enabled/start/end/break/slot/buffer/max-bookings/mode fields.
- Current English implementation is a foundation only; it must be hardened until zero Arabic UI chrome remains in English mode.
- Existing admin account and patient-facing booking experience remain protected.
- The current PR must pass technical review before merge.

## 7. Definition of Done

A module is marked **DONE** only when:

- UI is usable and complete, not just a tab/button.
- Real backend data is used.
- Permissions are enforced.
- Writes are validated.
- Errors are handled.
- Audit/security requirements are satisfied.
- Arabic/English work completely.
- RTL/LTR work.
- Existing flows still work.
- Business calculations reconcile.
- Free-first requirement is satisfied.
- The deployed path has been verified.

**No tab-only completion. No placeholder completion. No paid dependency for core operation. No production claim without deployment evidence.**
