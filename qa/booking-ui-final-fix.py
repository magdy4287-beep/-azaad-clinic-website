from pathlib import Path

index = Path('index.html').read_text(encoding='utf-8')
fix = Path('booking-ui-final-fix.js').read_text(encoding='utf-8')

assert 'booking-ui-final-fix.js?v=2' in index
for token in ['formatTime12', 'hideConfirmationButton', 'styleWhatsAppAction', 'moveStatusBelowWhatsApp', 'bookingSucceeded']:
    assert token in fix, token

# Canonical 24-hour values are converted only for visible text; inputs/API values are untouched.
assert '17:30' not in fix
assert 'type="time"' not in fix

# The final patch must not contain privileged Supabase credentials.
for token in ('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY', 'service_role_key='):
    assert token not in fix, token

print('booking UI final fix contract: PASS')
