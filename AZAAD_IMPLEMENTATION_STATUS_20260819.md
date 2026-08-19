# AZAAD — Implementation Status — 2026-08-19

## Target

Secure & Safety-Gated Production → Controlled Feature Evolution → Patient/Clinical/Financial E2E → Human-Approved AI → Security/UAT Certification → Go-Live → Continuous Operations.

Bilingual Arabic/English remains presentation support for Patient and Administration dashboards.

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

### Certification
- Browser E2E now uses assertion-driven navigation readiness instead of waiting for application-level `DOMContentLoaded`.
- Operating control-plane contract is part of the Browser E2E suite.
- PR verification injects the same production patch set before testing.

## Evidence

- Supabase migrations applied successfully:
  - `azaad_operating_platform_control_plane_v1`
  - `azaad_scoped_permission_engine_v1`
- RLS is enabled on the three new control-plane tables.
- Refund workflow definition is active and records both required human approval roles.
- PR #58 is open, draft, and currently mergeable.

## Not yet certified

The following remain **NOT PROVEN** until fresh CI/deployment evidence exists:

- Full authenticated Patient 360 browser journey.
- Full clinical browser journey.
- Full financial/refund E2E journey.
- Full Staff account lifecycle browser journey.
- Full Marketing publish handoff journey.
- Production deployment of the current PR head.
- Final Go-Live certification.

No production READY claim is made until those gates pass on the exact production commit.
