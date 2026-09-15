/* ============================================================
   AZAAD CLINIC
   ADMIN CONTROL CENTER
   File: admin.js

   Production Admin Controller
   Appwrite session + API boundaries
   Username/password login through the Admin Auth API

   IMPORTANT
   ------------------------------------------------------------
   - Authentication is handled by the Appwrite-backed Admin Auth API.
   - Browser sessions use the server-owned HttpOnly session cookie.
   - clinic_staff uses "active", NOT "is_active".
   - Authenticated session alone is NOT sufficient.
   - Active clinic_staff record + valid role are required.
   - Time is displayed using 12-hour format.
   ============================================================ */

/* ============================================================
   APPWRITE / API BOUNDARIES
   ============================================================ */
/* ============================================================
   WEBSITE
   ============================================================ */

const WEBSITE_URL =
  "https://magdy4287-beep.github.io/-azaad-clinic-website/";

const WEBSITE_MESSAGE =
  `🏥 عيادة أزاد للصحة النفسية

📅 لحجز موعد يمكنك الدخول من هنا:

${WEBSITE_URL}`;

/* ============================================================
   STATE
   ============================================================ */

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

/* ============================================================
   ROLE PERMISSIONS
   ============================================================ */

const ROLE_PERMISSIONS = {
  OWNER: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
    "marketing.view",
    "finance.view",
    "staff.view",
  ],

  ADMIN: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
    "marketing.view",
    "finance.view",
    "staff.view",
  ],

  MANAGER: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
    "marketing.view",
    "finance.view",
    "staff.view",
  ],

  SECRETARY: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view"
  ],

  RECEPTION: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
  ],

  CASHIER: [
    "dashboard.view",
    "finance.view",
  ],

  DOCTOR: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
  ],

  MARKETING: [
    "dashboard.view",
    "marketing.view",
  ]
};

/* ============================================================
   DOM HELPERS
   ============================================================ */

const $ = id =>
  document.getElementById(id);

const firstElement = (...ids) => {
  for (const id of ids) {
    const element = $(id);

    if (element) {
      return element;
    }
  }

  return null;
};

const escapeHTML = value => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

/* ============================================================
   DATE
   ============================================================ */

function todayISO() {
  const canonical = window.AZAAD_CORE_CONTEXT?.todayISO;

  if (typeof canonical !== "function") {
    throw new Error("AZAAD_CORE_CONTEXT.todayISO is required for Admin business dates.");
  }

  return canonical();
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString(
      "ar-EG",
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );
  } catch {
    return value;
  }
}

/* ============================================================
   12-HOUR TIME
   ============================================================ */

function formatTime(value) {
  if (!value) {
    return "-";
  }

  const raw =
    String(value)
      .trim()
      .slice(0, 5);

  const match =
    raw.match(
      /^(\d{1,2}):(\d{2})$/
    );

  if (!match) {
    return escapeHTML(value);
  }

  let hour =
    Number(match[1]);

  const minute =
    match[2];

  if (
    Number.isNaN(hour) ||
    hour < 0 ||
    hour > 23
  ) {
    return escapeHTML(value);
  }

  const suffix =
    hour < 12
      ? "AM"
      : "PM";

  let displayHour =
    hour % 12;

  if (
    displayHour === 0
  ) {
    displayHour = 12;
  }

  return `${displayHour}:${minute} ${suffix}`;
}

/* ============================================================
   PHONE
   ============================================================ */

function normalizePhone(phone) {
  if (!phone) {
    return "";
  }

  let value =
    String(phone)
      .trim()
      .replace(/[^\d+]/g, "");

  if (
    value.startsWith("00")
  ) {
    value =
      "+" +
      value.slice(2);
  }

  if (
    value.startsWith("01") &&
    value.length === 11
  ) {
    value =
      "+20" +
      value.slice(1);
  }

  value =
    value.replace(
      /^\+/,
      ""
    );

  return value.replace(
    /\s/g,
    ""
  );
}

function whatsappURL(
  phone,
  message = ""
) {
  const normalized =
    normalizePhone(phone);

  if (!normalized) {
    return "#";
  }

  return (
    `https://wa.me/${normalized}` +
    `?text=${encodeURIComponent(
      message
    )}`
  );
}

/* ============================================================
   TOAST
   ============================================================ */

function showToast(
  message,
  type = "info"
) {
  let toast =
    $("adminToast");

  if (!toast) {
    toast =
      document.createElement(
        "div"
      );

    toast.id =
      "adminToast";

    toast.className =
      "toast";

    toast.style.cssText = `
      position:fixed;
      right:20px;
      bottom:20px;
      z-index:99999;
      max-width:420px;
      padding:14px 18px;
      border-radius:12px;
      color:#fff;
      font-weight:700;
      box-shadow:0 10px 30px rgba(0,0,0,.2);
      opacity:0;
      transform:translateY(15px);
      transition:.25s ease;
      pointer-events:none;
    `;

    document.body.appendChild(
      toast
    );
  }

  toast.textContent =
    message;

  toast.style.background =
    type === "error"
      ? "#a32939"
      : type === "success"
      ? "#167345"
      : "#17214f";

  requestAnimationFrame(() => {
    toast.style.opacity =
      "1";

    toast.style.transform =
      "translateY(0)";
  });

  clearTimeout(
    window.__AZAAD_TOAST_TIMER
  );

  window.__AZAAD_TOAST_TIMER =
    setTimeout(() => {
      toast.style.opacity =
        "0";

      toast.style.transform =
        "translateY(15px)";
    }, 3500);
}

