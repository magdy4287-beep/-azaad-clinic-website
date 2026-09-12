# AZAAD Workflow Ownership Registry

## Purpose

This registry is the architectural source of truth for GitHub Actions workflow ownership. A workflow may exist only when it has a distinct responsibility, a distinct verification surface, and a clear set of source files/contracts that it owns.

## Canonical ownership map

| Workflow | Owner boundary | Verification responsibility | Status |
|---|---|---|---|
| `azaad-production-certification-gate.yml` | Production certification baseline | Certification plan, free-only, AI-first, exact-commit evidence | Canonical |
| `azaad-release-governance-gate.yml` | Release governance | Release policy and governance controls | Canonical |
| `azaad-final-release-certification.yml` | Manual final go-live decision | Exact candidate SHA + required fresh CI + production surface | Canonical manual gate |
| `azaad-admin-gates.yml` | Admin structural acceptance | Admin, scheduling, marketing structural contracts | Canonical Admin acceptance |
| `azaad-admin-nextgen-gate.yml` | Admin Next-Gen feature contracts | Next-Gen JS, role, bilingual and credential-safety contracts | Canonical feature gate |
| `azaad-browser-e2e.yml` | Browser behavior | End-to-end browser behavior against the intended artifact | Canonical runtime gate |
| `azaad-comprehensive-system-contract.yml` | Cross-system contracts | System-wide structural contracts | Canonical system gate |
| `azaad-appointment-gate.yml` | Appointment contract | Appointment contract only | Canonical appointment gate |
| `central-scheduling-gate.yml` | Central scheduling domain | Central scheduling contract | Canonical scheduling-domain gate |
| `scheduling-actions-gate.yml` | Scheduling actions | Scheduling action contract | Canonical scheduling-actions gate |
| `azaad-booking-ui-final-fix.yml` | Booking presentation behavior | Booking UI formatting/action contract | Canonical booking-UI gate |
| `azaad-clinical-ai-gate.yml` | Clinician AI safety/UX | Clinical AI cockpit, longitudinal evidence and safety boundary | Canonical clinical-AI gate |
| `azaad-ai-gate.yml` | AI operating system | AI operating-system contract | Canonical AI platform gate |
| `azaad-department-ai-gate.yml` | Department AI boundaries | Department-level AI contracts | Canonical domain gate |
| `azaad-executive-ai-gate.yml` | Executive AI boundaries | Executive AI contracts | Canonical domain gate |
| `azaad-feature-evolution-gate.yml` | Feature evolution | Marketing/public privacy feature contract and required feature artifacts | Canonical feature gate |
| `azaad-operations-health.yml` | Operational health | Runtime/operations health checks | Canonical operations gate |
| `azaad-clinical-authorization-e2e.yml` | Clinical authorization boundary | Authenticated multi-role authorization and exact-SHA E2E | Canonical clinical authorization E2E |
| `azaad-clinical-fixture-boundary.yml` | Clinical fixture safety | Controlled fixture creation/isolation contract | Canonical fixture boundary gate |
| `azaad-emergency-dr-restore.yml` | Emergency DR transport/restore | Historical Supabase public-schema snapshot to DR-capable Neon target | Canonical emergency DR gate |
| `azaad-emergency-dr-auth.yml` | Emergency identity DR | Historical identity/auth portability preflight | Canonical DR support gate |
| `azaad-emergency-dr-execute.yml` | Emergency DR execution | Explicitly authorized historical DR execution path | Canonical emergency execution gate |
| `azaad-emergency-dr-final.yml` | Emergency DR final verification | Final DR evidence and reconciliation | Canonical DR final gate |
| `azaad-emergency-dr-functions.yml` | Emergency function recovery | Historical function transport/recovery evidence | Canonical DR function gate |
| `azaad-dr-synthetic.yml` | DR synthetic validation | Non-destructive DR readiness simulation | Canonical synthetic DR gate |
| `azaad-controlled-p0-neon-parity.yml` | Neon runtime integrity | Read-only Neon target, schema, reachability, and critical-table verification | Canonical read-only integrity gate |
| `azaad-controlled-runtime-provider-readiness.yml` | Controlled provider readiness | Read-only Appwrite identity/storage inventory plus Neon reachability | Canonical controlled readiness gate |
| `azaad-controlled-auth-parity-preflight.yml` | Controlled identity parity preflight | Read-only Supabase/Appwrite identity UUID reconciliation | Canonical controlled auth preflight |
| `azaad-integration-gate.yml` | Cross-module integration | Cross-domain integration contracts | Canonical integration gate |
| `azaad-marketing-security-gate.yml` | Marketing security boundary | Marketing/public-surface security contracts | Canonical domain gate |
| `azaad-patient-360-gate.yml` | Patient 360 domain | Patient longitudinal/360 contracts | Canonical domain gate |
| `azaad-patient-financial-integration.yml` | Patient-finance integration | Patient financial integration contract | Canonical integration gate |
| `azaad-payments-reporting-gate.yml` | Payments/reporting | Payment and reporting contract | Canonical finance gate |
| `azaad-rcm-gate.yml` | Revenue-cycle boundary | RCM/financial contract | Canonical finance gate |
| `azaad-phase12-security-audit-gate.yml` | Security audit | Phase 12 security audit assertions | Canonical security gate |
| `azaad-security-regression-gate.yml` | Security regression | Security regression contract | Canonical security gate |
| `doctor-identity-gate.yml` | Doctor identity | Doctor identity/credential boundary | Canonical doctor gate |
| `doctor-isolation-contract.yml` | Doctor isolation | Doctor data/route isolation contract | Canonical doctor gate |
| `i18n-stability-contract.yml` | Internationalization stability | i18n contract | Canonical locale gate |
| `locale-stability-contract.yml` | Locale stability | Locale/runtime stability contract | Canonical locale gate |
| `azaad-waiting-list-gate.yml` | Waiting list | Waiting-list contract | Canonical domain gate |
| `azaad-production-smoke-gate.yml` | Production smoke | Lightweight production HTTP/content health | Canonical smoke gate |
| `pgrst303-rest-root-diagnostic.yml` | Legacy PostgREST incident investigation | Explicit historical diagnostic only | Retained diagnostic |

