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

# These patterns are Web-runtime constructs that are incompatible with the Vercel Node
# handler contract used by the active API surface.
PATTERNS = (
    (r'\bnew\s+Response\s*\(', 'Web Response constructor'),
    (r'\bnew\s+Request\s*\(', 'Web Request constructor'),
    (r'function\s+\w*\s*\(\s*request\s*\)', 'request-only handler signature'),
    (r'export\s+default\s+async\s+function\s+\w*\s*\(\s*request\s*\)', 'Vercel handler missing res parameter'),
    (r'\brequest\.headers\.get\s*\(', 'Web Headers API on request'),
    (r'\brequest\.json\s*\(\s*\)', 'Web Request body parser'),
)

if not API.exists():
    FAILURES.append('api directory is missing')
else:
    for path in sorted(API.glob('*.js')):
        text = path.read_text(encoding='utf-8', errors='replace')
        for pattern, label in PATTERNS:
            if re.search(pattern, text):
                FAILURES.append(f'{path.relative_to(ROOT).as_posix()}: {label}')

print('AZAAD active Vercel API contract gate')
print(f'Active api/*.js routes scanned: {len(list(API.glob("*.js"))) if API.exists() else 0}')
if FAILURES:
    print('FAILURES:')
    for item in FAILURES:
        print(f'  - {item}')
    print(f'ACTIVE API CONTRACT FAILED: {len(FAILURES)} blocking finding(s)')
    sys.exit(1)
print('ACTIVE API CONTRACT PASSED')
