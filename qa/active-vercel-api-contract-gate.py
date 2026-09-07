#!/usr/bin/env python3
"""Fail closed on incompatible Request/Response contracts in active Vercel api/*.js routes.

The canonical runtime is Vercel Node. Explicit Vercel Edge routes are valid Web
Request/Response handlers and are checked separately by the edge contract rules.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / 'api'
FAILURES = []

NODE_HANDLER_PATTERN = re.compile(
    r'export\s+default\s+async\s+function\s+\w*\s*\(\s*([^,()]+)\s*,\s*([^,()]+)\s*\)'
)
EDGE_HANDLER_PATTERN = re.compile(
    r'export\s+default\s+async\s+function\s+\w*\s*\(\s*request\s*\)'
)
EDGE_CONFIG_PATTERN = re.compile(r"runtime\s*:\s*['\"]edge['\"]")

if not API.exists():
    FAILURES.append('api directory is missing')
else:
    for path in sorted(API.glob('*.js')):
        text = path.read_text(encoding='utf-8', errors='replace')
        relative = path.relative_to(ROOT).as_posix()
        is_edge = bool(EDGE_CONFIG_PATTERN.search(text))

        # Node handlers must use the Vercel (req, res) contract. Helper functions
        # may accept request-like objects without being mistaken for handlers.
        if is_edge:
            if not EDGE_HANDLER_PATTERN.search(text):
                FAILURES.append(f'{relative}: Edge route missing Web Request handler signature')
            if re.search(r'\bnew\s+Request\s*\(', text):
                FAILURES.append(f'{relative}: unexpected nested Request constructor')
        else:
            if re.search(r'\bnew\s+Response\s*\(', text):
                FAILURES.append(f'{relative}: Web Response constructor in Node route')
            if re.search(r'\bnew\s+Request\s*\(', text):
                FAILURES.append(f'{relative}: Web Request constructor in Node route')
            if EDGE_HANDLER_PATTERN.search(text):
                FAILURES.append(f'{relative}: Vercel handler missing res parameter')
            handler_matches = list(NODE_HANDLER_PATTERN.finditer(text))
            if not handler_matches:
                FAILURES.append(f'{relative}: missing Vercel (req, res) handler signature')

print('AZAAD active Vercel API contract gate')
print(f'Active api/*.js routes scanned: {len(list(API.glob("*.js"))) if API.exists() else 0}')
if FAILURES:
    print('FAILURES:')
    for item in FAILURES:
        print(f'  - {item}')
    print(f'ACTIVE API CONTRACT FAILED: {len(FAILURES)} blocking finding(s)')
    sys.exit(1)
print('ACTIVE API CONTRACT PASSED')
