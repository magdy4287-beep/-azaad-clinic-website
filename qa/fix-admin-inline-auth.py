from pathlib import Path
import re

path = Path("admin.html")
text = path.read_text(encoding="utf-8")

NORMALIZED = '''supabase.auth.onAuthStateChange(
  (event, session) => {
    if (event === "SIGNED_IN" && session) {
      state.session = session;
      state.user = session.user;
      return;
    }

    if (event === "TOKEN_REFRESHED") {
      state.session = session || null;
      state.user = session?.user || null;
      return;
    }

    if (event === "SIGNED_OUT") {
      state.session = null;
      state.user = null;
      state.staff = null;
      state.initialized = false;
    }
  }
);'''

# Be idempotent across formatting changes introduced by the auth finalizer.
# The important invariant is that no async callback is registered here.
callback = re.search(
    r'supabase\.auth\.onAuthStateChange\(\s*\n.*?\n\s*\}\s*\n\);',
    text,
    flags=re.DOTALL,
)

if not callback:
    raise SystemExit("Inline admin auth callback not found")

current = callback.group(0)
if re.search(
    r'onAuthStateChange\(\s*\n\s*\(event,\s*session\)\s*=>\s*\{',
    current,
):
    print("Admin auth callback already normalized; no change required.")
    raise SystemExit(0)

text = text[:callback.start()] + NORMALIZED + text[callback.end():]
path.write_text(text, encoding="utf-8")
print("Fixed admin.html auth callback: no awaited work runs inside onAuthStateChange.")
