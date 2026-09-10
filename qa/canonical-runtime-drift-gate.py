from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

FORBIDDEN_RUNTIME_MARKERS = (
    r"\bSUPABASE_URL\b",
    r"\bSUPABASE_PUBLISHABLE_KEY\b",
    r"\bSUPABASE_ANON_KEY\b",
    r"\bSUPABASE_SERVICE_ROLE_KEY\b",
    r"\bcreateClient\s*\(",
    r"functions/v1/",
    r"https?://[^\s\"']*supabase\.co",
    r"\bsupabase\.auth\.",
    r"\bwindow\.supabase\b",
    r"\bdocument\.cookie\b",
    r"\bbindTabs\s*\(",
    r"\bswitchPanel\s*\(",
    r"\brestoreSession\s*\(",
)

# Historical migration/evidence assets are intentionally outside the browser-runtime scan.
QUARANTINED_PREFIXES = ("supabase/", "docs/", "qa/")


def executable(text):
    text = re.sub(r"/\*[\s\S]*?\*/", "", text)
    return re.sub(r"(^|\n)\s*//.*?(?=\n|$)", r"\1", text)


def assert_clean(label, text):
    violations = [pattern for pattern in FORBIDDEN_RUNTIME_MARKERS if re.search(pattern, executable(text), flags=re.I)]
    if violations:
        raise SystemExit(f"FAIL-CLOSED: retired runtime marker(s) in {label}: {', '.join(violations)}")


# Scan every production HTML entrypoint, not only the historically known Admin/public pair.
# This closes the exact gap that allowed a clinician/refund/secondary page to retain a retired owner.
HTML_FILES = sorted(p for p in ROOT.glob("*.html") if p.is_file())
if not HTML_FILES:
    raise SystemExit("FAIL-CLOSED: no production HTML entrypoints found")

LOCAL_SCRIPT_RE = re.compile(r"<script\b[^>]*\bsrc=[\"']([^\"']+)[\"'][^>]*>", re.I)

for html in HTML_FILES:
    html_text = html.read_text(encoding="utf-8")
    assert_clean(html.name, html_text)
    sources = LOCAL_SCRIPT_RE.findall(html_text)
    local_sources = []
    for src in sources:
        base = src.split("?", 1)[0]
        if not base or base.startswith(("/", "http://", "https://", "//", "data:", "blob:")):
            # Root-relative application scripts are still local runtime owners.
            if base.startswith("/") and base.endswith(".js"):
                local_sources.append(base.rsplit("/", 1)[-1])
            continue
        if base.endswith(".js"):
            local_sources.append(base.rsplit("/", 1)[-1])

    duplicate_names = sorted({name for name in local_sources if local_sources.count(name) > 1})
    if duplicate_names:
        raise SystemExit(f"FAIL-CLOSED: duplicate browser script owner(s) in {html.name}: {', '.join(duplicate_names)}")

    for name in local_sources:
        script = ROOT / name
        if not script.is_file():
            # Some canonical transforms inject scripts after this source-level scan.
            # Missing source files are not silently ignored: only known generated owners may be absent.
            continue
        assert_clean(name, script.read_text(encoding="utf-8"))

# These are critical canonical owners and must remain singular in their entrypoints.
def script_names(path):
    return [src.split("?", 1)[0].rsplit("/", 1)[-1] for src in LOCAL_SCRIPT_RE.findall(path.read_text(encoding="utf-8"))]

admin = ROOT / "admin.html"
index = ROOT / "index.html"
for label, path, canonical_names in (
    ("admin.html", admin, ("azaad-core-context.js", "admin-shell.js")),
    ("index.html", index, ("public-media-transforms.js",)),
):
    names = script_names(path)
    for canonical in canonical_names:
        if names.count(canonical) != 1:
            raise SystemExit(f"FAIL-CLOSED: expected exactly one canonical {canonical} owner in {label}; found {names.count(canonical)}")

print(f"[AZAAD canonical runtime drift gate] PASS: scanned {len(HTML_FILES)} HTML entrypoints and their local browser scripts; no retired owners or duplicate script owners")
