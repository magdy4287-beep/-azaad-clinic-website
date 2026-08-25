/* ============================================================
   AZAAD CLINIC
   ADMIN CONTROL CENTER
   Production Admin Controller
   Supabase Auth + RLS
   Username Login through staff-login Edge Function
   ============================================================ */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://derofsthjivlkcdnojww.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa";
const STAFF_LOGIN_FUNCTION = `${SUPABASE_URL}/functions/v1/staff-login`;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const WEBSITE_URL = "https://magdy4287-beep.github.io/-azaad-clinic-website/";
const WEBSITE_MESSAGE = `🏥 عيادة أزاد للصحة النفسية\n\n📅 لحجز موعد يمكنك الدخول من هنا:\n\n${WEBSITE_URL}`;

const state = {
  session: null,
  user: null,
  staff: null,
  bookings: [],
  currentRole: null,
  permissions: new Set(),
  initialized: false,
  loadingBookings: false,
  initializing: false
};

const ROLE_PERMISSIONS = {
  OWNER: ["dashboard.view","bookings.view","patients.view","followups.view","marketing.view","finance.view","staff.view"],
  ADMIN: ["dashboard.view","bookings.view","patients.view","followups.view","marketing.view","finance.view","staff.view"],
  MANAGER: ["dashboard.view","bookings.view","patients.view","followups.view","marketing.view","finance.view","staff.view"],
  SECRETARY: ["dashboard.view","bookings.view","patients.view","followups.view"],
  RECEPTION: ["dashboard.view","bookings.view","patients.view","followups.view"],
  CASHIER: ["dashboard.view","finance.view"],
  DOCTOR: ["dashboard.view","bookings.view","patients.view","followups.view"],
  MARKETING: ["dashboard.view","marketing.view"]
};

const $ = id => document.getElementById(id);
const firstElement = (...ids) => ids.map(id => $(id)).find(Boolean) || null;

const escapeHTML = value => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
}

function formatDate(value) {
  if (!value) return "-";
  try { return new Date(`${value}T00:00:00`).toLocaleDateString("ar-EG", {year:"numeric",month:"short",day:"numeric"}); }
  catch { return value; }
}

function formatTime(value) {
  if (!value) return "-";
  const raw = String(value).trim().slice(0,5);
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return escapeHTML(value);
  let hour = Number(match[1]);
  const minute = match[2];
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return escapeHTML(value);
  const suffix = hour < 12 ? "AM" : "PM";
  let displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function normalizePhone(phone) {
  if (!phone) return "";
  let value = String(phone).trim().replace(/[^\d+]/g, "");
  if (value.startsWith("00")) value = "+" + value.slice(2);
  if (value.startsWith("01") && value.length === 11) value = "+20" + value.slice(1);
  return value.replace(/^\+/, "").replace(/\s/g, "");
}

function whatsappURL(phone, message = "") {
  const normalized = normalizePhone(phone);
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : "#";
}

function showToast(message, type = "info") {
  let toast = $("adminToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "adminToast";
    toast.className = "toast";
    toast.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:99999;max-width:420px;padding:14px 18px;border-radius:12px;color:#fff;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.2);opacity:0;transform:translateY(15px);transition:.25s ease;pointer-events:none";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === "error" ? "#a32939" : type === "success" ? "#167345" : "#17214f";
  requestAnimationFrame(() => { toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; });
  clearTimeout(window.__AZAAD_TOAST_TIMER);
  window.__AZAAD_TOAST_TIMER = setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(15px)"; }, 3500);
}

/* Never let a backend request block the Admin UI indefinitely. */
async function safeQuery(query, timeoutMs = 8000) {
  try {
    return await Promise.race([
      query,
      new Promise(resolve => setTimeout(() => resolve({ data: null, error: new Error("REQUEST_TIMEOUT") }), timeoutMs))
    ]);
  } catch (error) {
    console.error("Supabase query error:", error);
    return { data: null, error };
  }
}

function hasPermission(permission) { return state.permissions.has(permission); }
function requirePermission(permission) {
  if (hasPermission(permission)) return true;
  showToast("⛔ ليس لديك صلاحية لتنفيذ هذا الإجراء.", "error");
  return false;
}

function applyStaffRole(staff) {
  if (!staff) return false;
  const role = String(staff.role || "").toUpperCase().trim();
  if (!ROLE_PERMISSIONS[role] || staff.active === false) return false;
  state.staff = staff;
  state.currentRole = role;
  state.permissions = new Set(ROLE_PERMISSIONS[role]);
  document.body.dataset.role = role;
  updateUserIdentity();
  return true;
}

function redirectDoctorIfNeeded() {
  const role = String(state.currentRole || state.staff?.role || "").toUpperCase().trim();
  if (role !== "DOCTOR") return false;
  const target = "doctor-dashboard.html";
  if (!window.location.pathname.endsWith("/" + target)) window.location.replace(target);
  return true;
}

async function login(username, password) {
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
  try { result = await response.json(); } catch { result = null; }
  if (!response.ok) throw new Error(result?.error || result?.message || "بيانات الدخول غير صحيحة.");
  if (!result?.session?.access_token || !result?.session?.refresh_token) throw new Error("تعذر إنشاء جلسة تسجيل الدخول.");
  if (!result?.staff) throw new Error("تم تسجيل الدخول ولكن لم يتم العثور على ملف الموظف.");
  if (!applyStaffRole(result.staff)) throw new Error("دور الموظف غير صالح.");

  const { error } = await supabase.auth.setSession({ access_token: result.session.access_token, refresh_token: result.session.refresh_token });
  if (error) throw error;
  const sessionResult = await supabase.auth.getSession();
  state.session = sessionResult.data?.session || result.session;
  state.user = state.session?.user || result.user || null;
  applyStaffRole(result.staff);
  if (redirectDoctorIfNeeded()) return;
  await initializeApplication();
}

async function logout() {
  state.initialized = false;
  state.session = null;
  state.user = null;
  state.staff = null;
  state.currentRole = null;
  state.permissions = new Set();
  try { await Promise.race([supabase.auth.signOut(), new Promise(resolve => setTimeout(resolve, 3000))]); } catch (error) { console.error("Logout error:", error); }
  window.location.replace("/admin.html");
}

async function restoreSession() {
  let sessionResult;
  try { sessionResult = await supabase.auth.getSession(); } catch (error) { console.error("Session restore error:", error); return false; }
  const session = sessionResult?.data?.session || null;
  if (!session?.access_token || !session?.user?.id) return false;
  state.session = session;
  state.user = session.user;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const validStaff = await restoreStaffProfile();
    if (validStaff) {
      if (redirectDoctorIfNeeded()) return true;
      await initializeApplication();
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 400));
  }
  console.warn("Staff profile could not be restored during startup.");
  return false;
}