/* ============================================================
   SAFE QUERY
   ============================================================ */

async function safeQuery(
  query
) {
  try {
    return await query;
  } catch (error) {
    console.error(
      "Admin query error:",
      error
    );

    return {
      data: null,
      error
    };
  }
}

/* ============================================================
   PERMISSIONS
   ============================================================ */

function hasPermission(
  permission
) {
  return state.permissions.has(
    permission
  );
}

function requirePermission(
  permission
) {
  if (
    hasPermission(permission)
  ) {
    return true;
  }

  showToast(
    "⛔ ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    "error"
  );

  return false;
}

/* ============================================================
   APPLY STAFF ROLE
   ============================================================ */

function applyStaffRole(
  staff
) {
  if (!staff) {
    return false;
  }

  const role =
    String(
      staff.role || ""
    )
      .toUpperCase()
      .trim();

  if (
    !ROLE_PERMISSIONS[role]
  ) {
    console.error(
      "Invalid staff role:",
      staff.role
    );

    return false;
  }

  state.staff =
    staff;

  state.currentRole =
    role;

  state.permissions =
    new Set(
      ROLE_PERMISSIONS[role]
    );

  document.body.dataset.role =
    role;

  updateUserIdentity();

  return true;
}

/* ============================================================
   DOCTOR ROUTING
   ------------------------------------------------------------
   DOCTOR accounts must never land in the Admin UI.
   They authenticate through the same staff login form, then
   continue directly to the doctor dashboard.
   ============================================================ */

function redirectDoctorIfNeeded() {
  const role = String(
    state.currentRole || state.staff?.role || ''
  ).toUpperCase().trim();

  if (role !== 'DOCTOR') {
    return false;
  }

  const target = 'doctor-dashboard.html';
  if (!window.location.pathname.endsWith('/' + target)) {
    window.location.replace(target);
  }

  return true;
}

/* ============================================================
   FINAL ADMIN INTERACTION SAFETY
   ------------------------------------------------------------
   Optional modules must never be able to freeze the shell.
   Authentication and Logout remain owned exclusively by the
   Admin controller; this guard only restores document interactivity.
   It does not perform authentication and does not bypass RLS.
   ============================================================ */
(function installAdminInteractionSafety() {
  const restoreInteraction = () => {
    try {
      document.documentElement.removeAttribute("inert");
      document.body?.removeAttribute("inert");
      if (document.body) {
        document.body.style.pointerEvents = "";
      }
    } catch (error) {
      console.error("Admin interaction safety error:", error);
    }
  };

  const install = () => {
    restoreInteraction();
  };

  window.AZAAD_RESTORE_STAFF_PROFILE = async function restoreStaffProfile() {
  const retryDelays = [0, 150, 350]; let lastStatus = null;
  try { for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
    if (retryDelays[attempt]) await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
    const response = await fetch('/api/admin-auth', { method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } }); lastStatus = response.status;
    if (response.ok) { const result = await response.json().catch(() => ({})); if (!result?.authenticated || result?.provider !== 'appwrite' || !result?.staff || result.staff.active === false) return false;
      state.session = Object.freeze({ provider: 'appwrite' }); state.user = result.user || { id: result.staff.auth_user_id || null, email: result.staff.email || null }; state.provider = 'appwrite'; return applyStaffRole(result.staff); }
    if (![401, 408, 429, 500, 502, 503, 504].includes(response.status)) return false;
  } console.warn('Appwrite session restore unavailable after bounded retries:', lastStatus); return false;
  } catch (error) { console.warn('Appwrite session restore failed:', error); return false; }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }

  window.addEventListener("error", restoreInteraction, true);
  window.addEventListener("unhandledrejection", restoreInteraction, true);
})();

/* ============================================================
   LOGIN
   ============================================================ */

async function login(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase(); const cleanPassword = String(password || '');
  if (!cleanUsername) throw new Error('اسم المستخدم مطلوب.'); if (!cleanPassword) throw new Error('كلمة المرور مطلوبة.');
  const response = await fetch('/api/admin-auth', { method: 'POST', credentials: 'include', cache: 'no-store', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ username: cleanUsername, password: cleanPassword }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error === 'invalid_credentials' ? 'بيانات الدخول غير صحيحة.' : (result?.message || 'تعذر تسجيل الدخول.'));
  if (result?.provider !== 'appwrite' || !result?.authenticated || !result?.staff) throw new Error('جلسة Appwrite غير صالحة.');
  if (result.staff.active === false) throw new Error('حساب الموظف غير فعال.'); if (!applyStaffRole(result.staff)) throw new Error('دور الموظف غير صالح.');
  state.session = Object.freeze({ provider: 'appwrite' }); state.user = result.user || { id: result.staff.auth_user_id || null, email: result.staff.email || null }; state.provider = 'appwrite';
  if (redirectDoctorIfNeeded()) return; await initializeApplication();
}


