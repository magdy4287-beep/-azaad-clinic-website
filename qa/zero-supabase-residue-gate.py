"""Fail-closed repository gate for the zero-legacy-provider architecture."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN_MARKERS = (
    "supabase" + ".co",
    "@supabase/" + "supabase-js",
    "@supabase/" + "functions-js",
    "SUPABASE_" + "URL",
    "SUPABASE_" + "ANON_KEY",
    "SUPABASE_" + "PUBLISHABLE_KEY",
    "SUPABASE_" + "SERVICE_ROLE_KEY",
    "createClient" + "(",
    "supabase" + ".auth.",
    "functions" + "/v1/",
)
SKIP_NAMES = {".git", ".venv", "node_modules", "__pycache__"}
violations = []

for path in ROOT.rglob("*"):
    if not path.is_file() or any(part in SKIP_NAMES for part in path.parts):
        continue
    relative = path.relative_to(ROOT)
    if any(part.lower() == "supabase" for part in relative.parts):
        violations.append(f"path: {relative}")
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    for marker in FORBIDDEN_MARKERS:
        if marker.lower() in text.lower():
            violations.append(f"content: {relative} -> legacy provider marker")

if violations:
    print("ZERO-LEGACY-PROVIDER RESIDUE GATE: FAIL")
    for item in violations[:200]:
        print(item)
    raise SystemExit(f"Legacy provider residue detected: {len(violations)} violation(s)")

print("ZERO-LEGACY-PROVIDER RESIDUE GATE: PASS")
