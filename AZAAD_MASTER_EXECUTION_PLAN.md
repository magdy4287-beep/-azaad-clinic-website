# AZAAD CLINIC — MASTER ENGINEERING & GO-LIVE EXECUTION PLAN

## 0. Final objective

Operate AZAAD as a real clinic platform that is secure, auditable, recoverable, bilingual, responsive, production-verifiable, and free-first.

The production architecture is fixed:

- **Vercel** — canonical runtime and deployment.
- **Appwrite** — canonical identity, authentication, sessions, and protected browser boundary.
- **Neon** — canonical production database.
- **GitHub Actions** — source/build/security/certification governance.

No retired backend provider or compatibility runtime may exist in the active repository.

## 1. Non-negotiable engineering rules

1. Source is canonical. Production must not depend on transforming legacy source into a different architecture at build time.
2. One runtime owner per production domain.
3. One data owner per production domain.
4. One backend boundary per protected API/domain.
5. One permission boundary per protected operation.
6. One E2E contract per production workflow.
7. Fail closed on architecture drift, secret exposure, authorization bypass, duplicate ownership, or source residue.
8. Never weaken a gate merely to obtain green CI.
9. Never introduce a paid dependency as a hard requirement for core clinic operation.
10. Preserve historical patient, clinical, financial, and audit records when relationships exist; archive instead of destructive deletion.
11. Arabic and English are first-class UI modes.
12. Production READY requires fresh deployment and verification evidence, not only a Git commit.

## 2. Current root-cleanup program

### P0 — Repository architecture

- Remove retired-provider directories, packages, URLs, environment variables, workflows, fixtures, migrations, documentation, and executable references.
- Remove build transforms whose sole purpose is to erase retired architecture from source.
- Keep one fail-closed zero-residue gate in the production build chain.
- Keep architecture and ownership gates aligned with Vercel/Appwrite/Neon.

### P1 — Admin runtime

- Canonical Appwrite login/session lifecycle.
- HttpOnly session boundary where applicable.
- Canonical admin API boundary on Vercel.
- OWNER/ADMIN/MANAGER staff-management authorization.
- SECRETARY/RECEPTION/CASHIER/DOCTOR/MARKETING must not call protected staff-management endpoints unless explicitly authorized by the role matrix.
- Refresh/session persistence and logout must be tested independently.

### P2 — Clinical runtime

- Appwrite browser identity and role binding.
- Neon clinical data ownership.
- Doctor-to-staff binding and patient authorization.
- Clinical assessment, visit, transfer, and longitudinal data flows.
- No client-side service-role credentials.

### P3 — Scheduling

- One canonical scheduling boundary.
- Explicit doctor availability and working-hours rules.
- Conflict prevention and deterministic slot selection.
- Waiting-list and cancellation/rebooking consistency.
- Secretary workflow must use the canonical scheduling API rather than a second controller.

### P4 — Patient and public experience

- Public booking and clinic data use canonical Vercel APIs.
- Patient-facing privacy boundaries remain fail closed.
- Patient 360, demographics, financial summaries, and history use canonical Neon-backed APIs.
- Arabic/English and RTL/LTR behavior remain stable.

### P5 — Operations, HR, RCM, marketing

- Preserve existing operational domain owners.
- Keep permissions explicit by role.
- Preserve auditability for financial, HR, and clinical changes.
- AI features remain optional and must never become a hard dependency for core workflows.

## 3. Verification ladder

After every root repair:

1. Static source/residue scan.
2. Architecture and ownership gates.
3. JavaScript/Python syntax validation where applicable.
4. Targeted domain contract.
5. Build verification.
6. Exact deployed-SHA verification.
7. Browser E2E for affected workflows.
8. Security/authorization regression.
9. Production smoke evidence.
10. Release/UAT/DR evidence when the change affects those boundaries.

Evidence must be tied to the exact commit and deployed artifact. If a workflow has no recorded run, the result is **not proven**.

## 4. Root-scan method

Use this sequence without looping over already-proven work:

**root scan → ownership map → dependency graph → root cause → minimal safe repair → targeted verification → full residue re-scan → documentation → next boundary**

Do not delete similarly named files merely because they look old. Delete a component only after proving it is obsolete, unreachable, superseded, or forbidden by the canonical architecture.

## 5. Release gates

A release candidate is eligible only when:

- zero retired-provider residue is proven;
- Vercel is the deployed runtime;
- Appwrite is the identity/session owner;
- Neon is the production data owner;
- role/permission matrix is proven;
- browser session persistence and logout are proven;
- clinical and scheduling boundaries are proven;
- no production secret is browser-visible;
- exact SHA matches the tested artifact;
- required production/browser workflows have fresh evidence;
- DR/UAT requirements are satisfied for the release scope.

## 6. Self-healing policy

Self-healing means detection, fail-closed behavior, bounded repair, and normal review/release governance. It never means silent production mutation, automatic permission expansion, disabling security gates, or replacing canonical owners without evidence.

## 7. Continuation rule

Always continue from the newest verified `main` SHA. Carry forward successful evidence. Re-open a completed gate only when a new change invalidates its evidence or a release gate explicitly requires re-proving it.
