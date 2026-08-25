from pathlib import Path

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

blocking = "await initializeApplication();"
if blocking in js:
    raise SystemExit("Admin auth still contains a blocking initializeApplication() call")

scheduled = "void initializeApplication().catch("
if js.count(scheduled) != 2:
    raise SystemExit(
        f"Expected exactly 2 nonblocking initialization schedules, found {js.count(scheduled)}"
    )

print("[AZAAD] Admin auth critical-path contract: PASS")