async function restoreStaffProfile() {
  if (!state.user?.id) return false;
  const result = await safeQuery(supabase.from("clinic_staff").select("id,auth_user_id,full_name,username,email,phone,role,active").eq("auth_user_id", state.user.id).maybeSingle());
  if (result.error || !result.data) { console.error("Staff lookup error:", result.error); return false; }
  if (result.data.active === false) return false;
  return applyStaffRole(result.data);
}

async function initializeApplication() {
  if (state.initialized || state.initializing) return;
  if (!state.session || !state.user || !state.staff || !state.currentRole) return;
  state.initializing = true;

  const loginPage = $("loginPage");
  const adminPage = $("adminPage");
  if (loginPage) loginPage.classList.add("hidden");
  if (adminPage) adminPage.classList.remove("hidden");

  /* Bind all local UI controls before any network work. */
  updateUserIdentity();
  bindTabs();
  bindBookingFilters();
  bindLogout();
  bindPatientPage();
  state.initialized = true;
  state.initializing = false;

  /* Data is explicitly non-critical to UI interactivity. */
  void loadBookings();
  void loadAfterAuthRuntimes();
  buildCommandCenter();
  if (window.AZAAD_STAFF && typeof window.AZAAD_STAFF.init === "function") {
    Promise.resolve(window.AZAAD_STAFF.init()).catch(error => console.error("Staff management init error:", error));
  }
  showToast(`🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`, "success");
}

function updateUserIdentity() {
  if (!state.user && !state.staff) return;
  let identity = $("adminIdentity");
  if (!identity) {
    identity = document.createElement("div");
    identity.id = "adminIdentity";
    identity.style.cssText = "margin-top:6px;font-size:13px;color:#6c758c;font-weight:700;line-height:1.7";
    const topbar = document.querySelector(".topbar");
    if (topbar) (topbar.firstElementChild || topbar).appendChild(identity);
  }
  const name = state.staff?.full_name || state.staff?.username || state.user?.email || "موظف";
  const username = state.staff?.username || "";
  const role = state.currentRole || "";
  identity.innerHTML = `👤 ${escapeHTML(name)}${username ? `<br>🔑 ${escapeHTML(username)}` : ""}${role ? `<br>🎯 ${escapeHTML(role)}` : ""}`;
}

