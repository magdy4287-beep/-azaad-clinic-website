from pathlib import Path
import re
from urllib.parse import urlsplit

ADMIN = Path("admin.html")
ADMIN_JS = Path("admin.js")
if not ADMIN.exists(): raise SystemExit("admin.html missing")
if not ADMIN_JS.exists(): raise SystemExit("admin.js missing")

def bounds(source: str, marker: str):
    start = source.find(marker)
    if start < 0: return None
    brace = source.find("{", start)
    if brace < 0: return None
    depth=0; quote=None; escape=False; line_comment=False; block_comment=False; i=brace
    while i < len(source):
        ch=source[i]; nxt=source[i+1] if i+1 < len(source) else ""
        if line_comment:
            if ch=="\n": line_comment=False
            i+=1; continue
        if block_comment:
            if ch=="*" and nxt=="/": block_comment=False; i+=2; continue
            i+=1; continue
        if quote:
            if escape: escape=False
            elif ch=="\\": escape=True
            elif ch==quote: quote=None
            i+=1; continue
        if ch=="/" and nxt=="/": line_comment=True; i+=2; continue
        if ch=="/" and nxt=="*": block_comment=True; i+=2; continue
        if ch in "'\"`": quote=ch; i+=1; continue
        if ch=="{": depth+=1
        elif ch=="}":
            depth-=1
            if depth==0: return start,i+1
        i+=1
    return None

js = ADMIN_JS.read_text(encoding="utf-8")
login=bounds(js,"async function login(")
if not login: raise SystemExit("final Admin login() not found")
login_fn='''async function login(username, password) {
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanPassword = String(password || "");
  if (!cleanUsername) throw new Error("اسم المستخدم مطلوب.");
  if (!cleanPassword) throw new Error("كلمة المرور مطلوبة.");

  const response = await fetch(STAFF_LOGIN_FUNCTION, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ username: cleanUsername, password: cleanPassword })
  });

  let result = null;
  try {
    const responseText = await response.text();
    result = responseText ? JSON.parse(responseText) : null;
  } catch (_) {}

  if (!response.ok) throw new Error(result?.error || result?.message || "بيانات الدخول غير صحيحة.");
  if (!result?.session?.access_token || !result?.session?.refresh_token) throw new Error("تعذر إنشاء جلسة تسجيل الدخول.");
  if (!result?.staff) throw new Error("تم تسجيل الدخول ولكن لم يتم العثور على ملف الموظف.");
  if (result.staff.active === false) throw new Error("حساب الموظف غير فعال.");

  const role = String(result.staff.role || "").toUpperCase().trim();
  if (!ROLE_PERMISSIONS[role]) throw new Error("دور الموظف غير صالح.");

  state.session = result.session;
  state.user = result.user || result.session?.user || null;
  state.staff = result.staff;
  state.currentRole = role;
  state.permissions = new Set(ROLE_PERMISSIONS[role]);
  document.body.dataset.role = role;
  updateUserIdentity();

  if (redirectDoctorIfNeeded()) return;

  // Shell activation is the critical path. Supabase persistence is background work.
  void initializeApplication().catch(error => console.error("Admin initialization error:", error));
  void supabase.auth.setSession({
    access_token: result.session.access_token,
    refresh_token: result.session.refresh_token
  }).catch(error => console.error("Supabase client session persistence error:", error));
}
'''
js=js[:login[0]]+login_fn+js[login[1]:]

js=re.sub(r"!state\.session\s*\|\|\s*!state\.user\s*\|\|\s*!state\.staff\s*\|\|\s*!state\.currentRole","!state.session || !state.staff || !state.currentRole",js,count=1)
js=re.sub(r"(?m)^\s*bindTabs\(\);\s*\n?","",js)
js=re.sub(r"(?m)^\s*switchPanel\([^;]+;\s*\n?","",js)

for marker in ("function bindTabs()","function switchPanel(","async function restoreSession()"):
    if marker in js: raise SystemExit(f"Retired Admin symbol remains in final runtime: {marker}")
for symbol in (r"\bbindTabs\s*\(",r"\bswitchPanel\s*\(",r"\brestoreSession\s*\("):
    if re.search(symbol,js): raise SystemExit(f"Retired Admin invocation remains in final runtime: {symbol}")
if re.search(r"!state\.session\s*\|\|\s*!state\.user\s*\|\|",js): raise SystemExit("Optional Supabase user payload is still an Admin activation gate")
if re.search(r"await\s+supabase\.auth\.setSession",js): raise SystemExit("Blocking Supabase setSession remains in final Admin controller")
ADMIN_JS.write_text(js,encoding="utf-8")

text=ADMIN.read_text(encoding="utf-8")
script_re=re.compile(r'<script\b([^>]*)>(?:\s*</script>)?\s*',re.I|re.S)
attr_re=re.compile(r'\bdata-azaad-after-auth-src\s*=\s*(["\'])(.*?)\1',re.I|re.S)
src_re=re.compile(r'(?<![-\w])src\s*=\s*(?:(["\'])(.*?)\1|([^\s>]+))',re.I|re.S)
core_re=re.compile(r'\s*<script\b[^>]*\bsrc=["\'][^"\']*/azaad-core-context\.js(?:\?[^"\']*)?["\'][^>]*>\s*</script>\s*',re.I)
text=core_re.sub("\n",text)
if "</head>" not in text: raise SystemExit("admin.html has no </head>")
text=text.replace("</head>",'<script src="/azaad-core-context.js?v=1.1.0"></script>\n</head>',1)
seen=set(); removed=0
def dedupe(match):
    global removed
    attrs=match.group(1); found=attr_re.search(attrs)
    if not found: return match.group(0)
    src=found.group(2); p=(urlsplit(src).path or src).lstrip("/").lower()
    if p not in seen: seen.add(p); return match.group(0)
    removed+=1; return "\n"
text=script_re.sub(dedupe,text)

shell_executable=shell_after_auth=core_executable=core_after_auth=0
for match in script_re.finditer(text):
    attrs=match.group(1); sm=src_re.search(attrs); am=attr_re.search(attrs)
    if sm:
        src=sm.group(2) if sm.group(2) is not None else sm.group(3); p=(urlsplit(src).path or src).lstrip("/").lower()
        if p=="admin-shell.js": shell_executable+=1
        if p=="azaad-core-context.js": core_executable+=1
    if am:
        p=(urlsplit(am.group(2)).path or am.group(2)).lstrip("/").lower()
        if p=="admin-shell.js": shell_after_auth+=1
        if p=="azaad-core-context.js": core_after_auth+=1
if shell_executable!=1 or shell_after_auth!=0: raise SystemExit(f"canonical Admin shell must be exactly one executable pre-auth entry (executable={shell_executable}, after_auth={shell_after_auth})")
if core_executable!=1 or core_after_auth!=0: raise SystemExit(f"canonical Cairo core context must be exactly one executable pre-auth entry (executable={core_executable}, after_auth={core_after_auth})")
ADMIN.write_text(text,encoding="utf-8")
print(f"[AZAAD runtime manifest] PASS: final nonblocking staff-login owner + canonical shell/core; removed {removed} duplicate post-auth references")
