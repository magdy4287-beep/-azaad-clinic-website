from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
REGISTRY = ROOT / "docs" / "AZAAD_WORKFLOW_OWNERSHIP_REGISTRY.md"

if not REGISTRY.is_file():
    raise SystemExit("Missing workflow ownership registry")

registry = REGISTRY.read_text(encoding="utf-8")
workflow_files = sorted(WORKFLOWS.glob("*.yml")) + sorted(WORKFLOWS.glob("*.yaml"))
if not workflow_files:
    raise SystemExit("No GitHub workflows found")

# Existing workflows are grandfathered by the registry history. Any workflow
# added or renamed in a future change must be explicitly registered before CI
# can accept the change. This avoids a one-time inventory migration becoming a
# permanent source of false failures.
try:
    changed = subprocess.check_output(
        ["git", "diff", "--name-status", "HEAD^", "HEAD", "--", ".github/workflows"],
        cwd=ROOT,
        text=True,
    ).splitlines()
except (subprocess.CalledProcessError, FileNotFoundError):
    changed = []

changed_workflows = []
for line in changed:
    parts = line.split("\t")
    if len(parts) >= 2 and parts[0] in {"A", "M", "R", "C"}:
        path = parts[-1]
        if path.startswith(".github/workflows/"):
            changed_workflows.append(Path(path).name)

missing = sorted({name for name in changed_workflows if name not in registry})
if missing:
    raise SystemExit("Changed workflow(s) missing ownership entry: " + ", ".join(missing))

# Prevent known retired/duplicate naming patterns from silently returning.
retired_markers = ("-v2.yml", "-v2.yaml", "-backup.yml", "-copy.yml", "-old.yml")
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

print(f"[AZAAD workflow gate] {len(workflow_files)} workflows structurally valid; {len(changed_workflows)} changed workflow(s) ownership-checked")
