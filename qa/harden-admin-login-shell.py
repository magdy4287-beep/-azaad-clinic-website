"""Harden the canonical Admin login shell against pre-module navigation and
keep non-auth runtimes completely off the login critical path.

Authentication remains exclusively owned by admin.js. This transform only
protects the login shell; it does not validate credentials, create sessions,
or redirect.
"""
from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
if not ADMIN.exists():
    raise SystemExit("admin.html not found")

text = ADMIN.read_text(encoding="utf-8")

script_pattern = re.compile(
    r'\s*<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>\s*</script>\s*',
    re.I,
)

def remove_retired_guard(match):
    path = (urlsplit(match.group(1)).path or match.group(1)).lstrip('/').lower()
    return "" if path == "admin-auth-ui-guard.js" else match.group(0)

text = script_pattern.sub(remove_retired_guard, text)

form_pattern = re.compile(r'(<form\b[^>]*\bid=["\']loginForm["\'][^>]*)(>)', re.I)
match = form_pattern.search(text)
if not match:
    raise SystemExit("canonical #loginForm not found")

opening = match.group(1)
if not re.search(r'\bonsubmit\s*=', opening, re.I):
    opening = opening.rstrip() + ' onsubmit="event.preventDefault();"'
    text = text[:match.start(1)] + opening + match.group(2) + text[match.end(2):]
else:
    text = text[:match.start(1)] + re.sub(
        r'\bonsubmit\s*=\s*(["\']).*?\1',
        ' onsubmit="event.preventDefault();"',
        opening,
        count=1,
        flags=re.I | re.S,
    ) + match.group(2) + text[match.end(2):]

# These global runtimes are not needed to make Username/Password editable.
# Defer them so the browser can paint and accept input immediately.
def defer_source(source_name):
    pattern = re.compile(
        r'<script\b([^>]*\bsrc=["\'](?:/)?' + re.escape(source_name) + r'(?:\?[^"\']*)?["\'][^>]*)></script>',
        re.I,
    )
    def add_defer(match):
        attrs = match.group(1)
        if re.search(r'\bdefer(?:\s*=|\b)', attrs, re.I):
            return match.group(0)
        return '<script' + attrs.rstrip() + ' defer></script>'
    return pattern.sub(add_defer, text)

text = defer_source('central-i18n.js')
text = defer_source('azaad-core-context.js')

# Strong isolation: post-auth feature runtimes must not execute at all while
# the login screen is visible. Merely adding `defer` is insufficient because a
# large deferred graph can still monopolize the main thread before interaction.
# Convert body external scripts into inert data attributes and activate them
# only after admin.js has hidden #loginPage. Existing lazy loaders remain the
# owners of their feature modules and duplicate loads are prevented by src check.
body_match = re.search(r'<body\b[^>]*>(.*)</body>', text, re.I | re.S)
if not body_match:
    raise SystemExit("body element not found")

body = body_match.group(1)
external_script = re.compile(r'<script\b([^>]*\bsrc=["\']([^"\']+)["\'][^>]*)></script>', re.I)

def isolate_body_script(match):
    attrs = match.group(1)
    src = match.group(2)
    if not src:
        return match.group(0)
    return '<script data-azaad-after-auth-src="' + src.replace('"', '&quot;') + '"></script>'

body = external_script.sub(isolate_body_script, body)

loader = r'''<script>
(function () {
  'use strict';
  if (window.__AZAAD_POST_AUTH_RUNTIME_LOADER__) return;
  window.__AZAAD_POST_AUTH_RUNTIME_LOADER__ = true;

  function activate() {
    var login = document.getElementById('loginPage');
    if (!login || !login.classList.contains('hidden')) return false;

    document.querySelectorAll('script[data-azaad-after-auth-src]').forEach(function (placeholder) {
      var src = placeholder.getAttribute('data-azaad-after-auth-src');
      if (!src || document.querySelector('script[src="' + CSS.escape(src) + '"]')) {
        placeholder.remove();
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.setAttribute('data-azaad-post-auth-runtime', '1');
      placeholder.replaceWith(script);
    });
    return true;
  }

  var observer = new MutationObserver(function () {
    if (activate()) observer.disconnect();
  });
  observer.observe(document.documentElement, {subtree: true, attributes: true, attributeFilter: ['class']});
  if (document.readyState !== 'loading') activate();
  else document.addEventListener('DOMContentLoaded', activate, {once: true});
})();
</script>'''

text = text[:body_match.start(1)] + body + loader + text[body_match.end(1):]

# Fail closed.
if len(re.findall(r'<form\b[^>]*\bid=["\']loginForm["\']', text, re.I)) != 1:
    raise SystemExit("canonical login form count is not exactly one")
if 'admin-auth-ui-guard.js' in text:
    raise SystemExit("retired admin-auth-ui-guard.js remains in admin.html")
if not re.search(r'<form\b[^>]*\bid=["\']loginForm["\'][^>]*\bonsubmit=["\']event\.preventDefault\(\);["\']', text, re.I):
    raise SystemExit("login form native-navigation guard was not established")
if re.search(r'<body\b[^>]*>.*?<script\b[^>]*\bsrc=', text, re.I | re.S):
    raise SystemExit("post-auth external script still executes on initial Admin login path")
if 'data-azaad-after-auth-src=' not in text:
    raise SystemExit("post-auth runtime isolation was not established")

ADMIN.write_text(text, encoding="utf-8")
print("[AZAAD] Admin login isolated: only canonical auth runtime executes before login; post-auth runtimes are inert until authentication")