## Proven non-duplication decisions

`azaad-production-certification-v2.yml` was retired because it duplicated `azaad-production-certification-gate.yml`.

`central-scheduling-gate.yml` and `scheduling-actions-gate.yml` are separate because one owns the scheduling domain contract and the other owns action semantics.

`azaad-booking-ui-final-fix.yml` owns presentation behavior and is intentionally not duplicated by another booking UI workflow.

`azaad-ai-gate.yml` and `azaad-clinical-ai-gate.yml` are separate because one owns the general AI operating boundary and the other owns clinician-facing clinical AI safety.

`azaad-clinical-authorization-e2e.yml` is separate from `azaad-browser-e2e.yml`: authorization semantics and browser runtime behavior are different evidence surfaces.

The historical Supabase-to-Neon migration is complete. Its destructive migration workflow is retired. `azaad-controlled-p0-neon-parity.yml` is read-only and must never become a restore path.

Emergency DR workflows are separate from production migration and browser E2E because they own historical recovery evidence rather than production runtime certification.

`pgrst303-rest-root-diagnostic.yml` is retained only for explicit historical incident investigation and branch-protection continuity; it is not a current authentication/runtime gate.

`azaad-final-release-certification.yml` is a manually invoked candidate-SHA-locked go-live decision and is not a duplicate of automatic certification.

## Inventory rule

The table above is exhaustive for the current `.github/workflows` directory. A workflow file without a registry row is an architecture violation. A registry row without a workflow file is also an architecture violation unless explicitly marked `Retired` with a documented reason.

## Retired temporary diagnostics

The following temporary workflows have been retired after their root-cause evidence was established:

- `azaad-browser-e2e-root-fix.yml`
- `azaad-api-module-import-diagnostic.yml`
- `azaad-controlled-neon-public-migration.yml`
- `azaad-neon-database-migration.yml`

They must not be recreated as parallel permanent gates unless a new incident produces a distinct verification responsibility and explicit authorization.

## Retirement rule

A workflow is eligible for deletion only when all of the following are proven:

1. No unique source/contract is protected by it.
2. Its assertions are fully covered by one canonical workflow.
3. Its trigger does not provide a unique required verification path.
4. No release workflow references it as required evidence.
5. No documentation or automation depends on its path.
6. The replacement gate passes on the same exact commit.

A name containing `v2`, `final`, `fix`, `hardening`, or `nextgen` is not evidence that a workflow is obsolete.

## Anti-recursion rule

No workflow may create or modify source files as part of ordinary CI verification. Build transformations belong to the canonical build pipeline; CI workflows verify the resulting source/contract. This prevents workflows from becoming hidden source-code mutators.

## Required future review

Any new workflow must declare:

- owner boundary,
- protected files/contracts,
- trigger reason,
- why an existing workflow cannot own the same responsibility,
- exact retirement path if it is temporary.

Without those five items, the workflow is not architecture-approved.
