"""Deterministically remove duplicate external admin script tags.

Production admin has one authoritative load of each external script. Inline scripts are
left untouched because they can be intentionally scoped. This guard is intentionally
idempotent so future build/injection steps cannot silently create duplicate execution.
"""
from pathlib import Path
import re
from urllib.parse import urlsplit

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html missing")

text = path.read_text(encoding="utf-8")
seen = set()
duplicates = []
pattern = re.compile(r'<script\b([^>]*?)\bsrc=["\']([^"\']+)["\']([^>]*)>\s*</script>', re.I)

def normalize(src: str) -> str:
    value = src.strip()
    if value.startswith("/"):
        value = value[1:]
    parsed = urlsplit(value)
    path_part = parsed.path.lower()
    # Same local script with different cache-busting query strings is still one script.
    if path_part.startswith("/"):
        path_part = path_part[1:]
    return path_part

def replace(match: re.Match[str]) -> str:
    src = match.group(2)
    key = normalize(src)
    if key in seen:
        duplicates.append(src)
        return ""
    seen.add(key)
    return match.group(0)

text = pattern.sub(replace, text)
path.write_text(text, encoding="utf-8")

if duplicates:
    print(f"[AZAAD admin dedupe] removed {len(duplicates)} duplicate external script tags")
    for src in duplicates:
        print(f"[AZAAD admin dedupe] {src}")
else:
    print("[AZAAD admin dedupe] no duplicate external script tags")
