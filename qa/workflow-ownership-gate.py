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

# Temporary incident workflows are retired once their canonical replacement
# passes on the same artifact. Keep their absence as a permanent invariant so
# future cleanup cannot accidentally resurrect duplicate verification paths.
RETIRED_WORKFLOW_FILES = {
    "azaad-browser-e2e-root-fix.yml",
    "azaad-api-module-import-diagnostic.yml",
}
resurrected = sorted(name for name in RETIRED_WORKFLOW_FILES if (WORKFLOWS / name).exists())
if resurrected:
    raise SystemExit("Retired workflow(s) must not be resurrected: " + ", ".join(resurrected))

# Prevent known retired/duplicate naming patterns from silently returning.
retired_markers = ("-v2.yml", "-v2.yaml", "-backup.yml", "-copy.yml", "-old.yml")
retired = [p.name for p in workflow_files if p.name.endswith(retired_markers)]
if retired:
    raise SystemExit("Retired/duplicate-style workflow name(s): " + ", ".join(retired))

# Canonical workflows must remain represented in the architecture registry.
# Broader legacy workflows are grandfathered until their own retirement evidence exists.
CANONICAL_WORKFLOWS = {
    "azaad-production-certification-gate.yml",
    "azaad-release-governance-gate.yml",
    "azaad-final-release-certification.yml",
    "azaad-browser-e2e.yml",
    "azaad-auth-bridge-e2e.yml",
    "azaad-comprehensive-system-contract.yml",
    "azaad-clinical-authorization-e2e.yml",
    "azaad-emergency-dr-restore.yml",
    "azaad-controlled-p0-neon-parity.yml",
    "azaad-controlled-runtime-provider-readiness.yml",
    "azaad-controlled-auth-parity-preflight.yml",
}
missing_registry = sorted(name for name in CANONICAL_WORKFLOWS if name not in registry)
if missing_registry:
    raise SystemExit("Canonical workflow(s) missing ownership entry: " + ", ".join(missing_registry))

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

print(f"[AZAAD workflow gate] {len(workflow_files)} workflows structurally valid; canonical ownership entries present; retired diagnostics absent")
