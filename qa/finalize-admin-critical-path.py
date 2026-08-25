from pathlib import Path

path = Path("admin.js")
if not path.exists():
    raise SystemExit("admin.js not found")

js = path.read_text(encoding="utf-8")

old = "await initializeApplication();"
new = '''void initializeApplication().catch(error =>
    console.error("Admin initialization error:", error)
  );'''

count = js.count(old)
if count != 2:
    raise SystemExit(
        f"Expected exactly 2 blocking initializeApplication calls, found {count}"
    )

js = js.replace(old, new)

# Fail closed if a later transform reintroduces a blocking initialization call.
if "await initializeApplication();" in js:
    raise SystemExit("Blocking initializeApplication() call remains")

path.write_text(js, encoding="utf-8")
print("[AZAAD] Admin authentication no longer awaits application initialization")
