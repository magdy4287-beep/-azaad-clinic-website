from pathlib import Path

INDEX = Path('index.html')
GUARD = '<script src="public-performance-guard.js?v=1"></script>'
CACHE = '<script src="public-clinic-data-request-cache.js?v=1"></script>'

def inject_before(text: str, marker: str, snippet: str) -> str:
    if snippet in text:
        return text
    pos = text.find(marker)
    if pos < 0:
        raise SystemExit(f'Missing required marker: {marker}')
    return text[:pos] + snippet + text[pos:]

text = INDEX.read_text(encoding='utf-8')
text = inject_before(text, '<script src="app.js"></script>', CACHE + GUARD)
INDEX.write_text(text, encoding='utf-8')
print('[AZAAD performance] injected bounded public request/DOM guard', flush=True)
