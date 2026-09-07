#!/usr/bin/env python3
"""Fail closed on Web Request/Response contracts inside active Vercel api/*.js routes.

Historical Supabase Edge Functions intentionally use the Web runtime and are out of scope.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / 'api'
FAILURES = []

# Scan for constructs that are incompatible with the active Vercel Node handler
# contract. Helper functions may legitimately accept request-like objects; only the
# exported Vercel handler signature is a handler contract concern.
PATTERNS = (
    (r'\bnew\s+Response\s*\(', 'Web Response constructor'),
    (r'\bnew\s+Request\s*\(', 'Web Request constructor'),
    (r'export\s+default\s+async\s+function\s+\w*\s*\(\s*request\s*\)', 'Vercel handler missing res parameter'),
)

HANDLER_PATTERN = re.compile(
    r'export\s+default\s+async\s+function\s+\w*\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)'
)

if not API.exists():
    FAILURES.append('api directory is missing')
else:
    for path in sorted(API.glob('*.js')):
        text = path.read_text(encoding='utf-8', errors='replace')
        for pattern, label in PATTERNS:
            if re.search(pattern, text):
                FAILURES.append(f'{path.relative_to(ROOT).as_posix()}: {label}')
        handler_matches = list(HANDLER_PATTERN.finditer(text))
        if not handler_matches:
            FAILURES.append(f'{path.relative_to(ROOT).as_posix()}: missing Vercel (req, res) handler signature')
        elif any(match.group(2).strip() == 'request' for match in handler_matches):
            FAILURES.append(f'{path.relative_to(ROOT).as_posix()}: Vercel handler missing res parameter')

print('AZAAD active Vercel API contract gate')
print(f'Active api/*.js routes scanned: {len(list(API.glob("*.js"))) if API.exists() else 0}')
if FAILURES:
    print('FAILURES:')
    for item in FAILURES:
        print(f'  - {item}')
    print(f'ACTIVE API CONTRACT FAILED: {len(FAILURES)} blocking finding(s)')
    sys.exit(1)
print('ACTIVE API CONTRACT PASSED')
