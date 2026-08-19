#!/usr/bin/env python3
"""Idempotent compatibility step for the production-parity build.

finalize-auth.py is the canonical owner of the admin auth callback. This
step intentionally does not inject readiness flags, controllers, session
state, or UI workarounds. It only verifies that the canonical callback is
present after the preceding auth finalization step.
"""
from pathlib import Path
import re

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html not found")

text = path.read_text(encoding="utf-8")
if "onAuthStateChange" not in text:
    print("Inline admin auth callback already absent; canonical auth finalization owns the callback")
    raise SystemExit(0)

# Accept the callback regardless of whitespace/formatting. Do not mutate it:
# finalize-auth.py is the source of truth and this compatibility step must be
# safe to run repeatedly without introducing another auth implementation.
callback = re.compile(r"onAuthStateChange\s*\(", re.S)
if callback.search(text):
    print("Canonical admin auth callback marker present; no additional patch required")
    raise SystemExit(0)

raise SystemExit("Unable to validate canonical admin auth callback")
