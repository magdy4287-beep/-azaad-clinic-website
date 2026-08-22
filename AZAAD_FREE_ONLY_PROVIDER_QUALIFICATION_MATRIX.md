# AZAAD — Free-Only Provider Qualification Matrix

**AI-First • Free-Only • Safety-Gated • Fail-Closed**

## Permanent rule

AZAAD must not acquire a paid dependency to satisfy disaster recovery, migration, availability, security, monitoring, AI, storage, database, or authentication requirements.

A provider is **not approved** merely because it currently advertises a free tier. Free-Only qualification must be proven at incident time.

## Qualification gates

| Gate | Requirement | Evidence | Blocking condition |
|---|---|---|---|
| Cost | $0 required path | Current official pricing + account configuration | Any mandatory paid component |
| Billing safety | No automatic paid conversion | Billing/account evidence | Automatic upgrade or uncontrolled spend |
| Database | PostgreSQL compatibility where required | Schema restore + query tests | Schema/function incompatibility |
| Auth | Secure authentication and recovery | Auth E2E + security tests | Weak or incompatible authorization |
| Authorization | RLS/RBAC/equivalent isolation | Negative + positive authorization tests | Any unauthorized data access |
| Storage | Portable object storage | Export/import + checksum tests | Data loss or unverified objects |
| Export | Complete machine-readable export | Successful dry-run export | Missing required domain data |
| Import | Deterministic restore | Restore rehearsal | Non-deterministic or partial restore |
| Audit | Audit/event preservation | Count + integrity reconciliation | Missing attribution/history |
| Limits | Known free-tier ceilings | Current provider limits | Expected workload exceeds limits |
| Lock-in | Provider-independent data model | Migration rehearsal | Provider-only data dependency |
| Operations | Recoverable without paid tooling | Documented runbook + drill | Paid-only recovery step |
| Security | Secrets/PII protected | Security review | Plaintext secret/PII exposure |
| E2E | Clinical/financial workflows pass | Fresh exact-SHA evidence | Any critical regression |

## Qualification states

- `QUALIFIED` — all applicable gates have fresh evidence.
- `CONDITIONALLY QUALIFIED` — non-blocking limitations are documented and accepted.
- `NOT PROVEN ON FREE-ONLY STACK` — evidence is missing or stale.
- `REJECTED` — a blocking security, integrity, portability, or cost condition failed.

## Candidate architecture preference

1. Self-controlled PostgreSQL-compatible runtime using open-source components.
2. Free PostgreSQL provider qualified at incident time.
3. Free/open-source BaaS only after proving Auth, authorization, storage, export, limits, and migration behavior.

No provider becomes Production DR solely by appearing in this document.

## Requalification triggers

Re-run the qualification cycle after any of the following:

- provider pricing or free-tier changes
- provider terms/limits changes
- major provider API/auth/database changes
- AZAAD schema or authorization changes
- new clinical or financial workflow
- security incident
- DR restore failure
- material workload increase

## Evidence contract

Every qualification record must identify:

- exact AZAAD candidate SHA
- provider/runtime version where applicable
- date/time of test
- data snapshot identifier
- test commands/results
- security and authorization results
- reconciliation results
- cost/billing evidence

No evidence means no certification.
