from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]

kernel = (root / 'azaad-platform-kernel.js').read_text(encoding='utf-8')
patcher = (root / '.github/patch-admin.py').read_text(encoding='utf-8')
marketing = (root / 'marketing-studio-v4.js').read_text(encoding='utf-8')
lazy = (root / 'qa/lazy-admin-modules.py').read_text(encoding='utf-8')

for needle in ('AZAAD_PLATFORM', 'advisoryOnly', 'humanApprovalRequired', 'forbiddenActions', 'AZAAD_WORKFLOW_POLICY', 'clinic_feature_flags', 'clinic_audit_events', "'/api/admin-appointments?resource=platform'"):
    assert needle in kernel, needle

for needle in ('azaad-platform-kernel.js', 'azaad-operations-control-center.js', 'azaad-operations-role-guard.js', 'clinical-assessment.html', 'invoice-center.html'):
    assert needle in patcher, needle

for needle in ('/api/marketing', 'SUPPORTED_PLATFORMS', 'human approval', 'Free AI Suggest', 'create_post', 'create_campaign', 'add_channel'):
    assert needle in marketing, needle

assert 'marketing-studio-v4.js' in lazy
assert 'marketing-studio-v3.js' in lazy
assert not (root / 'marketing-studio-v3.js').exists()
assert not (root / 'patient-booking-privacy-v2.js').exists()

for text in (kernel, marketing, lazy):
    assert 'supabase' not in text.lower()
    assert 'functions/v1/' not in text.lower()

assert not re.search(r'(?i)(service_role|password\s*=|api[_-]?key\s*=)', kernel)

print('AZAAD platform kernel contract: PASS')
