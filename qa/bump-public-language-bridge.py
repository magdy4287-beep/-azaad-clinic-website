from pathlib import Path

path = Path('index.html')
if not path.exists():
    raise SystemExit('index.html missing')

text = path.read_text(encoding='utf-8')
old = 'public-booking-language-bridge.js?v=7'
new = 'public-booking-language-bridge.js?v=8'

if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('public booking language bridge asset reference not found')

path.write_text(text, encoding='utf-8')
print('[AZAAD] public booking language bridge cache version = v8')