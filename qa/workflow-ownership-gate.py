from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
REGISTRY = ROOT / "docs" / "AZAAD_WORKFLOW_OWNERSHIP_REGISTRY.md"

if not REGISTRY.is_file():
    raise SystemExit("Missing workflow ownership registry")

registry = REGISTRY.read_text(encoding="utf-8")
workflow_files = sorted(WORKFLOWS.glob("*.yml")) + sorted(WORKFLOWS.glob("*.yaml"))
if not workflow_files:
    raise SystemExit("No GitHub workflows found")

# Every workflow must be explicitly named in the ownership registry.
missing = [p.name for p in workflow_files if p.name not in registry]
if missing:
    raise SystemExit("Unregistered workflow(s): " + ", ".join(missing))

# Prevent obvious retired/duplicate workflow naming from silently returning.
retired_markers = ("-v2.yml", "-v2.yaml", "-final-fix.yml", "-backup.yml", "-copy.yml", "-old.yml")
retired = [p.name for p in workflow_files if p.name.endswith(retired_markers)]
if retired:
    raise SystemExit("Retired/duplicate-style workflow name(s): " + ", ".join(retired))

# A workflow must have an explicit top-level name and a trigger block.
invalid = []
for path in workflow_files:
    text = path.read_text(encoding="utf-8")
    if not re.search(r"(?m)^name:\s*\S", text):
        invalid.append(f"{path.name}:missing-name")
    if not re.search(r"(?m)^on:\s*(?:$|[\[{])", text):
        invalid.append(f"{path.name}:missing-trigger")
if invalid:
    raise SystemExit("Invalid workflow contract: " + ", ".join(invalid))

print(f"[AZAAD workflow gate] {len(workflow_files)} workflows registered and structurally valid")
