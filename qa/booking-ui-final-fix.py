from pathlib import Path

index = Path('index.html').read_text(encoding='utf-8')
fix = Path('booking-ui-final-fix.js').read_text(encoding='utf-8')
app = Path('app.js').read_text(encoding='utf-8')

# Public booking has one explicit post-success recovery owner.
assert 'booking-ui-final-fix.js?v=' in index
for token in [
    'captureBookingContext',
    'const bookingSucceeded = () =>',
    'function ensureWhatsAppStep()',
    'bookingCode()',
    'data-azaad-whatsapp-cta',
]:
    assert token in fix, token

# The recovery must be independent of the CTA already existing; otherwise it
# cannot repair the exact production symptom (success message with no button).
success_detector = fix[fix.index('const bookingSucceeded = () =>'):fix.index('function captureBookingContext()')]
assert 'findWhatsAppAction()' not in success_detector
assert 'ensureWhatsAppStep()' in fix
assert 'Boolean(bookingCode())' in fix, 'booking code must detect success even when language bridge transliterates the status copy'
assert 'state.context' in fix
assert "form.addEventListener('submit', captureBookingContext, true)" in fix

# The fallback must use the canonical same-origin public API, never the retired
# Supabase endpoint/provider.
assert '/api/public-clinic-data?api=data' in fix
assert 'supabase.co' not in fix.lower()

# The CTA is user-initiated, bilingual, and opens a prefilled WhatsApp message.
for phrase in [
    'يجب الضغط هنا 👇 لإرسال الموعد إلى العيادة',
    'إرسال الموعد إلى العيادة عبر WhatsApp',
    'Please click here 👇 to send the appointment to the clinic',
    'Send the appointment to the clinic via WhatsApp',
    'https://wa.me/',
    'target="_blank"',
    'noopener noreferrer',
]:
    assert phrase in fix, phrase

# Preserve the canonical app booking flow and booking success message.
assert 'function showWhatsAppStep(' in app
assert "showMessage(" in app
assert 'form.reset()' in app
assert 't(\'sendToWhatsApp\')' in app

# Keep the existing UI hardening/time formatting contract.
for token in ['formatTime12', 'styleWhatsAppAction', 'convertTimeInTextNodes']:
    assert token in fix, token
assert 'type="time"' not in fix

# No privileged credentials or automatic message submission.
for token in ('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY', 'service_role_key='):
    assert token not in fix, token
assert '.click()' not in fix

print('booking WhatsApp recovery contract: PASS')
