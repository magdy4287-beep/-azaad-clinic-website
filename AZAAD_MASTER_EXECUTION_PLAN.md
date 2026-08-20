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

### Cross-Department Operational Integration — Added 2026-08-19

- [x] Doctor transfer data model with patient/doctor request source and treating-doctor approval state.
- [x] Attendance model with clock-in/out, breaks, lateness and absence status.
- [x] Doctor compensation model: percentage, salary, salary + percentage, fixed-per-visit.
- [x] Effective-dated consultation pricing foundation.
- [x] Canonical service-catalog mapping foundation to prevent duplicate service definitions.
- [x] Daily operational report aggregate foundation.
- [x] Doctor dashboard operational center mount.
- [x] Cross-department acceptance contract documented.
- [ ] Wire secretary unified daily schedule UI with one row per doctor and inline appointment workflow.
- [ ] Wire free-slot booking and waiting-list conversion into the unified schedule.
- [ ] Wire early/late check-in to doctor availability while preserving original appointment time.
- [ ] Wire transfer request/doctor approval/completion UI.
- [ ] Wire attendance UI and payroll/compensation calculations to the existing HR/finance surfaces.
- [ ] Wire management/owner global and per-doctor/service pricing UI.
- [ ] Normalize duplicate service records against the canonical catalog and preserve historical invoice references.
- [ ] Wire daily/monthly/yearly reports and employee-of-month/year scoring to source facts.
- [ ] Wire central free/local AI recommendations to report facts with traceable evidence.

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

### Phase 9 — HR Management 👥

**Existing employee management is protected and must not be replaced.**

- [ ] Keep current employee-management workflow intact.
- [ ] Show active employees beneath the existing management area.
- [ ] Edit/details action per employee.
- [x] `clinic_staff_hr` foundation.
- [x] `clinic_staff_documents` foundation.
- [x] `clinic_compensation_rules` foundation.
- [x] Doctor-specific `clinic_doctor_compensation_rules` foundation.
- [x] `clinic_staff_attendance` foundation.
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
- [ ] Shifts and attendance UI.
- [ ] Payroll calculation/reconciliation.
- [ ] Performance.
- [ ] Patients handled.
- [ ] Revenue contribution.
- [ ] Doctor/employee share reporting.
- [ ] Monthly/yearly compensation reporting.
- [ ] Employee of Month/Year based on defined metrics.
- [ ] HR-style dashboards, records and reminders.
- [ ] Free/local AI workforce insights and improvement suggestions.

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
- [ ] Attendance.
- [ ] Lateness/absence.
- [ ] Compensation.
- [ ] Employee performance.
- [ ] Patients handled.
- [ ] Daily/monthly/yearly reports.
- [ ] Trends.
- [ ] Date/filter consistency.
- [ ] Recommendations for workflow, quality, productivity and profitability.
- [ ] Employee of Month/Year evidence-based scoring.
- [ ] Free/local AI analytics and recommendations.

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
- Compensation calculations reconcile to approved rules and attendance/visit facts.

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

- PR #58 is the current comprehensive system-hardening branch.
- PR #58 is not merged into `main`.
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