"""AZAAD architecture integrity / anti-regression gate.

This is intentionally diagnostic, not self-mutating. It prevents future drift by
failing at the first architectural violation and naming the canonical owner that
must be repaired. Source changes remain human/PR controlled.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_DIRS = {
    ".git", "node_modules", ".next", "dist", "build", "coverage",
    "playwright-report", "test-results", "supabase", "qa", "docs", ".github"
}
RUNTIME_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".html", ".css"}

# Supabase remains only as retained migration/DR evidence under the explicit
# excluded areas above. It must not re-enter application runtime source.
FORBIDDEN_RUNTIME = [
    (re.compile(r"https?://[A-Za-z0-9.-]+\\.supabase\\.co", re.I), "Supabase provider URL"),
    (re.compile(r"/functions/v1/", re.I), "Supabase Edge Function path"),
    (re.compile(r"window\\.supabase\\b", re.I), "browser Supabase client exposure"),
    (re.compile(r"supabase\\.auth\\b", re.I), "Supabase Auth runtime usage"),
]

# These are the canonical runtime owners already established by the current
# architecture. A missing owner is a structural failure; a second semantic
# owner must be caught by the domain-specific gates rather than recreated here.
CANONICAL_OWNERS = {
    "admin-auth": "api/admin-auth.js",
    "admin-restore": "api/admin-restore.js",
    "staff-admin": "api/staff-admin.js",
    "admin-appointments": "api/admin-appointments.js",
    "purchases": "api/purchases.js",
}


def runtime_files():
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in RUNTIME_EXTENSIONS:
            continue
        if any(part in EXCLUDED_DIRS for part in path.relative_to(ROOT).parts):
            continue
        yield path


def main():
    failures = []
    scanned = 0

    for path in runtime_files():
        scanned += 1
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:
            failures.append(f"{path.relative_to(ROOT)}: unreadable runtime file: {exc}")
            continue

        for pattern, label in FORBIDDEN_RUNTIME:
            match = pattern.search(text)
            if match:
                line = text.count("\\n", 0, match.start()) + 1
                failures.append(
                    f"{path.relative_to(ROOT)}:{line}: forbidden {label}; "
                    "repair the canonical runtime owner instead of adding a compatibility path"
                )

        # Browser code must not depend on access-token state. Server APIs are
        # intentionally handled by their own auth-boundary gates.
        if not path.parts[-2:] or "api" not in path.relative_to(ROOT).parts:
            if re.search(r"(?:access_token|refresh_token)\\b", text, re.I):
                failures.append(
                    f"{path.relative_to(ROOT)}: browser/runtime token state detected; "
                    "use the server-managed HttpOnly session boundary"
                )

    for owner, relative_path in CANONICAL_OWNERS.items():
        path = ROOT / relative_path
        if not path.is_file():
            failures.append(
                f"{owner}: canonical owner missing ({relative_path}); "
                "do not create a second compatibility owner"
            )

    # Prevent accidental duplicate route basenames under /api. Distinct nested
    # routes are allowed; only an identical filename at root and nested depth is
    # suspicious enough to stop the tree automatically.
    api = ROOT / "api"
    if api.is_dir():
        root_names = {p.name for p in api.glob("*.js")}
        nested_names = {p.name for p in api.rglob("*.js") if p.parent != api}
        for name in sorted(root_names & nested_names):
            failures.append(
                f"api/{name}: duplicate route basename exists at root and nested depth; "
                "establish one canonical runtime owner"
            )

    if failures:
        print("[AZAAD architecture-integrity] FAIL")
        for failure in failures:
            print(f" - {failure}")
        print("[AZAAD architecture-integrity] Remediation: ROOT SCAN -> identify canonical owner -> minimal fix -> rerun all domain gates")
        return 1

    print(
        f"[AZAAD architecture-integrity] PASS: scanned {scanned} runtime files; "
        "canonical owners present; no retired Supabase/browser-token runtime drift"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