async function loadBookings() {
  if (!requirePermission("bookings.view") || state.loadingBookings) return;
  state.loadingBookings = true;
  try {
    const result = await safeQuery(supabase.from("clinic_bookings").select("id,booking_code,patient_name,patient_phone,appointment_date,appointment_time,status,mode,doctor_id,service_id").order("appointment_date", {ascending:false}).order("appointment_time", {ascending:true}).limit(500));
    if (result.error) { console.error("Booking loading error:", result.error); state.bookings = []; renderBookingFallback(); return; }
    state.bookings = Array.isArray(result.data) ? result.data : [];
    renderBookings(); updateStatistics(); refreshCommandCenter();
  } finally { state.loadingBookings = false; }
}

function normalizeStatus(value) { return String(value || "").trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_"); }
function statusLabel(value) { const labels = {pending:"🟡 قيد المراجعة",confirmed:"🟢 مؤكد",completed:"✅ مكتمل",attended:"🟢 حضر",cancelled:"❌ ملغي",no_show:"🔴 No-Show",rescheduled:"🔄 أعيدت الجدولة"}; return labels[normalizeStatus(value)] || escapeHTML(value || "غير محدد"); }
function statusClass(value) { const s = normalizeStatus(value); if (["confirmed","completed","attended"].includes(s)) return "badge-confirmed"; if (["cancelled","no_show"].includes(s)) return "badge-cancelled"; if (s === "pending") return "badge-pending"; return "badge-draft"; }
function getBookingContainer() { return firstElement("bookingTable","bookingsTable","bookings"); }
function getBookingSearchValue() { return (firstElement("search","bookingSearch")?.value || "").trim().toLowerCase(); }
function getBookingStatusValue() { return (firstElement("statusFilter","bookingStatus")?.value || "").trim().toLowerCase(); }
function renderBookings() {
  const container = getBookingContainer(); if (!container) return;
  const search = getBookingSearchValue(); const statusFilter = getBookingStatusValue();
  const filtered = state.bookings.filter(booking => {
    const searchable = [booking.booking_code,booking.patient_name,booking.patient_phone].filter(Boolean).join(" ").toLowerCase();
    return (!search || searchable.includes(search)) && (!statusFilter || normalizeStatus(booking.status) === normalizeStatus(statusFilter));
  });
  if (!filtered.length) { container.innerHTML = '<div class="empty">📭 لا توجد حجوزات مطابقة.</div>'; return; }
  const rows = filtered.map(renderBookingRow).join("");
  container.innerHTML = `<div class="table-wrap"><table><thead><tr><th>🔖 الحجز</th><th>🤢 المريض</th><th>📱 الهاتف</th><th>📅 التاريخ</th><th>⏰ الوقت</th><th>🚦 الحالة</th><th>📱 التواصل</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function renderBookingRow(booking) {
  const message = `مرحبًا ${booking.patient_name || ""}، معك عيادة أزاد للصحة النفسية. نود التواصل معكم بخصوص موعدكم.`;
  const wa = whatsappURL(booking.patient_phone, message);
  return `<tr><td><strong>${escapeHTML(booking.booking_code || "-")}</strong></td><td>${escapeHTML(booking.patient_name || "-")}</td><td dir="ltr">${escapeHTML(booking.patient_phone || "-")}</td><td>${formatDate(booking.appointment_date)}</td><td><strong>${formatTime(booking.appointment_time)}</strong></td><td><span class="badge ${statusClass(booking.status)}">${statusLabel(booking.status)}</span></td><td>${booking.patient_phone ? `<a href="${escapeHTML(wa)}" target="_blank" rel="noopener noreferrer" class="btn btn-success" style="text-decoration:none;">📱 WhatsApp</a>` : '<span class="muted">لا يوجد هاتف</span>'}</td></tr>`;
}
function renderBookingFallback() { const container = getBookingContainer(); if (container) container.innerHTML = '<div class="error">⚠️ تعذر تحميل الحجوزات. تحقق من جلسة الدخول وصلاحيات RLS.</div>'; }
function updateStatistics() {
  const bookings = state.bookings; const total = bookings.length;
  const pending = bookings.filter(b => normalizeStatus(b.status) === "pending").length;
  const confirmed = bookings.filter(b => normalizeStatus(b.status) === "confirmed").length;
  const today = bookings.filter(b => b.appointment_date === todayISO()).length;
  $("total") && ($("total").textContent = total); $("pending") && ($("pending").textContent = pending); $("confirmed") && ($("confirmed").textContent = confirmed); $("today") && ($("today").textContent = today);
}

function bindTabs() { document.querySelectorAll(".tab").forEach(tab => { if (tab.dataset.azaadBound === "true") return; tab.dataset.azaadBound = "true"; tab.addEventListener("click", () => switchPanel(tab.dataset.panel)); }); }
function switchPanel(panelId) { const panel = $(panelId); if (!panel) return; document.querySelectorAll(".panel").forEach(e => e.classList.remove("active")); panel.classList.add("active"); document.querySelectorAll(".tab").forEach(tab => tab.classList.toggle("active", tab.dataset.panel === panelId)); window.scrollTo({top:0,behavior:"smooth"}); }
function bindBookingFilters() { const search = firstElement("search","bookingSearch"); const status = firstElement("statusFilter","bookingStatus"); const refresh = firstElement("refreshBookings","refreshBtn"); search?.addEventListener("input", renderBookings); status?.addEventListener("change", renderBookings); refresh?.addEventListener("click", async () => { await loadBookings(); showToast("🔄 تم تحديث الحجوزات.","success"); }); }
function bindPatientPage() { firstElement("patientPageBtn")?.addEventListener("click", () => { window.location.href = "./index.html"; }); }
function bindLogout() { const button = firstElement("logoutBtn"); if (!button || button.dataset.azaadBound === "true") return; button.dataset.azaadBound = "true"; button.addEventListener("click", async () => { if (!window.confirm("هل تريد تسجيل الخروج من لوحة الإدارة؟")) return; await logout(); }); }

function bindLogin() {
  const form = $("loginForm"); if (!form || form.dataset.azaadBound === "true") return; form.dataset.azaadBound = "true";
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const username = $("username")?.value?.trim().toLowerCase(); const password = $("password")?.value || ""; const errorBox = $("loginError"); const submitButton = event.submitter || form.querySelector('button[type="submit"]');
    if (errorBox) { errorBox.textContent = ""; errorBox.classList.add("hidden"); }
    if (!username || !password) { if (errorBox) { errorBox.textContent = "يرجى إدخال Username وكلمة المرور."; errorBox.classList.remove("hidden"); } return; }
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) { if (errorBox) { errorBox.textContent = "Username يجب أن يحتوي على أحرف إنجليزية صغيرة أو أرقام أو . _ - فقط."; errorBox.classList.remove("hidden"); } return; }
    const originalText = submitButton?.textContent || "تسجيل الدخول";
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = "⏳ جاري تسجيل الدخول..."; }
    try { await login(username, password); }
    catch (error) { console.error("Login error:", error); if (errorBox) { errorBox.textContent = error?.message || "بيانات الدخول غير صحيحة أو لا يوجد حساب فعال."; errorBox.classList.remove("hidden"); } showToast(error?.message || "❌ تعذر تسجيل الدخول.","error"); }
    finally { if (submitButton && !state.session) { submitButton.disabled = false; submitButton.textContent = originalText; } }
  });
}

async function loadAfterAuthRuntimes() {
  if (window.__AZAAD_AFTER_AUTH_RUNTIMES_LOADED) return;
  window.__AZAAD_AFTER_AUTH_RUNTIMES_LOADED = true;
  const manifests = Array.from(document.querySelectorAll("script[data-azaad-after-auth-src]"));
  for (const manifest of manifests) {
    const src = manifest.dataset.azaadAfterAuthSrc; if (!src) continue;
    try {
      await new Promise(resolve => {
        const script = document.createElement("script"); script.src = src;
        if (manifest.dataset.azaadAfterAuthType === "module") script.type = "module";
        script.onload = resolve; script.onerror = () => resolve(); document.body.appendChild(script);
      });
    } catch (error) { console.error("Post-auth runtime error:",src,error); }
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session) { state.session = session; state.user = session.user; if (!state.initialized && !state.initializing) void restoreStaffProfile().then(valid => valid && initializeApplication()).catch(console.error); }
  if (event === "TOKEN_REFRESHED") { state.session = session; state.user = session?.user || null; }
  if (event === "SIGNED_OUT") { state.session = null; state.user = null; state.staff = null; state.currentRole = null; state.permissions = new Set(); state.initialized = false; }
});

window.AZAAD = { supabase, state, refresh: loadBookings, logout, hasPermission, formatTime, formatDate };

document.addEventListener("DOMContentLoaded", async () => {
  bindLogin(); bindLogout(); bindTabs(); bindBookingFilters(); bindPatientPage();
  try { await restoreSession(); } catch (error) { console.error("Application startup error:",error); showToast(error?.message || "تعذر استعادة جلسة الدخول.","error"); }
});
