"""Fail-closed repository gate for the zero-retired-provider architecture."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY_PROVIDER = "sup" + "abase"
FORBIDDEN_MARKERS = (
    LEGACY_PROVIDER,
    LEGACY_PROVIDER + ".co",
    "@" + LEGACY_PROVIDER + "/" + ("sup" + "abase") + "-js",
    "@" + LEGACY_PROVIDER + "/" + "functions-js",
    "SUP" + "ABASE_" + "URL",
    "SUP" + "ABASE_" + "ANON_KEY",
    "SUP" + "ABASE_" + "PUBLISHABLE_KEY",
    "SUP" + "ABASE_" + "SERVICE_ROLE_KEY",
    "createClient" + "(",
    LEGACY_PROVIDER + ".auth.",
    "functions" + "/v1/",
)
SKIP_NAMES = {".git", ".venv", "node_modules", "__pycache__"}
violations = []

for path in ROOT.rglob("*"):
    if not path.is_file() or any(part in SKIP_NAMES for part in path.parts):
        continue
    relative = path.relative_to(ROOT)
    if any(part.lower() == LEGACY_PROVIDER for part in relative.parts):
        violations.append(f"path: {relative}")
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    for marker in FORBIDDEN_MARKERS:
        if marker.lower() in text.lower():
            violations.append(f"content: {relative} -> retired-provider residue")
            break

if violations:
    print("ZERO-RETIRED-PROVIDER RESIDUE GATE: FAIL")
    for item in violations[:200]:
        print(item)
    raise SystemExit(f"Retired provider residue detected: {len(violations)} violation(s)")

print("ZERO-RETIRED-PROVIDER RESIDUE GATE: PASS")
