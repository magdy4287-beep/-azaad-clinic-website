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

# The auth finalizer may already have removed or rewritten this listener.
# Success is valid only when there is no async auth-state callback left.
if "supabase.auth.onAuthStateChange" not in text:
    if re.search(r"onAuthStateChange\s*\(\s*(?:async\s*)?\(", text):
        raise SystemExit("Unable to classify remaining auth-state callback")
    print("No inline admin auth-state callback remains; no change required.")
    raise SystemExit(0)

# Capture the whole call without depending on the finalizer's whitespace.
callback = re.search(
    r'supabase\.auth\.onAuthStateChange\s*\(.*?\);',
    text,
    flags=re.DOTALL,
)
if not callback:
    raise SystemExit("Inline admin auth callback marker is present but could not be parsed")

current = callback.group(0)
if re.search(r'onAuthStateChange\s*\(\s*(?:async\s*)?\(', current):
    # Replace only when an actual callback is present. The normalized callback
    # is deliberately synchronous so setSession() cannot wait on network work.
    text = text[:callback.start()] + NORMALIZED + text[callback.end():]
    path.write_text(text, encoding="utf-8")
    print("Fixed admin.html auth callback: no awaited work runs inside onAuthStateChange.")
    raise SystemExit(0)

# A non-async callback is already safe; leave it untouched.
print("Admin auth callback is already synchronous; no change required.")
raise SystemExit(0)