function activateAuthenticatedAdminShell() {
  const loginPage = document.getElementById("loginPage");
  const adminPage = document.getElementById("adminPage");

  if (loginPage) loginPage.classList.add("hidden");
  if (adminPage) adminPage.classList.remove("hidden");

  updateUserIdentity();
}

/* ============================================================
   LOGOUT
   ============================================================ */

async function logout() {
  state.session = null; state.user = null; state.staff = null; state.currentRole = null; state.permissions = new Set(); state.initialized = false; state.initializing = false; state.provider = null
  const request = fetch('/api/admin-auth', { method: 'DELETE', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } }).catch(error => { console.warn('Appwrite logout request failed:', error); return null })
  try { await Promise.race([request, new Promise(resolve => setTimeout(resolve, 2500))]) } catch (error) { console.warn('Appwrite logout boundary failed:', error) }
  window.location.replace('/admin.html')
}



/* ============================================================
   INITIALIZE
   ============================================================ */

async function waitForCanonicalCoreContext() {
  if (typeof window.AZAAD_CORE_CONTEXT?.todayISO === "function") return;

  const deadline = performance.now() + 3000;
  while (performance.now() < deadline) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (typeof window.AZAAD_CORE_CONTEXT?.todayISO === "function") return;
  }

  throw new Error("AZAAD_CORE_CONTEXT.todayISO is required for Admin business dates.");
}

async function initializeApplication() {
  if (state.initialized || state.initializing) return;
  if (!state.session || !state.staff || !state.currentRole) return;

  state.initializing = true;
  if (!state.user?.id && state.staff?.auth_user_id) {
    state.user = { id: state.staff.auth_user_id };
  }

  const loginPage = $("loginPage");
  const adminPage = $("adminPage");
  if (loginPage) loginPage.classList.add("hidden");
  if (adminPage) adminPage.classList.remove("hidden");

  updateUserIdentity();
  bindBookingFilters();
  bindLogout();
  bindPatientPage();
  buildCommandCenter();

  state.initialized = true;
  state.initializing = false;
  window.dispatchEvent(new CustomEvent("azaad:admin-authenticated"));

  void loadBookings().catch(error =>
    console.error("Background booking load error:", error)
  );

  
  showToast(`🟢 تم تسجيل الدخول بنجاح — ${state.currentRole}`, "success");
}


/* ============================================================
   USER IDENTITY
   ============================================================ */

function updateUserIdentity() {
  if (
    !state.user &&
    !state.staff
  ) {
    return;
  }

  let identity =
    $("adminIdentity");

  if (!identity) {
    identity =
      document.createElement(
        "div"
      );

    identity.id =
      "adminIdentity";

    identity.style.cssText = `
      margin-top:6px;
      font-size:13px;
      color:#6c758c;
      font-weight:700;
      line-height:1.7;
    `;

    const topbar =
      document.querySelector(
        ".topbar"
      );

    if (topbar) {
      const target =
        topbar.firstElementChild ||
        topbar;

      target.appendChild(
        identity
      );
    }
  }

  const name =
    state.staff?.full_name ||
    state.staff?.username ||
    state.user?.email ||
    "موظف";

  const username =
    state.staff?.username ||
    "";

  const role =
    state.currentRole ||
    "";

  identity.innerHTML = `
    👤 ${escapeHTML(name)}

    ${
      username
        ? `<br>🔑 ${escapeHTML(username)}`
        : ""
    }

    ${
      role
        ? `<br>🎯 ${escapeHTML(role)}`
        : ""
    }
  `;
}

/* ============================================================
   BOOKING DATA
   ============================================================ */

async function loadBookings() {
  if (!requirePermission("bookings.view")) return; if (state.loadingBookings) return; state.loadingBookings = true;
  try { if (!state.session || state.provider !== 'appwrite') throw new Error("جلسة الإدارة غير صالحة.");
    const response = await fetch("/api/admin-appointments?from=2000-01-01&to=2100-12-31&limit=500", { method: "GET", credentials: "include", cache: "no-store", headers: { Accept: "application/json" } }); const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "تعذر تحميل الحجوزات التشغيلية."); state.bookings = Array.isArray(payload?.appointments) ? payload.appointments : [];
    renderBookings(); updateStatistics(); refreshCommandCenter(); window.dispatchEvent(new CustomEvent("azaad:admin-bookings-updated"));
  } catch (error) { console.error("Booking loading error:", error); state.bookings = []; renderBookingFallback(); window.dispatchEvent(new CustomEvent("azaad:admin-bookings-updated")); }
  finally { state.loadingBookings = false; }
}

/* ============================================================
   STATUS
   ============================================================ */

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replaceAll(
      "-",
      "_"
    )
    .replaceAll(
      " ",
      "_"
    );
}

