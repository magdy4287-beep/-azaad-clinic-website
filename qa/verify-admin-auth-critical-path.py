from pathlib import Path
import re

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

for name in ("login", "restoreSession"):
    match = re.search(
        rf"(?:async )?function {name}\([^)]*\)\s*\{{(?P<body>.*?)\n\}}",
        js,
        re.S,
    )
    if not match:
        raise SystemExit(f"{name}() not found")

    body = match.group("body")
    if "await initializeApplication();" in body:
        raise SystemExit(f"{name}() still blocks on application initialization")
    if "void initializeApplication().catch(" not in body:
        raise SystemExit(f"{name}() must schedule initialization without awaiting it")

print("[AZAAD] Admin auth critical-path contract: PASS")
