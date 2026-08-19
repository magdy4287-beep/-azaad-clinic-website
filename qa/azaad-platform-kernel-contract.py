from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]

kernel = (root / 'azaad-platform-kernel.js').read_text(encoding='utf-8')
migration = (root / 'supabase/migrations/20260819012000_azaad_platform_kernel_v1.sql').read_text(encoding='utf-8')
patcher = (root / '.github/patch-admin.py').read_text(encoding='utf-8')

# Platform kernel is real code, not a documentation-only marker.
for needle in ('AZAAD_PLATFORM', 'advisoryOnly', 'humanApprovalRequired', 'forbiddenActions', 'AZAAD_WORKFLOW_POLICY', 'clinic_feature_flags', 'clinic_audit_events'):
    assert needle in kernel, needle

# Core safety invariants are explicit and cannot be delegated to AI.
for needle in ('refund', 'doctor_approved', 'management_owner_approved', 'ai_can_approve', 'paid_marketing_publication'):
    assert needle in migration, needle

# Feature flags are database-backed and RLS is present.
for needle in ('clinic_feature_flags', 'enable row level security', "clinic_has_permission('admin.settings')", 'platform.ai_copilot', 'platform.marketing_hybrid'):
    assert needle in migration, needle

# AI usage is traceable and marked advisory by default.
for needle in ('clinic_ai_usage_events', 'advisory_only boolean not null default true', 'feature_key text not null', 'provider text not null'):
    assert needle in migration, needle

# The kernel must be loaded by the existing deterministic patch pipeline.
assert 'azaad-platform-kernel.js' in patcher
assert 'inject_script("admin.html","azaad-platform-kernel.js")' in patcher
assert 'inject_script("clinical-assessment.html","azaad-platform-kernel.js")' in patcher
assert 'inject_script("invoice-center.html","azaad-platform-kernel.js")' in patcher

# Existing marketing/privacy/team surfaces remain part of the same hardening contract.
studio = (root / 'marketing-studio-v3.js').read_text(encoding='utf-8')
privacy = (root / 'patient-booking-privacy-v2.js').read_text(encoding='utf-8')
team = (root / 'public-team-admin.js').read_text(encoding='utf-8')
for needle in ('facebook', 'instagram', 'linkedin', 'tiktok', 'campaign', 'addchannel', 'aigenerate', 'clinic_marketing_publications'):
    assert needle in studio.lower(), needle
assert 'azaad-public-patient-lookup' in privacy
assert 'clinic_public_team_profiles' in team

# No password/secret material is allowed in the platform kernel.
assert not re.search(r'(?i)(service_role|password\s*=|api[_-]?key\s*=)', kernel)

print('AZAAD platform kernel contract: PASS')
