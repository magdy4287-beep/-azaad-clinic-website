from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

# Browser-reachable artifacts are the only source of truth for the free production runtime.
# Supabase may remain under /supabase for migration/history, but it must never be reachable
# from a production HTML entrypoint or a locally loaded browser module.
ENTRYPOINTS = ("index.html", "admin.html", "clinical-assessment.html", "patient-portal.html", "doctor-dashboard.html")
SCRIPT_RE = re.compile(r'<script\\b[^>]*(?:src|data-azaad-after-auth-src)=["\']([^"\']+)["\'][^>]*>', re.I)
LOCAL_SRC_RE = re.compile(r'^[./]?/?[A-Za-z0-9_./-]+(?:\\?[^#\\s"\']*)?$')
FORBIDDEN = (
    r"supabase\\.co/functions/v1",
    r"@supabase/supabase-js",
    r"\\bSUPABASE_(?:URL|ANON_KEY|SERVICE_ROLE_KEY|PUBLISHABLE_KEY)\\b",
    r"\\bcreateClient\\s*\\(",
    r"\\bwindow\\.(?:supabase|supabaseClient)\\b",
    r"\\.auth\\.(?:getSession|getUser|onAuthStateChange|refreshSession|signOut)\\s*\\(",
    r"sessionStorage\\.setItem\\(\\s*[\"']azaad_admin_token",
)
FORBIDDEN_RE = re.compile("|".join(FORBIDDEN), re.I)


def canonical(path):
    return path.split("?", 1)[0].split("#", 1)[0].lstrip("/")


def local_target(src):
    src = canonical(src)
    if not src or src.startswith(("http://", "https://", "//", "data:")):
        return None
    return src

seen = set()
queue = []
for entry in ENTRYPOINTS:
    path = ROOT / entry
    if path.exists():
        queue.append(path)

while queue:
    path = queue.pop(0)
    if path in seen or not path.is_file():
        continue
    seen.add(path)
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix.lower() in {".html", ".htm"}:
        for match in SCRIPT_RE.finditer(text):
            target = local_target(match.group(1))
            if target:
                candidate = ROOT / target
                if candidate.is_file():
                    queue.append(candidate)
    # Browser JS can dynamically load local modules/scripts. Follow only explicit local
    # script/module URLs so the graph remains deterministic and bounded.
    for match in re.finditer(r"(?:import\\s*(?:[^'\"]*from\\s*)?|import\\s*\\()?[\"']([./][^\"']+\\.js(?:\\?[^\"']*)?)[\"']", text):
        target = local_target(match.group(1))
        if target:
            candidate = ROOT / target
            if candidate.is_file():
                queue.append(candidate)

failures = []
for path in sorted(seen):
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith("supabase/"):
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    for line_no, line in enumerate(text.splitlines(), 1):
        if FORBIDDEN_RE.search(line):
            failures.append(f"{rel}:{line_no}:{line.strip()}")

if failures:
    print("FAIL-CLOSED: legacy Supabase runtime reached from production browser graph")
    print("\\n".join(failures[:80]))
    raise SystemExit(1)

print(f"[AZAAD legacy runtime gate] {len(seen)} reachable browser artifacts clean; no legacy Supabase runtime markers")
