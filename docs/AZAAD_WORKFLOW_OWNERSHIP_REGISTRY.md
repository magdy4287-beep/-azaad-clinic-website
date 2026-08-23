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

## Proven non-duplication decisions

### Production certification

`azaad-production-certification-v2.yml` was retired because its responsibility and assertions duplicated `azaad-production-certification-gate.yml`. The canonical workflow remains the owner for the baseline certification contract.

### Scheduling

`central-scheduling-gate.yml` and `scheduling-actions-gate.yml` are intentionally separate. The first owns the central scheduling domain model/contract; the second owns action semantics. They must not be merged merely because both contain the word scheduling.

### Booking

`azaad-patient-booking-gate.yml` and `azaad-booking-ui-final-fix.yml` are intentionally separate. The first owns patient identity/booking safety; the second owns presentation-level booking behavior. They protect different invariants.

### AI

`azaad-ai-gate.yml` and `azaad-clinical-ai-gate.yml` are intentionally separate. The first owns the general AI operating boundary; the second owns clinician-facing clinical AI behavior and safety evidence.

### Final release

`azaad-final-release-certification.yml` is not a duplicate of the automatic production certification gate. It is a manually invoked, candidate-SHA-locked go-live decision that consumes fresh evidence from multiple required workflows.

## Retirement rule

A workflow is eligible for deletion only when all of the following are proven:

1. No unique source/contract is protected by it.
2. Its assertions are fully covered by one canonical workflow.
3. Its trigger does not provide a unique required verification path.
4. No release workflow references it as required evidence.
5. No documentation or automation depends on its path.
6. The replacement gate passes on the same exact commit.

A name containing `v2`, `final`, `fix`, `hardening`, or `nextgen` is **not** evidence that a workflow is obsolete.

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
