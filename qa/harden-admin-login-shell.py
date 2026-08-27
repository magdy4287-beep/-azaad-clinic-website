"""Harden the canonical Admin login shell while keeping the canonical auth/data core available pre-auth."""
from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
if not ADMIN.exists(): raise SystemExit("admin.html not found")
text = ADMIN.read_text(encoding="utf-8")
script_pattern = re.compile(r'\s*<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>\s*</script>\s*', re.I)
def remove_retired_guard(match):
    path=(urlsplit(match.group(1)).path or match.group(1)).lstrip('/').lower()
    return "" if path == "admin-auth-ui-guard.js" else match.group(0)
text=script_pattern.sub(remove_retired_guard,text)
form_pattern=re.compile(r'(<form\b[^>]*\bid=["\']loginForm["\'][^>]*)(>)',re.I)
match=form_pattern.search(text)
if not match: raise SystemExit("canonical #loginForm not found")
opening=match.group(1)
if not re.search(r'\bonsubmit\s*=',opening,re.I): opening=opening.rstrip()+' onsubmit="event.preventDefault();"'
else: opening=re.sub(r'\bonsubmit\s*=\s*(["\']).*?\1',' onsubmit="event.preventDefault();"',opening,count=1,flags=re.I|re.S)
text=text[:match.start(1)]+opening+match.group(2)+text[match.end(2):]
def defer_source(source_name):
    pattern=re.compile(r'<script\b([^>]*\bsrc=["\'](?:/)?'+re.escape(source_name)+r'(?:\?[^"\']*)?["\'][^>]*)></script>',re.I)
    def add_defer(m):
        attrs=m.group(1)
        return m.group(0) if re.search(r'\bdefer(?:\s*=|\b)',attrs,re.I) else '<script'+attrs.rstrip()+' defer></script>'
    return pattern.sub(add_defer,text)
text=defer_source('central-i18n.js'); text=defer_source('azaad-core-context.js')
body_match=re.search(r'<body\b[^>]*>(.*)</body>',text,re.I|re.S)
if not body_match: raise SystemExit("body element not found")
body=body_match.group(1)
external_script=re.compile(r'<script\b([^>]*\bsrc=["\']([^"\']+)["\'][^>]*)></script>',re.I)
def isolate_body_script(match):
    attrs=match.group(1); src=match.group(2); path=(urlsplit(src).path or src).lstrip('/').lower()
    # The canonical admin.js owns authentication and admin data. It must execute
    # pre-auth so it can bind #loginForm; feature/data runtimes remain post-auth.
    if path in ('azaad-role-experience.js', 'admin.js'):
        return '<script'+attrs+'></script>'
    return '<script data-azaad-after-auth-src="'+src.replace('"','&quot;')+'"></script>'
body=external_script.sub(isolate_body_script,body)
loader=r'''<script>
(function () {
  'use strict';
  if (window.__AZAAD_POST_AUTH_RUNTIME_LOADER__) return;
  window.__AZAAD_POST_AUTH_RUNTIME_LOADER__ = true;
  function activate() {
    var login=document.getElementById('loginPage');
    if(!login||!login.classList.contains('hidden')) return false;
    document.querySelectorAll('script[data-azaad-after-auth-src]').forEach(function (placeholder) {
      var src=placeholder.getAttribute('data-azaad-after-auth-src');
      if(!src||document.querySelector('script[src="'+CSS.escape(src)+'"]')){placeholder.remove();return;}
      var script=document.createElement('script'); script.src=src; script.defer=true; script.setAttribute('data-azaad-post-auth-runtime','1'); placeholder.replaceWith(script);
    });
    return true;
  }
  var observer=new MutationObserver(function(){if(activate()) observer.disconnect();});
  observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
  if(document.readyState!=='loading') activate(); else document.addEventListener('DOMContentLoaded',activate,{once:true});
})();
</script>'''
text=text[:body_match.start(1)]+body+loader+text[body_match.end(1):]
if len(re.findall(r'<form\b[^>]*\bid=["\']loginForm["\']',text,re.I))!=1: raise SystemExit("canonical login form count is not exactly one")
if 'admin-auth-ui-guard.js' in text: raise SystemExit("retired admin-auth-ui-guard.js remains in admin.html")
if not re.search(r'<form\b[^>]*\bid=["\']loginForm["\'][^>]*\bonsubmit=["\']event\.preventDefault\(\);["\']',text,re.I): raise SystemExit("login form native-navigation guard was not established")
# Pre-auth executable external scripts are limited to the canonical control-plane
# role navigation and the canonical auth/data core. Feature runtimes remain lazy.
for m in re.finditer(r'<body\b[^>]*>(.*?)</body>',text,re.I|re.S):
    executable=[x for x in re.findall(r'<script\b([^>]*)\bsrc=["\']([^"\']+)["\'][^>]*>',m.group(1),re.I) if (urlsplit(x[1]).path or x[1]).lstrip('/').lower() not in ('azaad-role-experience.js','admin.js')]
    if executable: raise SystemExit("non-canonical pre-auth external runtime still executes on initial Admin login path")
if 'data-azaad-after-auth-src=' not in text: raise SystemExit("post-auth runtime isolation was not established")
ADMIN.write_text(text,encoding="utf-8")
print("[AZAAD] Admin login isolated with one canonical auth/data owner; feature runtimes remain post-auth")