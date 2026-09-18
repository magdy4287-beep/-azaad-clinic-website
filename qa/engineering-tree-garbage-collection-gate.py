from pathlib import Path
import ast
import hashlib
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "qa" / "vercel-build.py"
EXECUTABLE_ROOTS = (ROOT / "qa", ROOT / "scripts", ROOT / ".github")
EXECUTABLE_SUFFIXES = {".py", ".sh"}
PLACEHOLDER_COMMENT = re.compile(r"^\s*#\s*(?:placeholder|no[- ]op)\s*$", re.I | re.M)

if not BUILD.is_file():
    raise SystemExit("Engineering-tree GC gate: qa/vercel-build.py is required")

text = BUILD.read_text(encoding="utf-8", errors="replace")
try:
    tree = ast.parse(text, filename=str(BUILD))
except SyntaxError as exc:
    raise SystemExit(f"Engineering-tree GC gate: build script syntax error: {exc}")

assignments = {
    node.targets[0].id: node.value
    for node in tree.body
    if isinstance(node, ast.Assign)
    and len(node.targets) == 1
    and isinstance(node.targets[0], ast.Name)
}


def extract_paths(name):
    node = assignments.get(name)
    if isinstance(node, ast.List):
        paths = []
        for elt in node.elts:
            if not isinstance(elt, ast.Constant) or not isinstance(elt.value, str):
                raise SystemExit(f"Engineering-tree GC gate: {name} contains a dynamic path")
            paths.append(elt.value)
        return paths
    if not isinstance(node, ast.ListComp) or len(node.generators) != 1:
        raise SystemExit(f"Engineering-tree GC gate: {name} must be a literal list or list comprehension")
    generator = node.generators[0]
    if not isinstance(generator.iter, ast.Tuple):
        raise SystemExit(f"Engineering-tree GC gate: {name} must have a literal tuple source")
    paths = []
    for elt in generator.iter.elts:
        if not isinstance(elt, ast.Constant) or not isinstance(elt.value, str):
            raise SystemExit(f"Engineering-tree GC gate: {name} contains a dynamic path")
        paths.append(elt.value)
    return paths

transforms = extract_paths("TRANSFORM_STEPS")
verifiers = extract_paths("VERIFY_STEPS")

failures = []
if transforms:
    failures.append("production transform registry must be empty: canonical source is materialized in Git")

for label, paths in (("transform", transforms), ("verify", verifiers)):
    duplicates = sorted({p for p in paths if paths.count(p) > 1})
    if duplicates:
        failures.append(f"duplicate {label} ownership: {', '.join(duplicates)}")
    missing = sorted({p for p in paths if not (ROOT / p).is_file()})
    if missing:
        failures.append(f"missing {label} script(s): {', '.join(missing)}")

shared = sorted(set(transforms) & set(verifiers))
if shared:
    failures.append("script owned by both transform and verify phases: " + ", ".join(shared))

for path in transforms:
    if path in {"qa/vercel-build.py", "qa/engineering-tree-garbage-collection-gate.py"}:
        failures.append(f"build registry cannot transform through its own gate: {path}")

for base in EXECUTABLE_ROOTS:
    if not base.exists():
        continue
    for path in base.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in EXECUTABLE_SUFFIXES:
            continue
        if ".git" in path.parts:
            continue
        body = path.read_text(encoding="utf-8", errors="replace")
        meaningful = [line.strip() for line in body.splitlines() if line.strip() and not line.lstrip().startswith("#")]
        if not meaningful or PLACEHOLDER_COMMENT.search(body) or meaningful == ["pass"]:
            failures.append(f"placeholder/no-op executable must be retired or implemented: {path.relative_to(ROOT).as_posix()}")

hashes = {}
for base in EXECUTABLE_ROOTS:
    if not base.exists():
        continue
    for path in base.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in EXECUTABLE_SUFFIXES or ".git" in path.parts:
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        hashes.setdefault(digest, []).append(path.relative_to(ROOT).as_posix())
for paths in sorted(hashes.values()):
    if len(paths) < 2:
        continue
    owned = [p for p in paths if p in transforms or p in verifiers]
    if len(owned) > 1:
        failures.append("exact duplicate executable payload has multiple active owners: " + ", ".join(sorted(paths)))

if failures:
    print("ENGINEERING TREE GARBAGE COLLECTION: FAIL-CLOSED")
    for failure in failures:
        print(f" - {failure}")
    sys.exit(1)

print("ENGINEERING TREE GARBAGE COLLECTION: PASS")
print(f" - transform owners: {len(transforms)} (production build is source-immutable)")
print(f" - verification owners: {len(verifiers)} unique")
print(" - no transform/verify double ownership")
print(" - all referenced scripts exist")
print(" - canonical source is not rewritten by the production build")
print(" - no placeholder/no-op executable detected")
print(" - duplicate executable payloads are rejected only when multiply owned")
