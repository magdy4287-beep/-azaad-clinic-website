# AZAAD Comprehensive System Audit

## Non-negotiable contracts

1. Central I18N only. English must contain no Arabic presentation text; Arabic must contain no English presentation text; switching language must not reload or mutate data.
2. Scheduling must use real clinic/doctor/service availability and must not impose a 1–12-only ceiling.
3. Staff are provisioned by role/department. Owner/Administration can create accounts, change/recover passwords, suspend, disable, reactivate, revoke sessions, and change usernames without deleting clinical/financial history.
4. Refund/cancellation money movement is permanently gated: Request → Doctor Approval → Management/Owner Approval → Processing, regardless of original/refund payment method.
5. AI is assistive, role-scoped, free-only, and cannot approve security, identity, clinical authority, or refund mutations.
6. Every department has working reports/metrics, with Administration/Owner access according to policy.
7. Buttons and services require real runtime/E2E evidence; presence in HTML/JS is not completion.

## Measured baseline

The first comprehensive gate scanned 14 HTML pages and 75 JavaScript sources and found 17 blocking architectural findings. The gate exists to prevent serial patching of only the latest visible error.

## Completion rule

Go-Live remains blocked until the comprehensive contract and affected browser/runtime paths pass on the same candidate commit.