function statusLabel(
  value
) {
  const status =
    normalizeStatus(
      value
    );

  const labels = {
    pending:
      "🟡 قيد المراجعة",

    confirmed:
      "🟢 مؤكد",

    completed:
      "✅ مكتمل",

    attended:
      "🟢 حضر",

    cancelled:
      "❌ ملغي",

    no_show:
      "🔴 No-Show",

    rescheduled:
      "🔄 أعيدت الجدولة"
  };

  return (
    labels[status] ||
    escapeHTML(
      value ||
      "غير محدد"
    )
  );
}

function statusClass(
  value
) {
  const status =
    normalizeStatus(
      value
    );

  if (
    [
      "confirmed",
      "completed",
      "attended"
    ].includes(status)
  ) {
    return "badge-confirmed";
  }

  if (
    [
      "cancelled",
      "no_show"
    ].includes(status)
  ) {
    return "badge-cancelled";
  }

  if (
    status === "pending"
  ) {
    return "badge-pending";
  }

  return "badge-draft";
}

/* ============================================================
   FIND BOOKING CONTAINER
   ============================================================ */

function getBookingContainer() {
  /*
   * Supports both the older and newer admin.html versions.
   */

  return (
    firstElement(
      "bookingTable",
      "bookingsTable",
      "bookings"
    )
  );
}

/* ============================================================
   SEARCH VALUE
   ============================================================ */

function getBookingSearchValue() {
  return (
    firstElement(
      "search",
      "bookingSearch"
    )?.value ||
    ""
  )
    .trim()
    .toLowerCase();
}

/* ============================================================
   STATUS FILTER VALUE
   ============================================================ */

function getBookingStatusValue() {
  return (
    firstElement(
      "statusFilter",
      "bookingStatus"
    )?.value ||
    ""
  )
    .trim()
    .toLowerCase();
}

/* ============================================================
   RENDER BOOKINGS
   ============================================================ */

