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

RETIRED_WORKFLOW_FILES = {
    "azaad-browser-e2e-root-fix.yml",
    "azaad-api-module-import-diagnostic.yml",
    "azaad-controlled-neon-public-migration.yml",
    "azaad-neon-database-migration.yml",
    "azaad-clinical-fixture-boundary.yml",
    "pgrst303-rest-root-diagnostic.yml",
    "azaad-emergency-dr-restore.yml",
    "azaad-emergency-dr-auth.yml",
    "azaad-emergency-dr-execute.yml",
    "azaad-emergency-dr-final.yml",
    "azaad-emergency-dr-functions.yml",
}
resurrected = sorted(name for name in RETIRED_WORKFLOW_FILES if (WORKFLOWS / name).exists())
if resurrected:
    raise SystemExit("Retired workflow(s) must not be resurrected: " + ", ".join(resurrected))

retired_markers = ("-v2.yml", "-v2.yaml", "-backup.yml", "-copy.yml", "-old.yml")
retired = [p.name for p in workflow_files if p.name.endswith(retired_markers)]
if retired:
    raise SystemExit("Retired/duplicate-style workflow name(s): " + ", ".join(retired))

CANONICAL_WORKFLOWS = {
    "azaad-production-certification-gate.yml",
    "azaad-release-governance-gate.yml",
    "azaad-final-release-certification.yml",
    "azaad-browser-e2e.yml",
    "azaad-comprehensive-system-contract.yml",
    "azaad-clinical-authorization-e2e.yml",
    "azaad-controlled-p0-neon-parity.yml",
    "azaad-controlled-runtime-provider-readiness.yml",
    "azaad-controlled-auth-parity-preflight.yml",
}
missing_files = sorted(name for name in CANONICAL_WORKFLOWS if not (WORKFLOWS / name).is_file())
if missing_files:
    raise SystemExit("Canonical workflow(s) missing from executable tree: " + ", ".join(missing_files))
missing_registry = sorted(name for name in CANONICAL_WORKFLOWS if name not in registry)
if missing_registry:
    raise SystemExit("Canonical workflow(s) missing ownership entry: " + ", ".join(missing_registry))

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
