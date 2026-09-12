from pathlib import Path
import ast
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "qa" / "vercel-build.py"

REQUIRED_TERMINAL_TRANSFORMS = {
    "qa/finalize-appwrite-admin-auth.py",
    "qa/retire-legacy-admin-staff-runtime.py",
    "qa/final-admin-restore-boundary.py",
    "qa/finalize-staff-management-runtime-boundary.py",
}

if not BUILD.is_file():
    raise SystemExit("Engineering-tree GC gate: qa/vercel-build.py is required")

text = BUILD.read_text(encoding="utf-8", errors="replace")
try:
    tree = ast.parse(text, filename=str(BUILD))
except SyntaxError as exc:
    raise SystemExit(f"Engineering-tree GC gate: build script syntax error: {exc}")

assignments = {node.targets[0].id: node.value for node in tree.body if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name)}


def extract_steps(name):
    node = assignments.get(name)
    if not isinstance(node, ast.List):
        raise SystemExit(f"Engineering-tree GC gate: {name} must be a literal list")
    values = []
    for item in node.elts:
        if not isinstance(item, ast.List) or len(item.elts) != 2:
            raise SystemExit(f"Engineering-tree GC gate: {name} contains a non-step entry")
        path_node = item.elts[1]
        if not isinstance(path_node, ast.Name) and not isinstance(path_node, ast.Constant):
            # TRANSFORM_STEPS/VERIFY_STEPS use a list comprehension; reject drift
            # rather than guessing at dynamic build ownership.
            raise SystemExit(f"Engineering-tree GC gate: {name} is not statically enumerable")
        values.append(path_node.id if isinstance(path_node, ast.Name) else path_node.value)
    return values

# The canonical build currently uses list comprehensions over literal tuples.
def extract_tuple_paths(name):
    node = assignments.get(name)
    if not isinstance(node, ast.ListComp):
        raise SystemExit(f"Engineering-tree GC gate: {name} must remain a literal list comprehension")
    generator = node.generators[0] if len(node.generators) == 1 else None
    if not generator or not isinstance(generator.iter, ast.Tuple):
        raise SystemExit(f"Engineering-tree GC gate: {name} must have a literal tuple source")
    paths = []
    for elt in generator.iter.elts:
        if not isinstance(elt, ast.Constant) or not isinstance(elt.value, str):
            raise SystemExit(f"Engineering-tree GC gate: {name} contains a dynamic transform path")
        paths.append(elt.value)
    return paths

transforms = extract_tuple_paths("TRANSFORM_STEPS")
verifiers = extract_tuple_paths("VERIFY_STEPS")

failures = []
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

for required in sorted(REQUIRED_TERMINAL_TRANSFORMS):
    if transforms.count(required) != 1:
        failures.append(f"required canonical terminal transform must occur exactly once: {required}")

# Prevent accidental reintroduction of the old broad mutation family as a
# second owner: the build file itself is the only transform registry.
for path in transforms:
    if path in {"qa/vercel-build.py", "qa/engineering-tree-garbage-collection-gate.py"}:
        failures.append(f"build registry cannot transform through its own gate: {path}")

if failures:
    print("ENGINEERING TREE GARBAGE COLLECTION: FAIL-CLOSED")
    for failure in failures:
        print(f" - {failure}")
    sys.exit(1)

print("ENGINEERING TREE GARBAGE COLLECTION: PASS")
print(f" - transform owners: {len(transforms)} unique")
print(f" - verification owners: {len(verifiers)} unique")
print(" - no transform/verify double ownership")
print(" - all referenced scripts exist")
print(" - canonical Appwrite/legacy-retirement terminal transforms are singular")