function renderBookings() {
  const container =
    getBookingContainer();

  if (!container) {
    return;
  }

  const search =
    getBookingSearchValue();

  const statusFilter =
    getBookingStatusValue();

  const filtered =
    state.bookings.filter(
      booking => {
        const searchable =
          [
            booking.booking_code,
            booking.patient_name,
            booking.patient_phone
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const searchMatch =
          !search ||
          searchable.includes(
            search
          );

        const statusMatch =
          !statusFilter ||
          normalizeStatus(
            booking.status
          ) ===
            normalizeStatus(
              statusFilter
            );

        return (
          searchMatch &&
          statusMatch
        );
      }
    );

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty">
        📭 لا توجد حجوزات مطابقة.
      </div>
    `;

    return;
  }

  /*
   * If the container is a table element itself,
   * render tbody. Otherwise render a full table.
   */

  if (
    container.tagName ===
    "TABLE"
  ) {
    container.innerHTML = `
      <thead>
        <tr>
          <th>🔖 الحجز</th>
          <th>🤢 المريض</th>
          <th>📱 الهاتف</th>
          <th>📅 التاريخ</th>
          <th>⏰ الوقت</th>
          <th>🚦 الحالة</th>
          <th>📱 التواصل</th>
        </tr>
      </thead>

      <tbody>
        ${filtered
          .map(
            renderBookingRow
          )
          .join("")}
      </tbody>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>🔖 الحجز</th>
            <th>🤢 المريض</th>
            <th>📱 الهاتف</th>
            <th>📅 التاريخ</th>
            <th>⏰ الوقت</th>
            <th>🚦 الحالة</th>
            <th>📱 التواصل</th>
          </tr>
        </thead>

        <tbody>
          ${filtered
            .map(
              renderBookingRow
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

/* ============================================================
   BOOKING ROW
   ============================================================ */

function renderBookingRow(
  booking
) {
  const message =
    `مرحبًا ${
      booking.patient_name ||
      ""
    }، معك عيادة أزاد للصحة النفسية. ` +
    `نود التواصل معكم بخصوص موعدكم.`;

  const wa =
    whatsappURL(
      booking.patient_phone,
      message
    );

  return `
    <tr>

      <td>
        <strong>
          ${escapeHTML(
            booking.booking_code ||
            "-"
          )}
        </strong>
      </td>

      <td>
        ${escapeHTML(
          booking.patient_name ||
          "-"
        )}
      </td>

      <td dir="ltr">
        ${escapeHTML(
          booking.patient_phone ||
          "-"
        )}
      </td>

      <td>
        ${formatDate(
          booking.appointment_date
        )}
      </td>

      <td>
        <strong>
          ${formatTime(
            booking.appointment_time
          )}
        </strong>
      </td>

      <td>
        <span
          class="badge ${statusClass(
            booking.status
          )}"
        >
          ${statusLabel(
            booking.status
          )}
        </span>
      </td>

      <td>
        ${
          booking.patient_phone
            ? `
              <a
                href="${escapeHTML(
                  wa
                )}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-success"
                style="text-decoration:none;"
              >
                📱 WhatsApp
              </a>
            `
            : `
              <span class="muted">
                لا يوجد هاتف
              </span>
            `
        }
      </td>

    </tr>
  `;
}

/* ============================================================
   FALLBACK
   ============================================================ */

function renderBookingFallback() {
  const container =
    getBookingContainer();

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="error">
      ⚠️ تعذر تحميل الحجوزات.
      تحقق من جلسة الدخول وصلاحيات RLS.
    </div>
  `;
}

/* ============================================================
   STATISTICS
   ============================================================ */

function updateStatistics() {
  const bookings =
    state.bookings;

  const total =
    bookings.length;

  const pending =
    bookings.filter(
      booking =>
        normalizeStatus(
          booking.status
        ) === "pending"
    ).length;

  const confirmed =
    bookings.filter(
      booking =>
        normalizeStatus(
          booking.status
        ) === "confirmed"
    ).length;

  const today =
    todayISO();

  const todayCount =
    bookings.filter(
      booking =>
        booking.appointment_date ===
        today
    ).length;

  /*
   * Support both naming conventions.
   */

  const totalElement =
    firstElement(
      "total",
      "totalCount"
    );

  const pendingElement =
    firstElement(
      "pending",
      "pendingCount"
    );

  const confirmedElement =
    firstElement(
      "confirmed",
      "confirmedCount"
    );

  const todayElement =
    firstElement(
      "today",
      "todayCount"
    );

  if (totalElement) {
    totalElement.textContent =
      total;
  }

  if (pendingElement) {
    pendingElement.textContent =
      pending;
  }

  if (confirmedElement) {
    confirmedElement.textContent =
      confirmed;
  }

  if (todayElement) {
    todayElement.textContent =
      todayCount;
  }
}

/* ============================================================
   COMMAND CENTER
   ============================================================ */

function buildCommandCenter() {
  if (
    $("commandCenter")
  ) {
    refreshCommandCenter();
    return;
  }

  const adminPage =
    $("adminPage");

  if (!adminPage) {
    return;
  }

  const center =
    document.createElement(
      "section"
    );

  center.id =
    "commandCenter";

  center.style.cssText =
    "margin-top:16px;";

  center.innerHTML = `
    <div class="card">

      <div class="panel-head">

        <div>

          <h2>
            🏥 Azaad Clinic Command Center
          </h2>

          <div class="muted">
            لوحة التشغيل اليومية
          </div>

        </div>

        <div class="top-actions">

          <button
            id="ccRefresh"
            class="btn btn-secondary"
            type="button"
          >
            🔄 تحديث
          </button>

          <button
            id="ccShare"
            class="btn btn-gold"
            type="button"
          >
            📤 مشاركة الموقع
          </button>

        </div>

      </div>

    </div>

    <div class="stats">

      <div class="stat">

        <div
          id="ccToday"
          class="stat-number"
        >
          0
        </div>

        <div class="muted">
          📅 مواعيد اليوم
        </div>

      </div>

      <div class="stat">

        <div
          id="ccConfirmed"
          class="stat-number"
        >
          0
        </div>

        <div class="muted">
          🟢 مؤكدة
        </div>

      </div>

      <div class="stat">

        <div
          id="ccNoShow"
          class="stat-number"
        >
          0
        </div>

        <div class="muted">
          🔴 No-Show
        </div>

      </div>

      <div class="stat">

        <div
          id="ccPending"
          class="stat-number"
        >
          0
        </div>

        <div class="muted">
          🟡 تحتاج متابعة
        </div>

      </div>

    </div>

    <div class="card">

      <h3>
        🚦 إجراءات سريعة
      </h3>

      <div class="top-actions">

        <button
          class="btn btn-primary"
          id="quickBookings"
          type="button"
        >
          📅 الحجوزات
        </button>

        <button
          class="btn btn-secondary"
          id="quickNoShow"
          type="button"
        >
          🔴 No-Show
        </button>

        <button
          class="btn btn-secondary"
          id="quickFollowup"
          type="button"
        >
          🔔 Follow-up
        </button>

        <button
          class="btn btn-secondary"
          id="quickPatients"
          type="button"
        >
          🤢 المرضى
        </button>

        <button
          class="btn btn-secondary"
          id="quickMarketing"
          type="button"
        >
          📣 Marketing
        </button>

        <button
          class="btn btn-secondary"
          id="quickStaff"
          type="button"
        >
          👥 الموظفون
        </button>

      </div>

    </div>

    <div class="card">

      <div class="panel-head">

        <h3>
          📅 مواعيد اليوم
        </h3>

        <span
          id="ccTodayLabel"
          class="muted"
        ></span>

      </div>

      <div
        id="ccTodayList"
        class="items"
      ></div>

    </div>

    <div class="card">

      <h3>
        🔴 No-Show Recovery
      </h3>

      <div
        id="ccNoShowList"
        class="items"
      ></div>

    </div>

    <div class="card">

      <h3>
        📤 مشاركة العيادة
      </h3>

      <div class="top-actions">

        <button
          id="shareWhatsApp"
          class="btn btn-success"
          type="button"
        >
          📱 WhatsApp
        </button>

        <button
          id="copyWebsite"
          class="btn btn-secondary"
          type="button"
        >
          🔗 نسخ الرابط
        </button>

        <button
          id="nativeShare"
          class="btn btn-secondary"
          type="button"
        >
          📤 مشاركة
        </button>

      </div>

    </div>
  `;

  adminPage.appendChild(
    center
  );

  $("ccRefresh")
    ?.addEventListener(
      "click",
      async () => {
        await loadBookings();

        refreshCommandCenter();

        showToast(
          "🔄 تم تحديث النظام.",
          "success"
        );
      }
    );

  $("ccShare")
    ?.addEventListener(
      "click",
      shareWebsite
    );

  $("shareWhatsApp")
    ?.addEventListener(
      "click",
      shareWhatsApp
    );

  $("copyWebsite")
    ?.addEventListener(
      "click",
      copyWebsite
    );

  $("nativeShare")
    ?.addEventListener(
      "click",
      nativeShare
    );

  $("quickBookings")
    ?.addEventListener(
      "click",
      () => {
      }
    );

  $("quickNoShow")
    ?.addEventListener(
      "click",
      showNoShowCenter
    );

  $("quickFollowup")
    ?.addEventListener(
      "click",
      () =>
        showFeatureNotice(
          "🔔 Follow-up Center"
        )
    );

  $("quickPatients")
    ?.addEventListener(
      "click",
      () =>
        showFeatureNotice(
          "🤢 Patient Center"
        )
    );

  $("quickMarketing")
    ?.addEventListener(
      "click",
      () =>
        showFeatureNotice(
          "📣 Marketing Center"
        )
    );

  $("quickStaff")
    ?.addEventListener(
      "click",
      () => {
        if (
          !requirePermission(
            "staff.view"
          )
        ) {
          return;
        }

        const staffPanel =
          firstElement(
            "staffPanel",
            "staff"
          );

        if (staffPanel) {

          
          return;
        }

        showFeatureNotice(
          "👥 Staff Management"
        );
      }
    );

  refreshCommandCenter();
}

/* ============================================================
   COMMAND CENTER REFRESH
   ============================================================ */

function refreshCommandCenter() {
  const today =
    todayISO();

  const todayBookings =
    state.bookings.filter(
      booking =>
        booking.appointment_date ===
        today
    );

  const confirmed =
    todayBookings.filter(
      booking =>
        normalizeStatus(
          booking.status
        ) === "confirmed"
    );

  const noShows =
    state.bookings.filter(
      booking =>
        normalizeStatus(
          booking.status
        ) === "no_show"
    );

  const pending =
    state.bookings.filter(
      booking =>
        normalizeStatus(
          booking.status
        ) === "pending"
    );

  if ($("ccToday")) {
    $("ccToday").textContent =
      todayBookings.length;
  }

  if ($("ccConfirmed")) {
    $("ccConfirmed").textContent =
      confirmed.length;
  }

  if ($("ccNoShow")) {
    $("ccNoShow").textContent =
      noShows.length;
  }

  if ($("ccPending")) {
    $("ccPending").textContent =
      pending.length;
  }

  if ($("ccTodayLabel")) {
    $("ccTodayLabel").textContent =
      formatDate(today);
  }

  renderTodayList(
    todayBookings
  );

  renderNoShowList(
    noShows
  );
}

/* ============================================================
   TODAY LIST
   ============================================================ */

function renderTodayList(
  bookings
) {
  const container =
    $("ccTodayList");

  if (!container) {
    return;
  }

  if (!bookings.length) {
    container.innerHTML = `
      <div class="empty">
        📭 لا توجد مواعيد اليوم.
      </div>
    `;

    return;
  }

  const sorted =
    [...bookings].sort(
      (a, b) =>
        String(
          a.appointment_time || ""
        ).localeCompare(
          String(
            b.appointment_time || ""
          )
        )
    );

  container.innerHTML =
    sorted
      .map(
        booking => `
          <div class="item">

            <div>

              <strong>
                ${escapeHTML(
                  booking.patient_name ||
                  "-"
                )}
              </strong>

              <div class="muted">

                ⏰
                ${formatTime(
                  booking.appointment_time
                )}

                &nbsp; • &nbsp;

                🔖
                ${escapeHTML(
                  booking.booking_code ||
                  "-"
                )}

              </div>

            </div>

            <div>

              <span
                class="badge ${statusClass(
                  booking.status
                )}"
              >
                ${statusLabel(
                  booking.status
                )}
              </span>

            </div>

          </div>
        `
      )
      .join("");
}

/* ============================================================
   NO SHOW
   ============================================================ */

function renderNoShowList(
  bookings
) {
  const container =
    $("ccNoShowList");

  if (!container) {
    return;
  }

  if (!bookings.length) {
    container.innerHTML = `
      <div class="empty">
        🟢 لا توجد حالات No-Show.
      </div>
    `;

    return;
  }

  container.innerHTML =
    bookings
      .slice(0, 20)
      .map(
        booking => {
          const message =
            `مرحبًا ${
              booking.patient_name ||
              ""
            }، معك عيادة أزاد للصحة النفسية. ` +
            `لاحظنا عدم حضوركم للموعد المحدد. ` +
            `إذا كنتم ترغبون في إعادة الحجز، يسعدنا مساعدتكم.`;

          const wa =
            whatsappURL(
              booking.patient_phone,
              message
            );

          return `
            <div class="item">

              <div>

                <strong>
                  🔴
                  ${escapeHTML(
                    booking.patient_name ||
                    "-"
                  )}
                </strong>

                <div class="muted">

                  🔖
                  ${escapeHTML(
                    booking.booking_code ||
                    "-"
                  )}

                  <br>

                  📅
                  ${formatDate(
                    booking.appointment_date
                  )}

                  ⏰
                  ${formatTime(
                    booking.appointment_time
                  )}

                </div>

              </div>

              <div class="item-actions">

                ${
                  booking.patient_phone
                    ? `
                      <a
                        href="${escapeHTML(
                          wa
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-success"
                        style="text-decoration:none;"
                      >
                        📱 WhatsApp
                      </a>
                    `
                    : ""
                }

                <button
                  class="btn btn-secondary"
                  type="button"
                  data-booking-code="${escapeHTML(
                    booking.booking_code ||
                    ""
                  )}"
                >
                  🔔 متابعة
                </button>

              </div>

            </div>
          `;
        }
      )
      .join("");

  container
    .querySelectorAll(
      "[data-booking-code]"
    )
    .forEach(
      button => {
        button.addEventListener(
          "click",
          () =>
            markNoShowFollowup(
              button.dataset
                .bookingCode
            )
        );
      }
    );
}

/* ============================================================
   FOLLOW-UP
   ============================================================ */

async function markNoShowFollowup(
  bookingCode
) {
  if (
    !requirePermission(
      "followups.view"
    )
  ) {
    return;
  }

  showToast(
    `🔔 تم تجهيز متابعة للحجز ${bookingCode}.`,
    "success"
  );
}

/* ============================================================
   SHARE
   ============================================================ */

async function shareWhatsApp() {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(
      WEBSITE_MESSAGE
    )}`,
    "_blank",
    "noopener,noreferrer"
  );
}

