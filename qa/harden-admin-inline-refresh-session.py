from pathlib import Path

PATH = Path("admin.html")
if not PATH.exists():
    raise SystemExit("admin.html not found")

text = PATH.read_text(encoding="utf-8")


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
            if ch == "\n":
                line_comment = False
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

replacement = '''async function restoreStaff() {

  if (!state.user?.id) {
    return false;
  }

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

  let session = await ensureSession();
  if (!session?.access_token) {
    return false;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await supabase
        .from("clinic_staff")
        .select(`
          id,
          auth_user_id,
          full_name,
          username,
          email,
          phone,
          role,
          active
        `)
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (!result.error && result.data && result.data.active !== false) {
        state.session = session;
        state.user = session.user;
        return applyStaff(result.data);
      }

      if (result.error) {
        console.warn(
          `Admin staff restoration attempt ${attempt} failed:`,
          result.error
        );

        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 300));
          session = await ensureSession();
          if (!session?.access_token) return false;
          continue;
        }

        // A transient database/RLS/network failure must never destroy a
        // persisted authenticated session by calling signOut().
        return false;
      }

      // A confirmed missing/inactive staff profile is an authorization
      // failure, but still do not mutate the persisted Auth session here.
      return false;
    } catch (error) {
      console.warn(
        `Admin staff restoration attempt ${attempt} threw:`,
        error
      );

      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 300));
        session = await ensureSession();
        if (!session?.access_token) return false;
        continue;
      }

      return false;
    }
  }

  return false;
}
'''.strip()

match = bounds(text, "async function restoreStaff()")
if not match:
    raise SystemExit("inline restoreStaff() not found")

text = text[:match[0]] + replacement + text[match[1]:]

match = bounds(text, "async function restoreStaff()")
body = text[match[0]:match[1]] if match else ""
if "supabase.auth.signOut" in body:
    raise SystemExit("inline restoreStaff() must never sign out during startup restoration")

for token in (
    "supabase.auth.refreshSession()",
    "for (let attempt = 1; attempt <= 3; attempt += 1)",
    "must never sign out during startup restoration",
):
    if token not in body and token not in text:
        raise SystemExit(f"Inline refresh contract missing: {token}")

PATH.write_text(text, encoding="utf-8")
print("[AZAAD] inline admin refresh-session persistence hardening PASS")