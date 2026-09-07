from pathlib import Path
import re

PATH = Path('admin.js')
if not PATH.is_file():
    raise SystemExit('admin.js is required')

text = PATH.read_text(encoding='utf-8')


def bounds(src, name):
    m = re.search(rf'async function {re.escape(name)}\s*\([^)]*\)\s*\{{', src)
    if not m:
        raise SystemExit(f'{name}: canonical function missing')
    i = src.find('{', m.start())
    depth = 0
    quote = None
    escape = False
    line = block = False
    while i < len(src):
        c = src[i]
        n = src[i + 1] if i + 1 < len(src) else ''
        if line:
            if c == '\n': line = False
        elif block:
            if c == '*' and n == '/': block = False; i += 1
        elif quote:
            if escape: escape = False
            elif c == '\\': escape = True
            elif c == quote: quote = None
        elif c in "'\"`": quote = c
        elif c == '/' and n == '/': line = True; i += 1
        elif c == '/' and n == '*': block = True; i += 1
        elif c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return m.start(), i + 1
        i += 1
    raise SystemExit(f'{name}: unterminated function')


def replace_fn(src, name, replacement):
    return src[:bounds(src, name)[0]] + replacement + src[bounds(src, name)[1]:]

LOGIN = r'''async function login(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '');
  if (!cleanUsername) throw new Error('اسم المستخدم مطلوب.');
  if (!cleanPassword) throw new Error('كلمة المرور مطلوبة.');
  const response = await fetch('/api/admin-auth', { method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: cleanUsername, password: cleanPassword }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error === 'invalid_credentials' ? 'بيانات الدخول غير صحيحة.' : (result?.message || 'تعذر تسجيل الدخول.'));
  if (result?.provider !== 'appwrite' || !result?.authenticated || !result?.staff) throw new Error('جلسة Appwrite غير صالحة.');
  if (result.staff.active === false) throw new Error('حساب الموظف غير فعال.');
  if (!applyStaffRole(result.staff)) throw new Error('دور الموظف غير صالح.');
  state.session = Object.freeze({ provider: 'appwrite' });
  state.user = result.user || { id: result.staff.auth_user_id || null, email: result.staff.email || null };
  state.provider = 'appwrite';
  if (redirectDoctorIfNeeded()) return;
  await initializeApplication();
}'''

RESTORE = r'''async function restoreStaffProfile() {
  const retryDelays = [0, 150, 350]; let lastStatus = null;
  try {
    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (retryDelays[attempt]) await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      const response = await fetch('/api/admin-auth', { method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
      lastStatus = response.status;
      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        if (!result?.authenticated || result?.provider !== 'appwrite' || !result?.staff) return false;
        if (result.staff.active === false) return false;
        state.session = Object.freeze({ provider: 'appwrite' });
        state.user = result.user || { id: result.staff.auth_user_id || null, email: result.staff.email || null };
        state.provider = 'appwrite';
        return applyStaffRole(result.staff);
      }
      if (![401, 408, 429, 500, 502, 503, 504].includes(response.status)) return false;
    }
    console.warn('Appwrite session restore unavailable after bounded retries:', lastStatus);
    return false;
  } catch (error) { console.warn('Appwrite session restore failed:', error); return false; }
}'''

LOAD = r'''async function loadBookings() {
  if (!requirePermission("bookings.view")) return;
  if (state.loadingBookings) return;
  state.loadingBookings = true;
  try {
    if (!state.session || state.provider !== 'appwrite') throw new Error("جلسة الإدارة غير صالحة.");
    const response = await fetch("/api/admin-appointments?from=2000-01-01&to=2100-12-31&limit=500", { method: "GET", credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "تعذر تحميل الحجوزات التشغيلية.");
    state.bookings = Array.isArray(payload?.appointments) ? payload.appointments : [];
    renderBookings(); updateStatistics(); refreshCommandCenter();
    window.dispatchEvent(new CustomEvent("azaad:admin-bookings-updated"));
  } catch (error) {
    console.error("Booking loading error:", error);
    state.bookings = [];
    renderBookingFallback();
    window.dispatchEvent(new CustomEvent("azaad:admin-bookings-updated"));
  } finally { state.loadingBookings = false; }
}'''

for name, replacement in [('login', LOGIN), ('restoreStaffProfile', RESTORE), ('loadBookings', LOAD)]:
    if len(re.findall(rf'async function {re.escape(name)}\s*\(', text)) != 1:
        raise SystemExit(f'{name}: duplicate or missing canonical function')
    text = replace_fn(text, name, replacement)

# The Appwrite browser boundary is cookie-only. Any access-token requirement here is a regression.
text = re.sub(r"if\s*\(\s*!state\.session\?\.access_token\s*\)\s*throw new Error\([^;]+;", "if (!state.session || state.provider !== 'appwrite') throw new Error('جلسة الإدارة غير صالحة.');", text)
text = text.replace("session: Boolean(window.AZAAD?.state?.session?.access_token)", "session: Boolean(window.AZAAD?.state?.session)")

# Remove browser-level Supabase auth calls if a later transform reintroduced them.
for pattern in (r'\bsupabase\.auth\.', r'\bSUPABASE_(?:URL|PUBLISHABLE_KEY|ANON_KEY|SERVICE_ROLE_KEY)\b', r'functions/v1/staff-login'):
    if re.search(pattern, text):
        raise SystemExit(f'Appwrite browser session boundary regression: {pattern}')

PATH.write_text(text, encoding='utf-8')
print('Appwrite browser session contract finalized: HttpOnly cookie is the sole browser credential; no access token is required or sent.')