async function copyWebsite() {
  try {
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText ===
        "function"
    ) {
      await navigator.clipboard.writeText(
        WEBSITE_URL
      );
    } else {
      throw new Error(
        "Clipboard unavailable"
      );
    }

    showToast(
      "🔗 تم نسخ رابط الموقع.",
      "success"
    );
  } catch {
    const input =
      document.createElement(
        "input"
      );

    input.value =
      WEBSITE_URL;

    input.style.position =
      "fixed";

    input.style.opacity =
      "0";

    document.body.appendChild(
      input
    );

    input.select();

    try {
      document.execCommand(
        "copy"
      );
    } catch {
      /* ignored */
    }

    input.remove();

    showToast(
      "🔗 تم نسخ رابط الموقع.",
      "success"
    );
  }
}

async function nativeShare() {
  if (
    navigator.share &&
    typeof navigator.share ===
      "function"
  ) {
    try {
      await navigator.share({
        title:
          "Azaad Clinic for Mental Health",

        text:
          WEBSITE_MESSAGE,

        url:
          WEBSITE_URL
      });

      return;
    } catch (error) {
      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }
    }
  }

  await copyWebsite();
}

async function shareWebsite() {
  await nativeShare();
}

/* ============================================================
   NO SHOW CENTER
   ============================================================ */

