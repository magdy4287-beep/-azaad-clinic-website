from pathlib import Path
import re

path = Path("admin.js")
if not path.is_file():
    raise SystemExit("admin.js is required")

text = path.read_text(encoding="utf-8")

old_date = '''function todayISO() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}'''
new_date = '''function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}'''
if old_date in text:
    text = text.replace(old_date, new_date, 1)

load_pattern = re.compile(
    r"async function loadBookings\(\)\s*\{.*?\n\}\n\n/\* ============================================================\n\s*STATUS",
    re.S,
)
load_replacement = '''async function loadBookings() {
  if (!requirePermission("bookings.view")) return;
  if (state.loadingBookings) return;
  state.loadingBookings = true;

  try {
    if (!state.session?.access_token) throw new Error("جلسة الإدارة غير صالحة.");

    const response = await fetch(
      "/api/admin-appointments?from=2000-01-01&to=2100-12-31&limit=500",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${state.session.access_token}`,
          Accept: "application/json"
        }
      }
    );

    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok) throw new Error(payload?.error || "تعذر تحميل الحجوزات التشغيلية.");

    state.bookings = Array.isArray(payload?.appointments) ? payload.appointments : [];
    renderBookings();
    updateStatistics();
    refreshCommandCenter();
  } catch (error) {
    console.error("Booking loading error:", error);
    state.bookings = [];
    renderBookingFallback();
  } finally {
    state.loadingBookings = false;
  }
}

/* ============================================================
   STATUS'''
if not load_pattern.search(text):
    raise SystemExit("Canonical loadBookings function not found; refusing unsafe rewrite")
text = load_pattern.sub(load_replacement, text, count=1)
path.write_text(text, encoding="utf-8")
print("finalize-admin-operational-data.py completed canonical Neon/Appwrite backend boundary rewrite")
