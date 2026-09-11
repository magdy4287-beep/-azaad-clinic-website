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
| `azaad-auth-bridge-e2e.yml` | Auth bridge behavior | Authentication/session bridge | Canonical auth E2E |
| `azaad-comprehensive-system-contract.yml` | Cross-system contracts | System-wide structural contracts | Canonical system gate |
| `azaad-appointment-gate.yml` | Appointment contract | Appointment contract only | Canonical appointment gate |
| `central-scheduling-gate.yml` | Central scheduling domain | Central scheduling contract | Canonical scheduling-domain gate |
| `scheduling-actions-gate.yml` | Scheduling actions | Scheduling action contract | Canonical scheduling-actions gate |
| `azaad-patient-booking-gate.yml` | Patient booking architecture | Patient lookup / booking contract | Canonical patient-booking gate |
| `azaad-booking-ui-final-fix.yml` | Booking presentation behavior | Booking UI formatting/action contract | Canonical booking-UI gate |
| `azaad-clinical-ai-gate.yml` | Clinician AI safety/UX | Clinical AI cockpit, longitudinal evidence and safety boundary | Canonical clinical-AI gate |
| `azaad-ai-gate.yml` | AI operating system | AI operating-system contract | Canonical AI platform gate |
| `azaad-operations-health.yml` | Operational health | Runtime/operations health checks | Canonical operations gate |
| `azaad-clinical-authorization-e2e.yml` | Clinical authorization boundary | Authenticated multi-role authorization, controlled identities, fixture boundary and exact-SHA E2E | Canonical clinical authorization E2E |
| `azaad-neon-database-migration.yml` | Controlled Neon database migration | One-time Supabase-to-Neon public-schema restore, critical schema verification, exact table/row-count parity; storage and identity are explicitly out of scope | Canonical migration gate |
| `azaad-emergency-dr-restore.yml` | Emergency disaster-recovery transport and restore | Encrypted portable Supabase public-schema snapshot, integrity verification, Neon DR restore, and reconciliation; identity/auth portability is explicitly out of scope | Canonical emergency DR gate |
| `azaad-controlled-p0-neon-parity.yml` | Neon runtime integrity | Read-only Neon target, schema, reachability, and critical-table verification after migration | Canonical read-only integrity gate |
| `azaad-controlled-runtime-provider-readiness.yml` | Controlled provider readiness | Read-only Appwrite identity/storage inventory plus Neon reachability; no production mutation | Canonical controlled readiness gate |
| `azaad-controlled-auth-parity-preflight.yml` | Controlled identity parity preflight | Read-only Supabase/Appwrite identity UUID reconciliation; no credentials or production mutation | Canonical controlled auth preflight |
| `pgrst303-rest-root-diagnostic.yml` | Legacy PostgREST incident investigation | PR retirement contract; optional historical probe on explicit manual dispatch | Retained for branch-protection continuity; not a certification runtime gate |

## Proven non-duplication decisions

### Production certification

`azaad-production-certification-v2.yml` was retired because its responsibility and assertions duplicated `azaad-production-certification-gate.yml`. The canonical workflow remains the owner for the baseline certification contract.

### Scheduling

`central-scheduling-gate.yml` and `scheduling-actions-gate.yml` are intentionally separate. The first owns the central scheduling domain model/contract; the second owns action semantics.

### Booking

`azaad-patient-booking-gate.yml` and `azaad-booking-ui-final-fix.yml` are intentionally separate. The first owns patient identity/booking safety; the second owns presentation-level booking behavior.

### AI

`azaad-ai-gate.yml` and `azaad-clinical-ai-gate.yml` are intentionally separate. The first owns the general AI operating boundary; the second owns clinician-facing clinical AI behavior and safety evidence.

### Clinical authorization

`azaad-clinical-authorization-e2e.yml` is intentionally separate from `azaad-browser-e2e.yml`. Browser E2E owns production UI/runtime behavior; clinical authorization E2E owns authenticated multi-role authorization semantics and controlled clinical fixture creation. It must not be duplicated by a second `workflow_run` trigger.

### Neon migration and integrity

`azaad-neon-database-migration.yml` is the single canonical database migration owner for the current controlled architecture branch. It is the only workflow allowed to execute the destructive Supabase-to-Neon public-schema restore during this migration window. `azaad-controlled-p0-neon-parity.yml` is strictly read-only and verifies the resulting Neon target; it must never become a second restore path.

The former `azaad-controlled-neon-public-migration.yml` was retired because it duplicated the migration owner and could create a second destructive path. It must not be recreated unless a future migration has a distinct, documented responsibility.

### Emergency DR

`azaad-emergency-dr-restore.yml` is intentionally separate from production migration and browser E2E. It owns only emergency data-plane transport/restore from the retained historical Supabase public schema to a DR-capable Neon target. It does not certify identity equivalence, application authorization, RLS/RPC behavioral equivalence, or production cutover.

### Controlled provider readiness

`azaad-controlled-runtime-provider-readiness.yml` is read-only and separate from Emergency DR and Neon migration. It verifies the selected free provider surfaces before production wiring and performs no data migration or production mutation.

### Controlled auth parity preflight

`azaad-controlled-auth-parity-preflight.yml` is read-only. It reconciles identity UUIDs between retained Supabase Auth and Appwrite before credential import/cutover. It never reads or prints password hashes, sessions, refresh tokens, or plaintext credentials and performs no user mutation.

### Legacy PGRST303 diagnostic

`pgrst303-rest-root-diagnostic.yml` is retained only for branch-protection continuity and explicit historical incident investigation. It is not a current authentication/runtime gate because Admin identity is Appwrite-backed.

### Final release

`azaad-final-release-certification.yml` is not a duplicate of the automatic production certification gate. It is a manually invoked, candidate-SHA-locked go-live decision consuming fresh evidence from required workflows.

## Retired temporary diagnostics

The following temporary workflows have been retired after their root-cause evidence was established on the canonical artifact:

- `azaad-browser-e2e-root-fix.yml`
- `azaad-api-module-import-diagnostic.yml`
- `azaad-controlled-neon-public-migration.yml`

Their responsibilities are covered by the canonical Browser E2E, production certification, runtime-boundary gates, and the canonical Neon migration workflow. They must not be recreated as parallel permanent gates unless a new incident produces a distinct verification responsibility.

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