function showNoShowCenter() {
  if (
    !requirePermission(
      "bookings.view"
    )
  ) {
    return;
  }

  /*
   * Support both panel naming systems.
   */

  const panel =
    firstElement(
      "bookings",
      "bookingsPanel"
    );

  if (panel) {
  }

  const status =
    firstElement(
      "statusFilter",
      "bookingStatus"
    );

  if (status) {
    status.value =
      "no_show";

    renderBookings();
  }

  showToast(
    "🔴 تم عرض حجوزات No-Show.",
    "info"
  );
}

/* ============================================================
   PANELS
   ============================================================ */

function requestPanel(panelId) {
  if (!panelId) return;
  window.dispatchEvent(new CustomEvent("azaad:admin-panel-requested", {
    detail: { panel: String(panelId) }
  }));
}




function showFeatureNotice(
  feature
) {
  showToast(
    `${feature} — الوحدة متاحة حسب صلاحيات الحساب.`,
    "info"
  );
}

/* ============================================================
   TABS
   ============================================================ */



/* ============================================================
   BOOKING FILTERS
   ============================================================ */

function bindBookingFilters() {
  const search =
    firstElement(
      "search",
      "bookingSearch"
    );

  const status =
    firstElement(
      "statusFilter",
      "bookingStatus"
    );

  const refresh =
    firstElement(
      "refreshBookings",
      "refreshBtn"
    );

  search?.addEventListener(
    "input",
    renderBookings
  );

  status?.addEventListener(
    "change",
    renderBookings
  );

  refresh?.addEventListener(
    "click",
    async () => {
      await loadBookings();

      showToast(
        "🔄 تم تحديث الحجوزات.",
        "success"
      );
    }
  );
}

