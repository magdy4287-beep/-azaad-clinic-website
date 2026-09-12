from pathlib import Path

studio=Path('marketing-studio-v4.js').read_text(encoding='utf-8').lower()
privacy=Path('patient-booking-privacy-v2.js').read_text(encoding='utf-8').lower()
team=Path('public-team-display.js').read_text(encoding='utf-8').lower()
lazy=Path('qa/lazy-admin-modules.py').read_text(encoding='utf-8').lower()

for needle in ('facebook','instagram','linkedin','tiktok','campaign','addchannel','clinic_marketing_publications'):
    assert needle in studio, needle
assert 'free ai suggest' in studio
assert 'marketing-studio-v3.js' not in studio
assert 'marketing-studio-v4.js' in lazy
assert 'marketing-studio-v3.js' in lazy
assert 'azaad-public-patient-lookup' in privacy
assert 'api/public-clinic-data?scope=team' in team
print('marketing hybrid + public privacy gate: PASS')
