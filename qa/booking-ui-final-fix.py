from pathlib import Path

index = Path('index.html').read_text(encoding='utf-8')
fix = Path('booking-ui-final-fix.js').read_text(encoding='utf-8')
app = Path('app.js').read_text(encoding='utf-8')

# The public page owns the current booking UI patch; cache versions may advance
# without changing the runtime owner. Validate the canonical script identity.
assert 'app.js' in index
assert 'booking-ui-final-fix.js?v=' in index
for token in ['formatTime12', 'hideConfirmationButton', 'styleWhatsAppAction', 'moveStatusBelowWhatsApp', 'bookingSucceeded']:
    assert token in fix, token

# Successful booking must render a visible WhatsApp CTA inside the booking form,
# next to its confirmation state, so it cannot be lost below/outside the form.
assert 'function showWhatsAppStep(' in app
assert 'form.appendChild(container)' in app
show_step = app[app.index('function showWhatsAppStep('):app.index('function removeOldWhatsAppStep(')]
assert show_step.index('if (!container)') < show_step.index('if (form && container.parentNode !== form)'), 'existing confirmation container must be re-parented unconditionally'
assert show_step.index('if (form && container.parentNode !== form)') < show_step.index("container.style.setProperty('display', 'block', 'important')"), 're-parent before making confirmation visible'
assert "container.style.setProperty('display', 'block', 'important')" in app
assert "container.style.setProperty('visibility', 'visible', 'important')" in app
assert "t('sendToWhatsApp')" in app
assert "t('whatsappDescription')" in app

# Canonical 24-hour values are converted only for visible text; inputs/API values are untouched.
assert '17:30' not in fix
assert 'type="time"' not in fix

# The final patch must not contain privileged Supabase credentials.
for token in ('SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY', 'service_role_key='):
    assert token not in fix, token

print('booking UI final fix contract: PASS')
