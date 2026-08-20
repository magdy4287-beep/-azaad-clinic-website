# AZAAD — Implementation Status — 2026-08-19

## Target

Secure & Safety-Gated Production → Controlled Feature Evolution → Patient/Clinical/Financial E2E → Human-Approved AI → Security/UAT Certification → Go-Live → Continuous Operations.

Bilingual Arabic/English remains presentation support for Patient and Administration dashboards only.

## Implemented in this increment

### Operating Control Plane
- Unified Administration Command Center surface.
- Real booking, active-staff, security-event, feature-flag and daily-finance data sources.
- Human-review AI recommendations stored in `clinic_ai_recommendations`.
- AI has no approval transition for refunds or clinical workflows.

### Workflow Engine
- Durable workflow instances in `clinic_workflow_instances`.
- Versioned workflow definitions for appointment, clinical follow-up and refund.
- Refund policy is explicitly `REQUESTED → DOCTOR_APPROVED → MANAGEMENT_APPROVED → PROCESSING → COMPLETED`.
- Refund approval policy explicitly declares `ai_can_approve=false`.

### Authorization
- Staff now has department/job-title/profile-enable fields.
- `clinic_permission_scopes` adds Role + Department + Permission + Resource + Scope semantics.
- `clinic_has_scoped_permission` is available through a private security-definer implementation with authenticated wrapper.
- Existing role-permission authorization remains intact as compatibility fallback.

### Feature Flags
- AI Copilot
- Patient 360
- Workflow Engine
- Universal Audit
- Executive Command Center
- Marketing Studio
- Continuous Certification

## Certification architecture correction

The Production Browser E2E gate is now a **non-mutating certification gate**. It tests the exact checked-out commit and never runs `.github/patch-admin.py` to alter source before certification.

Public bilingual UI is certified by the dedicated I18N, Locale Stability and Patient Booking gates instead of duplicating those assertions in the production shell gate.

The previous Browser E2E failure was therefore treated as a test-harness/contract-boundary problem, not hidden by increasing timeouts or weakening assertions:
- the failing browser run had 4/9 tests passing;
- the failures were concentrated in the duplicated public UI checks and runtime credential-field assumptions;
- the revised shell gate resets browser storage before authentication and validates the canonical auth source contract separately from runtime DOM mutations.

## Fresh evidence currently available

- PR #58 remains open/draft and is currently mergeable.
- The latest PR head is `c72b95ffc9691de57f4e530bcc60b9c22a9b73c3`.
- Supabase migrations applied successfully:
  - `azaad_operating_platform_control_plane_v1`
  - `azaad_scoped_permission_engine_v1`
- RLS is enabled on the three new control-plane tables.
- Refund workflow definition is active and records both required human approval roles.
- The latest Vercel branch deployment before this final CI-gate commit is READY; no Vercel runtime error clusters were found in the last 24 hours.

## Not yet certified

The following remain **NOT PROVEN** until fresh CI/deployment evidence exists on the exact current commit:

- Production Browser E2E after the non-mutating gate correction.
- Full authenticated Patient 360 browser journey.
- Full clinical browser journey.
- Full financial/refund E2E journey.
- Full Staff account lifecycle browser journey.
- Full Marketing publish handoff journey.
- Production deployment of the current PR head.
- Final Go-Live certification.

No production READY claim is made until those gates pass on the exact production commit.