/* ============================================================
   PATIENT PAGE
   ============================================================ */

function bindPatientPage() {
  const button =
    firstElement(
      "patientPageBtn"
    );

  button?.addEventListener(
    "click",
    () => {
      window.location.href =
        "./index.html";
    }
  );
}

/* ============================================================
   LOGOUT
   ============================================================ */

function bindLogout() {
  const button =
    firstElement(
      "logoutBtn"
    );

  if (!button) {
    return;
  }

  if (
    button.dataset
      .azaadBound ===
    "true"
  ) {
    return;
  }

  button.dataset
    .azaadBound =
    "true";

  button.addEventListener(
    "click",
    async () => {
      const confirmed =
        window.confirm(
          "هل تريد تسجيل الخروج من لوحة الإدارة؟"
        );

      if (!confirmed) {
        return;
      }

      await logout();
    }
  );
}

/* ============================================================
   LOGIN
   ============================================================ */

function bindLogin() {
  const form =
    $("loginForm");

  if (!form) {
    return;
  }

  if (
    form.dataset
      .azaadBound ===
    "true"
  ) {
    return;
  }

  form.dataset
    .azaadBound =
    "true";

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const username =
        $("username")
          ?.value
          ?.trim()
          .toLowerCase();

      const password =
        $("password")
          ?.value ||
        "";

      const errorBox =
        $("loginError");

      const submitButton =
        event.submitter ||
        form.querySelector(
          'button[type="submit"]'
        );

      if (errorBox) {
        errorBox.textContent =
          "";

        errorBox.classList.add(
          "hidden"
        );
      }

      if (
        !username ||
        !password
      ) {
        if (errorBox) {
          errorBox.textContent =
            "يرجى إدخال Username وكلمة المرور.";

          errorBox.classList.remove(
            "hidden"
          );
        }

        return;
      }

      if (
        !/^[a-z0-9._-]{3,40}$/.test(
          username
        )
      ) {
        if (errorBox) {
          errorBox.textContent =
            "Username يجب أن يحتوي على أحرف إنجليزية صغيرة أو أرقام أو . _ - فقط.";

          errorBox.classList.remove(
            "hidden"
          );
        }

        return;
      }

      const originalText =
        submitButton?.textContent ||
        "تسجيل الدخول";

      if (submitButton) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          "⏳ جاري تسجيل الدخول...";
      }

      try {
        await login(
          username,
          password
        );
      } catch (error) {
        console.error(
          "Login error:",
          error
        );

        if (errorBox) {
          errorBox.textContent =
            error?.message ||
            "بيانات الدخول غير صحيحة أو لا يوجد حساب فعال.";

          errorBox.classList.remove(
            "hidden"
          );
        }

        showToast(
          error?.message ||
            "❌ تعذر تسجيل الدخول.",
          "error"
        );
      } finally {
        if (
          submitButton &&
          !state.session
        ) {
          submitButton.disabled =
            false;

          submitButton.textContent =
            originalText;
        }
      }
    }
  );
}


/* ============================================================
   GLOBAL API
   ============================================================ */

window.AZAAD = {
  state,

  refresh: async () => {
    await loadBookings();

    updateStatistics();

    refreshCommandCenter();

    
  },

  shareWebsite,

  shareWhatsApp,

  copyWebsite,

  nativeShare,

  markNoShowFollowup,

  logout,

  hasPermission,

  formatTime,

  formatDate
};



/* ============================================================
   POST-AUTH RUNTIME LOADER
   ------------------------------------------------------------
   Non-critical feature scripts are deliberately loaded only after
   the Admin shell is interactive. Loading them is never awaited by
   authentication or initialization.
   ============================================================ */
async function loadAfterAuthRuntimes() {
  if (window.__AZAAD_AFTER_AUTH_RUNTIMES_LOADED) return;
  window.__AZAAD_AFTER_AUTH_RUNTIMES_LOADED = true;
  const manifests=Array.from(document.querySelectorAll("script[data-azaad-after-auth-src]"));
  for(const manifest of manifests){
    const src=manifest.dataset.azaadAfterAuthSrc; if(!src) continue;
    await new Promise(resolve=>{const script=document.createElement("script");script.src=src;if(manifest.dataset.azaadAfterAuthType==="module")script.type="module";script.onload=resolve;script.onerror=resolve;document.body.appendChild(script);});
    await new Promise(resolve=>setTimeout(resolve,0));
  }
}

/* ============================================================
   START
   ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  bindLogin();
  bindLogout();
  bindBookingFilters();
  bindPatientPage();

  try {
    const validStaff = await window.AZAAD_RESTORE_STAFF_PROFILE();
    if (validStaff) {
      await initializeApplication();
    }
  } catch (error) {
    console.error("Application startup error:", error);
    showToast(error?.message || "تعذر استعادة جلسة الدخول.", "error");
  }
});

window.AZAAD_LOGIN_CONTROLLER_READY = true;
