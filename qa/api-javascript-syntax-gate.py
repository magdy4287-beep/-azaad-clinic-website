from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "api"
files = sorted(API.glob("*.js"))
if not files:
    raise SystemExit("No api/*.js runtime files found")

failed = []
for path in files:
    result = subprocess.run(["node", "--check", str(path)], cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        failed.append((path.relative_to(ROOT).as_posix(), (result.stderr or result.stdout).strip()))

if failed:
    print("[AZAAD API JavaScript syntax gate] FAIL")
    for path, detail in failed:
        print(f"- {path}: {detail}")
    raise SystemExit(1)

print(f"[AZAAD API JavaScript syntax gate] PASS: {len(files)} API runtime files parsed successfully")
