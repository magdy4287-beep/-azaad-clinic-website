# AZAAD — Discount / Financial Assistance Governance

## Core policy

Patient discounts, fee waivers, and full cancellation of a consultation/service charge are controlled financial actions.

Only authorized **Management / Owner** users may approve or execute them.

Secretary, Reception, Cashier, Doctor, Marketing, HR, Procurement and AI cannot independently change the authoritative consultation price or waive a patient charge unless a future explicit policy grants a separate approval capability.

## Supported actions

Management/Owner may, within their authorization scope:

- apply a percentage discount
- apply a fixed-amount discount
- waive the consultation/service fee to zero
- approve a financial-assistance exception
- revoke/correct an unfinalized discount according to policy

The system must preserve the original list price and the final approved price/waiver amount.

## Required workflow

`STANDARD PRICE → DISCOUNT/WAIVER REQUEST → MANAGEMENT/OWNER DECISION → INVOICE FINALIZATION → PAYMENT/WAIVER CONFIRMED → CHECK-IN`

A discount or waiver is not considered valid merely because a UI value changed.

The backend must verify the actor's role, permission, scope, reason and allowed financial policy before applying it.

## Reason and audit

Every discount/waiver requires:

- actor
- actor role
- patient/appointment reference
- original price
- discount type
- discount amount or percentage
- final charge
- reason/category
- decision timestamp
- clinic timezone rendering
- approval/decision status
- immutable audit event

For sensitive financial-assistance cases, the system should support a structured reason such as `FINANCIAL_HARDSHIP`, `MANAGEMENT_COURTESY`, `OWNER_ASSISTANCE`, or another administrator-defined category.

Do not require the patient to expose unnecessary sensitive personal information in the reason field.

## Payment and check-in interaction

The normal rule remains:

**Finalized invoice + confirmed payment is required before Check-in.**

A zero-charge/fully waived appointment is an explicit exception to payment collection only when the Management/Owner-approved waiver is recorded and the final invoice state is authoritative.

Therefore:

- unpaid invoice → Check-in blocked
- partially discounted but still owing balance → Check-in blocked until required payment is confirmed
- fully waived zero-balance invoice with valid Management/Owner approval → Check-in may proceed after invoice finalization

The UI must never allow a user to bypass the gate by editing the displayed amount.

## AI restrictions

AI may:

- identify patients who appear to have an unpaid balance
- summarize financial-assistance patterns
- suggest that an authorized manager review a request
- forecast the financial impact of discounts
- produce management reports

AI may NOT:

- approve a discount
- approve a fee waiver
- set a final patient price
- convert a payable invoice to zero
- approve its own recommendation
- bypass payment/check-in controls

## Price governance

The authoritative price list remains controlled by Management/Owner. A patient-specific discount/waiver is recorded as an explicit financial adjustment; it does not silently overwrite the service's standard price.

Historical invoices must retain their original pricing and approved adjustment evidence.

## KPI / reporting

Reports must separately expose:

- gross list-price value
- approved discounts
- waived amount
- net billed value
- collected amount
- zero-charge visits
- financial-assistance cases
- discount/waiver count by period
- approval actor and timestamp where authorized

KPI calculations must use authoritative financial events, not client-side display state.

## Certification tests

1. Secretary attempts discount → denied.
2. Cashier attempts discount → denied.
3. Doctor attempts discount → denied unless an explicitly approved future policy says otherwise.
4. AI attempts discount → denied.
5. Management applies valid discount → succeeds and creates audit event.
6. Owner applies valid discount → succeeds and creates audit event.
7. Management fully waives a fee → final invoice becomes zero only after authorization and audit.
8. Patient with unpaid positive balance attempts Check-in → blocked.
9. Patient with approved zero-balance waiver and finalized invoice → allowed to proceed.
10. Original price remains visible in financial history.
11. Discount/waiver appears in reports and KPIs with execution timestamp.
12. Unauthorized API requests are rejected server-side even if the UI is manipulated.
