from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
studio = (ROOT / 'marketing-studio-v4.js').read_text(encoding='utf-8').lower()
team = (ROOT / 'public-team-display.js').read_text(encoding='utf-8').lower()
public_data = (ROOT / 'api/_public-clinic-data.js').read_text(encoding='utf-8').lower()
lazy = (ROOT / 'qa/lazy-admin-modules.py').read_text(encoding='utf-8').lower()

for needle in ('facebook', 'instagram', 'linkedin', 'tiktok', 'campaign', 'clinic_marketing_publications'):
    assert needle in studio, needle
assert 'free ai suggest' in studio
assert 'marketing-studio-v3.js' not in studio
assert 'marketing-studio-v4.js' in lazy
assert 'marketing-studio-v3.js' not in lazy
assert 'api/public-clinic-data?scope=team' in team
# Canonical public team storage is now clinic_public_team_profiles, joined to
# clinic_staff for the doctor identity. The old clinic_team marker was retired.
assert 'clinic_public_team_profiles' in public_data
assert 'show_on_patient_portal=true' in public_data
print('marketing hybrid + public privacy gate: PASS')
