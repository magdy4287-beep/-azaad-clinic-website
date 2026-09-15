"""Fail-closed gate for zero retired-provider runtime dependency residue.

QA assertions and historical evidence may intentionally mention the retired provider
when proving that the provider is absent from production. This gate therefore scans
production/runtime/configuration surfaces; dedicated QA contracts own their assertions.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY_PROVIDER = "sup" + "abase"
FORBIDDEN_MARKERS = (
    LEGACY_PROVIDER + ".co",
    "@" + LEGACY_PROVIDER + "/" + ("sup" + "abase") + "-js",
    "@" + LEGACY_PROVIDER + "/" + "functions-js",
    "SUP" + "ABASE_" + "URL",
    "SUP" + "ABASE_" + "ANON_KEY",
    "SUP" + "ABASE_" + "PUBLISHABLE_KEY",
    "SUP" + "ABASE_" + "SERVICE_ROLE_KEY",
    "createClient(" + LEGACY_PROVIDER,
    "createClient(" + "https://esm.sh/@" + LEGACY_PROVIDER,
    "createClient(" + "npm:@" + LEGACY_PROVIDER,
    LEGACY_PROVIDER + ".auth.",
    "functions" + "/v1/",
    "window.AZAAD?." + LEGACY_PROVIDER,
    "window.AZAAD." + LEGACY_PROVIDER,
    "process.env." + "SUP" + "ABASE",
)
SKIP_NAMES = {".git", ".venv", "node_modules", "__pycache__", "qa", "docs"}
violations = []

for path in ROOT.rglob("*"):
    if not path.is_file() or any(part in SKIP_NAMES for part in path.parts):
        continue
    relative = path.relative_to(ROOT)
    if any(part.lower() == LEGACY_PROVIDER for part in relative.parts):
        violations.append((str(relative), "path", "directory/file name"))
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    lower_text = text.lower()
    for marker in FORBIDDEN_MARKERS:
        lower_marker = marker.lower()
        if lower_marker not in lower_text:
            continue
        line_numbers = [str(index) for index, line in enumerate(text.splitlines(), start=1) if lower_marker in line.lower()]
        location = ",".join(line_numbers[:12])
        if len(line_numbers) > 12:
            location += ",..."
        violations.append((str(relative), "runtime-residue", f"marker={marker!r} lines={location}"))
        break

if violations:
    print("ZERO-RETIRED-PROVIDER RUNTIME RESIDUE GATE: FAIL")
    for relative, kind, detail in violations[:200]:
        print(f"{kind}: {relative} -> {detail}")
    if len(violations) > 200:
        print(f"... {len(violations) - 200} additional violation(s) omitted")
    raise SystemExit(f"Retired provider runtime residue detected: {len(violations)} violation(s)")

print("ZERO-RETIRED-PROVIDER RUNTIME RESIDUE GATE: PASS")
