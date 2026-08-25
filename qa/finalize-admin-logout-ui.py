from pathlib import Path
import re
from urllib.parse import urlsplit


def patch_admin_js():
    path = Path('admin.js')
    if not path.exists():
        raise SystemExit('admin.js not found')

    js = path.read_text(encoding='utf-8')
    start = js.find('async function logout() {')
    if start < 0:
        raise SystemExit('logout function not found')
    end = js.find('\n}\n\n/*', start)
    if end < 0:
        raise SystemExit('logout function boundary not found')
    end += 2

    new_logout = '''async function logout() {
  const loginPage = $("loginPage");
  const adminPage = $("adminPage");

  // The shell transition is local and deterministic. It must not wait for
  // Supabase network state before the authenticated surface disappears.
  if (adminPage) adminPage.classList.add("hidden");
  if (loginPage) {
    loginPage.classList.remove("hidden");
    loginPage.removeAttribute("aria-hidden");
  }

  state.session = null;
  state.user = null;
  state.staff = null;
  state.currentRole = null;
  state.permissions = new Set();
  state.initialized = false;
  state.initializing = false;

  const form = $("loginForm");
  if (form) form.reset();
  const password = $("password");
  if (password) password.value = "";

  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  } catch (error) {
    console.error("Logout error:", error);
  }

  // Re-assert the shell invariant after auth callbacks complete.
  if (adminPage) adminPage.classList.add("hidden");
  if (loginPage) loginPage.classList.remove("hidden");
}'''

    js = js[:start] + new_logout + js[end:]
    path.write_text(js, encoding='utf-8')
    print('[AZAAD final logout] admin.js PASS')


def patch_admin_html():
    path = Path('admin.html')
    if not path.exists():
        raise SystemExit('admin.html not found')

    html = path.read_text(encoding='utf-8')
    start = html.find('async function logout()')
    if start >= 0:
        brace = html.find('{', start)
        if brace < 0:
            raise SystemExit('inline admin.html logout body not found')

        depth = 0
        quote = None
        escape = False
        i = brace
        while i < len(html):
            ch = html[i]
            if quote:
                if escape:
                    escape = False
                elif ch == '\\':
                    escape = True
                elif ch == quote:
                    quote = None
            else:
                if ch in "'\"`":
                    quote = ch
                elif ch == '{':
                    depth += 1
                elif ch == '}':
                    depth -= 1
                    if depth == 0:
                        i += 1
                        break
            i += 1

        new_logout = '''async function logout(){
  const loginPage = document.getElementById("loginPage");
  const adminPage = document.getElementById("adminPage");

  // Never block the shell transition on Supabase network state.
  adminPage?.classList.add("hidden");
  loginPage?.classList.remove("hidden");
  loginPage?.removeAttribute("aria-hidden");

  state.session = null;
  state.user = null;
  state.staff = null;
  state.initialized = false;

  const form = document.getElementById("loginForm");
  if (form) form.reset();
  const password = document.getElementById("password");
  if (password) password.value = "";

  try {
    await Promise.race([
      supabase.auth.signOut(),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  } catch (error) {
    console.error("Logout error:", error);
  }

  adminPage?.classList.add("hidden");
  loginPage?.classList.remove("hidden");
}'''

        html = html[:start] + new_logout + html[i:]
        print('[AZAAD final logout] admin.html inline logout normalized')
    else:
        # The canonical Admin runtime may already have removed the legacy
        # inline controller. In that architecture admin.js owns logout.
        print('[AZAAD final logout] admin.html inline logout absent; admin.js is canonical owner')

    # Final production invariant: the canonical controller must remain an
    # executable external script after every preceding Admin transform. Some
    # earlier isolation stages intentionally convert optional scripts to inert
    # manifests; admin.js is never optional and must be restored last.
    script_re = re.compile(
        r'\s*<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>(?:\s*</script>)?\s*',
        re.I,
    )

    def remove_admin_script(match):
        src = match.group(1)
        path_name = (urlsplit(src).path or src).lstrip('/').lower()
        return '' if path_name == 'admin.js' else match.group(0)

    html = script_re.sub(remove_admin_script, html)
    canonical_tag = '<script type="module" src="/admin.js?v=2026-08-24-login-fix"></script>'
    if '</head>' not in html:
        raise SystemExit('admin.html head marker not found while restoring canonical admin.js')
    html = html.replace('</head>', canonical_tag + '\n</head>', 1)

    if html.count(canonical_tag) != 1:
        raise SystemExit('canonical admin.js reference was not restored exactly once')

    path.write_text(html, encoding='utf-8')
    print('[AZAAD final logout] admin.html canonical admin.js reference PASS')


patch_admin_js()
patch_admin_html()
print('[AZAAD final logout] PASS: canonical admin HTML and admin.js restore login shell before auth sign-out completes')
