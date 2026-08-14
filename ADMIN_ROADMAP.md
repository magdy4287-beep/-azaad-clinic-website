# Azaad Clinic — Administration Roadmap

## Product rule
- **Free-only architecture:** no paid AI API, paid SaaS, paid plugin, or future mandatory subscription is required by this roadmap.
- AI uses the existing Supabase Edge Functions and the current **free-local-rules-engine** insights service where applicable.
- Patient-facing pages and the current booking experience remain unchanged; this roadmap targets the administration system.
- Existing authentication, staff roles, permissions, audit trail, Supabase Edge Functions, and current admin controller remain the baseline.

## Phase 1 — Admin foundation and daily operations
1. **🌐 Full English mode**
   - One language switch for the entire admin page.
   - Translate static labels, buttons, filters, dynamically generated panels, status text, and newly injected content.
   - Switch document direction LTR/RTL and persist the choice.

2. **📅 Appointments + Patient 360**
   - Search by patient name, phone, MRN, and booking number.
   - Date filters for today, yesterday, tomorrow, and arbitrary dates.
   - Patient 360 view: appointments, upcoming appointments, invoices, payments, outstanding balance, alerts, follow-ups, clinical visits, progress history.
   - Doctor/management visibility follows role permissions.
   - Future slice: no-show and missed-session automation through the existing alert/follow-up services.

3. **🧑‍⚕️ Doctors**
   - List active doctors.
   - Edit profile, specialty, contact data, image, ordering and active status.
   - Soft-delete/deactivate when a doctor leaves; preserve historical clinical and financial records.

4. **🩺 Services**
   - Show all services, not only an Add button.
   - Edit price, duration, description, active status and ordering.
   - Soft-delete/deactivate so historical invoices remain intact.

5. **🕐 Doctor schedules**
   - Show every active doctor.
   - Seven-day schedule, working hours, breaks, appointment duration, capacity and future scheduling controls.

6. **📣 Posts & offers**
   - List existing posts.
   - Draft/publish/edit/delete workflow.
   - Image/video support through the existing clinic media storage endpoint.
   - Later slice: free AI copy suggestions and campaign ideas.

7. **🚫 Holidays & closures**
   - Clinic-wide closure or doctor-specific closure.
   - Active doctors listed as selectable targets.
   - Date range and notes.

8. **🕘 General working hours**
   - Seven-day editable table.
   - Working state, start/end, break start/end.
   - Keep scheduling logic aligned with these hours.

## Phase 2 — Workforce and management
9. **👥 Human Resources**
   - Preserve the current employee-management workflow.
   - Add employee details, active/terminated status, role, permissions, last login, notes, certificates and HR records.
   - Add salary/commission fields only in a controlled finance/HR layer.
   - Monthly/yearly staff KPIs and employee-of-the-month/year indicators.

10. **⚙️ Clinic settings**
    - Structured settings instead of an empty shell.
    - Clinic identity, contact, address, social links, branding, booking notice, appointment slot length and operational defaults.

11. **👤 Admin account + workflow**
    - Keep the existing account/password flow.
    - Add role-based workflow expectations and operational checklists.
    - Protect OWNER and high-privilege operations.

12. **📊 Management analytics**
    - Daily/monthly/yearly KPI periods.
    - Appointments, completion, no-show, cancellation, collected revenue, expenses, outstanding receivables, doctor performance, alerts and follow-ups.
    - Trend charts and operational recommendations.

## Phase 3 — Revenue Cycle Management and finance
13. **🧾 Invoice Center / RCM**
    - Search by invoice, patient name, phone and MRN.
    - Calendar/date filters.
    - Invoice totals, paid amounts, remaining amounts, status and payment history.
    - Daily/monthly/yearly summaries.
    - Preserve auditability of billing and payment changes.

14. **🛡️ IT security**
    - Keep secrets server-side.
    - Publishable keys only in public clients.
    - Authenticated Edge Functions for protected data.
    - Role/permission checks and audit logging.
    - Rate limiting, input validation, secure headers, no-store responses and safe error handling.
    - Security/advisor checks after schema changes.
    - No claim of absolute immunity from attacks; the target is layered hardening and rapid detection/recovery.

15. **🛒 Procurement**
    - Item, quantity, unit price, supplier, total, date and category.
    - Link procurement/expenses into financial reporting.
    - Monthly/yearly spend analysis and budget warnings.

16. **💰 Finance**
    - Revenue, collections, expenses, procurement, outstanding balances, doctor/service revenue and net cash flow.
    - Daily/monthly/yearly reporting.
    - Commission/split calculations only from explicit configured rules.

17. **📣 Marketing**
    - Campaign planning, offers, post library, channel status and performance KPIs.
    - Free AI suggestions using existing local/rules-based insights and optional future self-hosted/free models only.

## Current implementation checkpoint
- `admin.html` remains the baseline administration controller.
- `patient-session-bridge-v3.js` now loads the enhancement layer on `admin.html` and keeps session restoration behavior.
- `admin-enhancements-v1.js` adds free-only Patient 360, Invoice/RCM, Analytics and AI panels plus an admin-wide language switch.
- Existing Supabase functions already provide Patient 360, Invoice Center, Management Dashboard and AI Insights capabilities.

## Verification gates
- Every phase must be verified against the real Supabase data model before adding schema assumptions.
- No service-role key is placed in browser code.
- No destructive hard-delete is used for doctors/services where historical records depend on them.
- Production deployment is accepted only after a fresh successful deployment and runtime verification.
