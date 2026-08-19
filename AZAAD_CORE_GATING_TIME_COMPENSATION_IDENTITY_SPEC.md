# AZAAD — Core Gating, Time, Compensation & Staff Identity Specification

## Non-negotiable business rules

### 1. Patient time display

Patient-facing and Administration-facing appointment times are displayed in a 12-hour clock only:

- `1:00 AM` through `12:59 AM`
- `1:00 PM` through `12:59 PM`

Use localized Arabic/English presentation while retaining an unambiguous canonical timestamp in storage. Never expose a 24-hour clock in Patient or Administration UI.

Every important event shows its execution time when useful for tracking and reporting.

### 2. Progressive patient workflow gate

A patient must not be able to progress to check-in/clinical workflow until the required invoice/payment gate is satisfied.

Canonical flow:

`BOOKED → CONFIRMED → INVOICE_CREATED → PAYMENT_CONFIRMED → CHECKED_IN → SENT_TO_DOCTOR → VISIT_STARTED → VISIT_COMPLETED → FOLLOW_UP`

A workflow transition is server-authorized. UI visibility alone is never a security control.

#### Payment gate

`CHECKED_IN` requires:

- an authoritative invoice for the appointment/service
- required amount calculated from the active authorized price rule
- payment recorded/confirmed according to the configured payment policy
- no blocking payment exception

If the payment gate is not satisfied:

- Check-in is blocked
- Send-to-doctor is blocked
- Visit-start is blocked
- UI shows `💵 Payment ❌ Not Paid` and the blocking reason
- authorized Frontdesk/Management users can complete the missing financial step

No frontend-only bypass is allowed.

### 3. Price governance

Management/Owner can define and update consultation/service prices:

- per doctor
- globally for all doctors
- per service
- effective-dated price rules
- optional department/service overrides

The system resolves the applicable price deterministically and records which price rule produced the invoice.

Frontdesk/Secretary cannot edit authoritative doctor/service prices unless an explicit higher permission is granted by policy. A transaction cannot silently overwrite the catalog/price rule.

Historical invoices retain the price actually applied at issuance; later price changes do not mutate historical financial records.

### 4. Staff compensation model

Each staff member has a compensation profile independent from their application login.

Supported modes:

- `SALARY_ONLY`
- `PERCENTAGE_ONLY`
- `SALARY_PLUS_PERCENTAGE`
- `FIXED_PER_SERVICE`
- `HYBRID_CUSTOM` where explicitly configured by authorized Management/Owner policy

Compensation configuration can include:

- base salary
- percentage rate
- percentage basis (explicitly defined, e.g. eligible collected revenue)
- service/doctor scope
- effective date
- end date
- currency
- deductions/adjustments where supported
- approval status

Management/Owner only may create/change compensation policy. AI may calculate/report from approved rules but cannot authorize compensation changes.

### 5. Unified staff account lifecycle

Every employee has an individual account. Shared employee credentials are prohibited.

Management/Owner can:

- create username/account
- issue or reset password through the approved authentication workflow
- enable/disable account immediately
- update permitted identity/profile fields
- change role/department subject to policy
- revoke access
- initiate account recovery/reset
- permanently remove/deactivate account according to retention/audit policy

A departing employee's access can be disabled immediately. Disabling access must not erase historical audit records.

Passwords must never be stored in application tables as plaintext. Use the configured authentication provider's secure credential/reset mechanisms. Admin UI may initiate a reset; it must not display the employee's existing password.

### 6. Role and department authorization

Application access is derived from:

`User → Role → Department → Permission → Scope → Resource`

Examples:

- Frontdesk: operational patient/appointment/invoice/payment workflows allowed by scope
- Doctor: assigned/authorized clinical workflows
- Marketing: marketing-only workspace and permitted campaign actions
- Finance: financial workflows allowed by scope
- HR: workforce administration allowed by scope
- Management: broad operational administration
- Owner: highest authorized governance scope

A role label alone is not sufficient authorization.

### 7. Audit requirements

Record immutable events for:

- account creation
- password reset initiation/completion metadata
- enable/disable/revoke
- role/department changes
- price rule creation/change
- invoice creation
- payment confirmation
- check-in attempt and result
- workflow transition
- compensation rule changes

Each event uses authoritative server time and identifies actor, resource, action, result and relevant before/after values where permitted.

### 8. UI state requirements

Every gated action must show an explicit state:

- `⏳ Processing`
- `✅ Completed`
- `❌ Blocked / Failed`
- `⚠️ Needs attention`

Do not show success before backend confirmation. Disable duplicate submissions while a command is pending and update the affected UI without unnecessary full-page reloads.

### 9. Reports/KPI

The following must be measurable from authoritative events:

- booking-to-invoice time
- invoice-to-payment time
- payment-to-check-in time
- check-in-to-doctor handoff time
- visit duration
- follow-up scheduling
- unpaid/blocked appointments
- price changes
- staff account changes
- compensation changes

All KPI definitions include source event, time window, timezone, aggregation and visibility scope.

## Certification scenarios

1. Unpaid appointment cannot check in.
2. Appointment with no authoritative invoice cannot check in.
3. Confirmed payment unlocks check-in only after backend confirmation.
4. Check-in cannot occur before payment gate.
5. Sent-to-doctor cannot occur before check-in.
6. Doctor cannot start a visit before the required prior gates.
7. Patient/Admin UI shows 12-hour time only.
8. Historical invoice retains its issued price after a later price change.
9. Frontdesk cannot change authoritative prices.
10. Management/Owner can set global and doctor-specific prices.
11. Salary-only, percentage-only and salary-plus-percentage profiles calculate from approved rules.
12. Employee account can be disabled immediately.
13. Disabled employee cannot authenticate/use protected workflows.
14. Existing audit history remains after account disable/deactivation.
15. Existing password is never exposed to Management/Owner.
16. Unauthorized role cannot access compensation, security or owner controls.
17. KPI/report data is derived from real events, not UI assumptions.
