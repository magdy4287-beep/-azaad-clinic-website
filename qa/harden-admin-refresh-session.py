from pathlib import Path
import re

PATH = Path("admin.js")
if not PATH.exists():
    raise SystemExit("admin.js not found")

js = PATH.read_text(encoding="utf-8")


def bounds(source: str, marker: str):
    start = source.find(marker)
    if start < 0:
        return None
    brace = source.find("{", start)
    if brace < 0:
        return None
    depth = 0
    quote = None
    escape = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if line_comment:
            if ch == "\n": line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == "*" and nxt == "/":
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == quote:
                quote = None
            i += 1
            continue
        if ch == "/" and nxt == "/":
            line_comment = True
            i += 2
            continue
        if ch == "/" and nxt == "*":
            block_comment = True
            i += 2
            continue
        if ch in "'\"`":
            quote = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1
    return None

replacement = '''async function restoreStaffProfile() {
  if (!state.user?.id) return false;

  async function currentSession() {
    const result = await supabase.auth.getSession();
    return result?.data?.session || null;
  }

  async function ensureSession() {
    let session = state.session || await currentSession();
    if (session?.access_token) {
      state.session = session;
      state.user = session.user || state.user;
      return session;
    }

    try {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed?.data?.session || null;
      if (session?.access_token) {
        state.session = session;
        state.user = session.user || state.user;
        return session;
      }
    } catch (error) {
      console.warn("Admin session refresh during startup failed:", error);
    }

    return null;
  }

  async function request(session) {
    return fetch(
      `${SUPABASE_URL}/functions/v1/azaad-admin-auth`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY
        }
      }
    );
  }

  let session = await ensureSession();
  if (!session?.access_token) return false;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      let response = await request(session);

      if (response.status === 401) {
        try {
          const refreshed = await supabase.auth.refreshSession();
          const refreshedSession = refreshed?.data?.session || null;
          if (refreshedSession?.access_token) {
            session = refreshedSession;
            state.session = refreshedSession;
            state.user = refreshedSession.user || state.user;
            response = await request(session);
          }
        } catch (error) {
          console.warn("Admin auth token refresh failed:", error);
        }
      }

      let body = {};
      try {
        body = await response.json();
      } catch (_) {}

      if (response.ok && body?.admin && body.admin.active !== false) {
        state.session = session;
        state.user = body.user || state.user;
        return applyStaffRole(body.admin);
      }

      // Invalid/expired credentials or an inactive staff record are real auth failures.
      // Do not call signOut here: startup restoration must never destroy a valid persisted
      // session because of a transient boundary/RLS/network failure.
      if (response.status === 401 || response.status === 403) {
        return false;
      }

      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 300));
        session = await ensureSession();
        if (!session?.access_token) return false;
        continue;
      }

      console.error("Admin auth boundary unavailable during startup:", body?.error || response.status);
      return false;
    } catch (error) {
      if (attempt >= 3) {
        console.error("Admin staff restore request failed:", error);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 300));
      session = await ensureSession();
      if (!session?.access_token) return false;
    }
  }

  return false;
}
'''.strip()

match = bounds(js, "async function restoreStaffProfile()")
if not match:
    raise SystemExit("restoreStaffProfile() not found")

js = js[:match[0]] + replacement + js[match[1]:]

required = [
    "supabase.auth.refreshSession()",
    "functions/v1/azaad-admin-auth",
    "response.status === 401",
    "response.status === 403",
    "for (let attempt = 1; attempt <= 3; attempt += 1)",
    "startup restoration must never destroy a valid persisted",
]
for token in required:
    if token not in js:
        raise SystemExit(f"Refresh persistence contract missing: {token}")

if re.search(r"restoreStaffProfile\(\)[\s\S]{0,5000}supabase\.auth\.signOut", js):
    raise SystemExit("restoreStaffProfile must never sign out during startup restoration")

PATH.write_text(js, encoding="utf-8")
print("[AZAAD] admin refresh-session persistence hardening PASS")
