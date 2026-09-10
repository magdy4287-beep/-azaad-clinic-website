from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

RUNTIME_FILES = {
    "admin.js": ROOT / "admin.js",
    "admin.html": ROOT / "admin.html",
    "index.html": ROOT / "index.html",
}

FORBIDDEN_RUNTIME_MARKERS = (
    r"\bSUPABASE_URL\b",
    r"\bSUPABASE_PUBLISHABLE_KEY\b",
    r"\bcreateClient\s*\(",
    r"functions/v1/staff-login",
    r"\bsupabase\.auth\.",
    r"\bdocument\.cookie\b",
    r"\bbindTabs\s*\(",
    r"\bswitchPanel\s*\(",
    r"\brestoreSession\s*\(",
)

# These are historical migration/evidence assets, not production browser owners.
QUARANTINED_PREFIXES = ("supabase/", "docs/", "qa/")

for label, path in RUNTIME_FILES.items():
    if not path.is_file():
        raise SystemExit(f"FAIL-CLOSED: required runtime artifact missing: {label}")
    text = path.read_text(encoding="utf-8")
    executable = re.sub(r"/\*[\s\S]*?\*/", "", text)
    executable = re.sub(r"(^|\n)\s*//.*?(?=\n|$)", r"\1", executable)
    violations = [pattern for pattern in FORBIDDEN_RUNTIME_MARKERS if re.search(pattern, executable, flags=re.I)]
    if violations:
        raise SystemExit(f"FAIL-CLOSED: retired runtime marker(s) in {label}: {', '.join(violations)}")


def script_sources(path):
    text = path.read_text(encoding="utf-8")
    return re.findall(r"<script\b[^>]*\bsrc=[\"']([^\"']+)[\"'][^>]*>", text, flags=re.I)

for label in ("admin.html", "index.html"):
    sources = script_sources(RUNTIME_FILES[label])
    for canonical in ("azaad-core-context.js", "admin-shell.js") if label == "admin.html" else ("public-media-transforms.js",):
        matches = [src for src in sources if src.split("?", 1)[0].rsplit("/", 1)[-1] == canonical]
        if len(matches) != 1:
            raise SystemExit(f"FAIL-CLOSED: expected exactly one canonical {canonical} owner in {label}; found {len(matches)}")

print("[AZAAD canonical runtime drift gate] PASS: no retired browser auth/interactivity markers and no duplicate canonical runtime owners")
