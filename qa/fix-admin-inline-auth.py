from pathlib import Path

path = Path("admin.html")
text = path.read_text(encoding="utf-8")
start_marker = '''supabase.auth.onAuthStateChange(\n  async (\n    event,\n    session\n  ) => {'''
end_marker = '''\n  }\n);\n\nasync function restore()'''
start = text.find(start_marker)
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit("Inline admin auth callback markers not found")

replacement = '''supabase.auth.onAuthStateChange(\n  (event, session) => {\n    if (event === "SIGNED_IN" && session) {\n      state.session = session;\n      state.user = session.user;\n      return;\n    }\n\n    if (event === "TOKEN_REFRESHED") {\n      state.session = session || null;\n      state.user = session?.user || null;\n      return;\n    }\n\n    if (event === "SIGNED_OUT") {\n      state.session = null;\n      state.user = null;\n      state.staff = null;\n      state.initialized = false;\n    }\n  }\n);'''

text = text[:start] + replacement + text[end + 1:]
path.write_text(text, encoding="utf-8")
print("Fixed admin.html auth callback: no awaited work runs inside onAuthStateChange.")
