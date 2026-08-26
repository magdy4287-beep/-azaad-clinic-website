#!/usr/bin/env python3
"""Wire the Admin runtime to the canonical Cairo date context."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ADMIN = ROOT / "admin.html"
ADMIN_JS = ROOT / "admin.js"
CORE_SRC = '<script src="/azaad-core-context.js?v=1.0.0"></script>'
CORE_RE = re.compile(
    r'<script\\b[^>]*\\bsrc\\s*=\\s*["\\'][^"\\']*/azaad-core-context\\.js(?:\\?[^"\\']*)?["\\'][^>]*>\\s*</script\\s*>',
    re.I,
)

if not ADMIN.is_file():
    raise SystemExit("Missing admin.html")
if not ADMIN_JS.is_file():
    raise SystemExit("Missing admin.js")

html = ADMIN.read_text(encoding="utf-8")
html = CORE_RE.sub("", html)
if "</head>" not in html:
    raise SystemExit("admin.html has no </head>")
html = html.replace("</head>", CORE_SRC + "\\n</head>", 1)
ADMIN.write_text(html, encoding="utf-8")

js = ADMIN_JS.read_text(encoding="utf-8")
pattern = re.compile(
    r"function todayISO\(\)\\s*\\{.*?\\n\\}",
    re.S,
)
replacement = '''function todayISO() {
  const canonical = window.AZAAD_CORE_CONTEXT?.todayISO;

  if (typeof canonical !== "function") {
    throw new Error("AZAAD_CORE_CONTEXT.todayISO is required for Admin business dates.");
  }

  return canonical();
}'''
js, count = pattern.subn(replacement, js, count=1)
if count != 1:
    raise SystemExit(f"Expected exactly one Admin todayISO function, found {count}")
ADMIN_JS.write_text(js, encoding="utf-8")
print("[AZAAD] Admin business-date boundary wired to canonical Africa/Cairo context")
