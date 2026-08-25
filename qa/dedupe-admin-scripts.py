"""Fail-closed admin script ownership gate.

This is a verifier, not a cleanup transform. Duplicate external admin scripts are an
architectural defect and must be fixed by the owning build/runtime step rather than
silently removed here.
"""
from pathlib import Path
import re
import sys
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
    if path_part.startswith("/"):
        path_part = path_part[1:]
    return path_part


def inspect(match: re.Match[str]) -> str:
    src = match.group(2)
    key = normalize(src)
    if key in seen:
        duplicates.append(src)
    else:
        seen.add(key)
    return match.group(0)

pattern.sub(inspect, text)

if duplicates:
    print(f"[AZAAD admin dedupe gate] FAIL: {len(duplicates)} duplicate external script tags")
    for src in duplicates:
        print(f"[AZAAD admin dedupe gate] duplicate: {src}")
    sys.exit(1)

print("[AZAAD admin dedupe gate] PASS: no duplicate external script tags")
