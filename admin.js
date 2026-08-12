/* ============================================================
   AZAAD CLINIC - ADMIN CONTROL CENTER
   File: admin.js

   Production frontend controller
   Supabase Auth + RLS
   Username Login through staff-login Edge Function

   IMPORTANT:
   - No Supabase Service Role Key is stored here.
   - Only the public/publishable Supabase key is used.
   - Username/password authentication is handled by the
     secured staff-login Edge Function.
   - clinic_staff uses "active" (NOT "is_active").
   - A valid authenticated session without a valid active
     clinic_staff record is NOT treated as ADMIN.
   ============================================================ */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ------------------------------------------------------------
   SUPABASE
   ------------------------------------------------------------ */

const SUPABASE_URL =
  "https://derofsthjivlkcdnojww.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa";

const STAFF_LOGIN_FUNCTION =
  `${SUPABASE_URL}/functions/v1/staff-login`;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/* ------------------------------------------------------------
   WEBSITE
   ------------------------------------------------------------ */

const WEBSITE_URL =
  "https://magdy4287-beep.github.io/-azaad-clinic-website/";

const WEBSITE_MESSAGE =
  `🏥 عيادة أزاد للصحة النفسية

📅 لحجز موعد يمكنك الدخول من هنا:

${WEBSITE_URL}`;

/* ------------------------------------------------------------
   HELPERS
   ------------------------------------------------------------ */

const $ = (id) =>
  document.getElementById(id);

const escapeHTML = (value) => {
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

const todayISO = () => {
  const d = new Date();

  const y =
    d.getFullYear();

  const m =
    String(
      d.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      d.getDate()
    ).padStart(2, "0");

  return `${y}-${m}-${day}`;
};

const formatDate = (
  value
) => {
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
};

const formatTime = (
  value
) => {
  if (!value) {
    return "-";
  }

  return String(
    value
  ).slice(0, 5);
};

const normalizePhone = (
  phone
) => {
  if (!phone) {
    return "";
  }

  let p =
    String(phone)
      .trim()
      .replace(/[^\d+]/g, "");

  if (
    p.startsWith("00")
  ) {
    p =
      "+" +
      p.substring(2);
  }

  /*
   * Egyptian local mobile number:
   * 010xxxxxxxx / 011xxxxxxxx / 012xxxxxxxx / 015xxxxxxxx
   */
  if (
    p.startsWith("01") &&
    p.length === 11
  ) {
    p =
      "+20" +
      p.substring(1);
  }

  /*
   * Remove all remaining formatting.
   */
  p =
    p.replace(
      /^\+/,
      ""
    );

  return p.replace(
    /\s/g,
    ""
  );
};

const whatsappURL = (
  phone,
  message
) => {
  const normalized =
    normalizePhone(phone);

  if (!normalized) {
    return "#";
  }

  return (
    "https://wa.me/" +
    normalized +
    "?text=" +
    encodeURIComponent(
      message || ""
    )
  );
};

const showToast = (
  message,
  type = "info"
) => {
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

  toast.classList.add(
    "show"
  );

  clearTimeout(
    window.__toastTimer
  );

  window.__toastTimer =
    setTimeout(
      () => {
        toast.classList.remove(
          "show"
        );
      },
      3500
    );
};

const safeQuery = async (
  query
) => {
  try {
    return await query;
  } catch (error) {
    console.error(
      error
    );

    return {
      data: null,
      error
    };
  }
};

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------ */

const state = {
  session: null,

  user: null,

  staff: null,

  bookings: [],

  currentRole: null,

  permissions:
    new Set(),

  initialized: false
};

/* ------------------------------------------------------------
   STAFF ROLE PERMISSIONS
   ------------------------------------------------------------ */

const ROLE_PERMISSIONS = {
  OWNER: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
    "marketing.view",
    "finance.view",
    "staff.view"
  ],

  ADMIN: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
    "marketing.view",
    "finance.view",
    "staff.view"
  ],

  MANAGER: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view",
    "marketing.view",
    "finance.view",
    "staff.view"
  ],

  SECRETARY: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view"
  ],

  CASHIER: [
    "dashboard.view",
    "finance.view"
  ],

  RECEPTION: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view"
  ],

  DOCTOR: [
    "dashboard.view",
    "bookings.view",
    "patients.view",
    "followups.view"
  ],

  MARKETING: [
    "dashboard.view",
    "marketing.view"
  ]
};

/* ------------------------------------------------------------
   PERMISSION HELPERS
   ------------------------------------------------------------ */

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
    hasPermission(
      permission
    )
  ) {
    return true;
  }

  showToast(
    "⛔ ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    "error"
  );

  return false;
}

/* ------------------------------------------------------------
   APPLY STAFF ROLE
   ------------------------------------------------------------ */

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
    !role ||
    !ROLE_PERMISSIONS[
      role
    ]
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
      ROLE_PERMISSIONS[
        role
      ]
    );

  document.body.dataset.role =
    role;

  updateUserIdentity();

  return true;
}

/* ------------------------------------------------------------
   LOGIN THROUGH USERNAME
   ------------------------------------------------------------ */

async function login(
  username,
  password
) {
  const cleanUsername =
    String(
      username || ""
    )
      .trim()
      .toLowerCase();

  const cleanPassword =
    String(
      password || ""
    );

  if (!cleanUsername) {
    throw new Error(
      "اسم المستخدم مطلوب."
    );
  }

  if (!cleanPassword) {
    throw new Error(
      "كلمة المرور مطلوبة."
    );
  }

  /*
   * Username authentication is handled by the secured
   * staff-login Edge Function.
   *
   * The Edge Function is responsible for:
   * 1. Finding clinic_staff by username.
   * 2. Verifying the employee is active.
   * 3. Verifying the employee's role.
   * 4. Authenticating the corresponding Supabase Auth user.
   * 5. Returning a real Supabase session.
   */

  const response =
    await fetch(
      STAFF_LOGIN_FUNCTION,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          apikey:
            SUPABASE_PUBLISHABLE_KEY
        },

        body: JSON.stringify({
          username:
            cleanUsername,

          password:
            cleanPassword
        })
      }
    );

  let result = null;

  try {
    result =
      await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
      result?.message ||
      "بيانات الدخول غير صحيحة."
    );
  }

  if (
    !result ||
    !result.session ||
    !result.session.access_token ||
    !result.session.refresh_token
  ) {
    throw new Error(
      "تعذر إنشاء جلسة تسجيل الدخول."
    );
  }

  /*
   * A successful login MUST include staff information.
   * We never default to ADMIN when staff information is missing.
   */

  if (
    !result.staff
  ) {
    throw new Error(
      "تم تسجيل الدخول ولكن لم يتم العثور على ملف الموظف."
    );
  }

  if (
    result.staff.active === false
  ) {
    throw new Error(
      "حساب الموظف غير فعال."
    );
  }

  if (
    !applyStaffRole(
      result.staff
    )
  ) {
    throw new Error(
      "دور الموظف غير صالح."
    );
  }

  /*
   * Store the session inside the normal Supabase browser
   * client.
   *
   * This is important because other modules can use:
   *
   * window.AZAAD.supabase.auth.getSession()
   */

  const {
    error: sessionError
  } =
    await supabase.auth.setSession({
      access_token:
        result.session.access_token,

      refresh_token:
        result.session.refresh_token
    });

  if (sessionError) {
    throw sessionError;
  }

  state.session =
    result.session;

  state.user =
    result.session.user;

  /*
   * Re-apply role after setting the authenticated user
   * so identity information is complete.
   */

  applyStaffRole(
    result.staff
  );

  await initializeApplication();
}

/* ------------------------------------------------------------
   LOGOUT
   ------------------------------------------------------------ */

async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );
  }

  state.session =
    null;

  state.user =
    null;

  state.staff =
    null;

  state.currentRole =
    null;

  state.permissions =
    new Set();

  state.initialized =
    false;

  location.reload();
}

/* ------------------------------------------------------------
   RESTORE SESSION
   ------------------------------------------------------------ */

async function restoreSession() {
  const {
    data,
    error
  } =
    await supabase.auth.getSession();

  if (error) {
    console.error(
      "Session restore error:",
      error
    );

    return;
  }

  if (
    !data?.session
  ) {
    return;
  }

  state.session =
    data.session;

  state.user =
    data.session.user;

  /*
   * A Supabase session alone is NOT enough for access
   * to the clinic administration system.
   *
   * We must have an active clinic_staff record.
   */

  const validStaff =
    await restoreStaffProfile();

  if (!validStaff) {
    await supabase.auth.signOut();

    state.session =
      null;

    state.user =
      null;

    state.staff =
      null;

    state.currentRole =
      null;

    state.permissions =
      new Set();

    return;
  }

  await initializeApplication();
}

/* ------------------------------------------------------------
   RESTORE STAFF PROFILE
   ------------------------------------------------------------ */

async function restoreStaffProfile() {
  if (!state.user?.id) {
    return false;
  }

  /*
   * IMPORTANT:
   * clinic_staff uses "active".
   * Do NOT query "is_active".
   */

  const result =
    await safeQuery(
      supabase
        .from(
          "clinic_staff"
        )
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
        .eq(
          "auth_user_id",
          state.user.id
        )
        .maybeSingle()
    );

  if (result.error) {
    console.warn(
      "Staff profile lookup:",
      result.error
    );

    return false;
  }

  if (!result.data) {
    console.warn(
      "No clinic_staff record found for authenticated user."
    );

    return false;
  }

  /*
   * The database schema uses active.
   * Only explicit false is considered inactive.
   */

  if (
    result.data.active === false
  ) {
    console.warn(
      "Authenticated staff member is inactive."
    );

    return false;
  }

  if (
    !applyStaffRole(
      result.data
    )
  ) {
    return false;
  }

  return true;
}

/* ------------------------------------------------------------
   APPLICATION INIT
   ------------------------------------------------------------ */

async function initializeApplication() {
  if (
    state.initialized
  ) {
    return;
  }

  /*
   * Never initialize the admin interface without:
   * - authenticated user
   * - active staff profile
   * - valid role
   */

  if (
    !state.session ||
    !state.user ||
    !state.staff ||
    !state.currentRole
  ) {
    console.warn(
      "Admin initialization blocked: incomplete authentication context."
    );

    return;
  }

  state.initialized =
    true;

  if ($("loginPage")) {
    $("loginPage")
      .classList
      .add("hidden");
  }

  if ($("adminPage")) {
    $("adminPage")
      .classList
      .remove("hidden");
  }

  await loadBookings();

  buildCommandCenter();

  updateUserIdentity();

  /*
   * Staff Management is loaded separately if the
   * staff-management.js file exists on the page.
   */

  if (
    window.AZAAD_STAFF &&
    typeof window.AZAAD_STAFF.init ===
      "function"
  ) {
    try {
      await window.AZAAD_STAFF.init();
    } catch (error) {
      console.error(
        "Staff Management initialization error:",
        error
      );
    }
  }

  showToast(
    `تم تسجيل الدخول إلى نظام عيادة أزاد بنجاح — ${state.currentRole}`,
    "success"
  );
}

/* ------------------------------------------------------------
   USER IDENTITY
   ------------------------------------------------------------ */

function updateUserIdentity() {
  if (
    !state.user &&
    !state.staff
  ) {
    return;
  }

  const email =
    state.user?.email ||
    state.staff?.email ||
    "";

  const username =
    state.staff?.username ||
    "";

  const fullName =
    state.staff?.full_name ||
    "";

  const role =
    state.currentRole ||
    "";

  let identity =
    document.querySelector(
      "#adminIdentity"
    );

  if (!identity) {
    identity =
      document.createElement(
        "div"
      );

    identity.id =
      "adminIdentity";

    identity.style.cssText = `
      margin-top:8px;
      font-size:13px;
      color:#6c758c;
      font-weight:700;
      line-height:1.8;
    `;

    const topbar =
      document.querySelector(
        ".topbar"
      );

    if (topbar) {
      const first =
        topbar.firstElementChild;

      if (first) {
        first.appendChild(
          identity
        );
      }
    }
  }

  identity.innerHTML = `
    👤
    ${escapeHTML(
      fullName ||
      username ||
      email ||
      "موظف"
    )}

    ${
      username
        ? `
          <br>
          🔑
          ${escapeHTML(
            username
          )}
        `
        : ""
    }

    ${
      role
        ? `
          <br>
          🎯
          ${escapeHTML(
            role
          )}
        `
        : ""
    }
  `;
}

/* ------------------------------------------------------------
   BOOKINGS
   ------------------------------------------------------------ */

async function loadBookings() {
  if (
    !requirePermission(
      "bookings.view"
    )
  ) {
    return;
  }

  const result =
    await safeQuery(
      supabase
        .from(
          "clinic_bookings"
        )
        .select(`
          id,
          booking_code,
          patient_name,
          patient_phone,
          appointment_date,
          appointment_time,
          status,
          mode,
          doctor_id,
          service_id
        `)
        .order(
          "appointment_date",
          {
            ascending: false
          }
        )
        .order(
          "appointment_time",
          {
            ascending: true
          }
        )
        .limit(500)
    );

  if (result.error) {
    console.error(
      "Booking loading error:",
      result.error
    );

    state.bookings =
      [];

    renderBookingFallback();

    return;
  }

  state.bookings =
    Array.isArray(
      result.data
    )
      ? result.data
      : [];

  renderBookings();

  updateStatistics();

  refreshCommandCenter();
}

/* ------------------------------------------------------------
   BOOKING STATUS
   ------------------------------------------------------------ */

function normalizeStatus(
  status
) {
  return String(
    status || ""
  )
    .toLowerCase()
    .trim()
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
  status
) {
  const s =
    normalizeStatus(
      status
    );

  const map = {
    pending:
      "🟡 قيد المراجعة",

    confirmed:
      "🟢 مؤكد",

    cancelled:
      "❌ ملغي",

    completed:
      "✅ مكتمل",

    attended:
      "🟢 حضر",

    no_show:
      "🔴 No-Show",

    rescheduled:
      "🔄 أعيدت الجدولة"
  };

  return (
    map[s] ||
    escapeHTML(
      status ||
      "غير محدد"
    )
  );
}

function statusClass(
  status
) {
  const s =
    normalizeStatus(
      status
    );

  if (
    s === "confirmed" ||
    s === "completed" ||
    s === "attended"
  ) {
    return "badge-confirmed";
  }

  if (
    s === "cancelled" ||
    s === "no_show"
  ) {
    return "badge-cancelled";
  }

  if (
    s === "pending"
  ) {
    return "badge-pending";
  }

  return "badge-draft";
}

/* ------------------------------------------------------------
   RENDER BOOKINGS
   ------------------------------------------------------------ */

function renderBookings() {
  const container =
    $("bookingsTable") ||
    $("bookings");

  if (!container) {
    return;
  }

  const search =
    (
      $("bookingSearch")
        ?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const statusFilter =
    (
      $("bookingStatus")
        ?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const rows =
    state.bookings.filter(
      (
        booking
      ) => {
        const searchable =
          [
            booking.booking_code,
            booking.patient_name,
            booking.patient_phone
          ]
            .join(" ")
            .toLowerCase();

        const matchesSearch =
          !search ||
          searchable.includes(
            search
          );

        const matchesStatus =
          !statusFilter ||
          normalizeStatus(
            booking.status
          ) ===
            normalizeStatus(
              statusFilter
            );

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  if (!rows.length) {
    container.innerHTML = `
      <div class="empty">
        📭 لا توجد حجوزات مطابقة للبحث.
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-wrap">

      <table>

        <thead>

          <tr>

            <th>
              🔖 رقم الحجز
            </th>

            <th>
              🤢 المريض
            </th>

            <th>
              📱 الهاتف
            </th>

            <th>
              📅 التاريخ
            </th>

            <th>
              ⏰ الوقت
            </th>

            <th>
              🚦 الحالة
            </th>

            <th>
              📱 التواصل
            </th>

          </tr>

        </thead>

        <tbody>

          ${rows
            .map(
              (
                booking
              ) => {
                const message =
                  `مرحبًا ${
                    booking.patient_name ||
                    ""
                  }، معك عيادة أزاد للصحة النفسية. ` +
                  `يمكنكم التواصل معنا بخصوص موعدكم. ` +
                  `لحجز أو إعادة حجز موعد يمكنكم استخدام رابط الحجز.`;

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
                      ${formatTime(
                        booking.appointment_time
                      )}
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
                              style="
                                display:inline-block;
                                text-decoration:none;
                              "
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
            )
            .join("")}

        </tbody>

      </table>

    </div>
  `;
}

/* ------------------------------------------------------------
   FALLBACK
   ------------------------------------------------------------ */

function renderBookingFallback() {
  const container =
    $("bookingsTable") ||
    $("bookings");

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="error">
      تعذر تحميل الحجوزات من قاعدة البيانات.
      يرجى التحقق من تسجيل الدخول وRLS.
    </div>
  `;
}

/* ------------------------------------------------------------
   STATISTICS
   ------------------------------------------------------------ */

function updateStatistics() {
  const bookings =
    state.bookings;

  const total =
    bookings.length;

  const pending =
    bookings.filter(
      x =>
        normalizeStatus(
          x.status
        ) === "pending"
    ).length;

  const confirmed =
    bookings.filter(
      x =>
        normalizeStatus(
          x.status
        ) === "confirmed"
    ).length;

  const today =
    todayISO();

  const todayCount =
    bookings.filter(
      x =>
        x.appointment_date ===
        today
    ).length;

  if ($("totalCount")) {
    $("totalCount")
      .textContent =
      total;
  }

  if ($("pendingCount")) {
    $("pendingCount")
      .textContent =
      pending;
  }

  if ($("confirmedCount")) {
    $("confirmedCount")
      .textContent =
      confirmed;
  }

  if ($("todayCount")) {
    $("todayCount")
      .textContent =
      todayCount;
  }
}

/* ------------------------------------------------------------
   COMMAND CENTER
   ------------------------------------------------------------ */

function buildCommandCenter() {
  if (
    document.querySelector(
      "#commandCenter"
    )
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

  center.style.cssText = `
    margin-top:16px;
  `;

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
        >
        </span>

      </div>

      <div
        id="ccTodayList"
        class="items"
      >
      </div>

    </div>


    <div class="card">

      <h3>
        🔴 No-Show Recovery
      </h3>

      <div
        id="ccNoShowList"
        class="items"
      >
      </div>

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
      () =>
        switchPanel(
          "bookingsPanel"
        )
    );

  $("quickNoShow")
    ?.addEventListener(
      "click",
      () =>
        showNoShowCenter()
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
        const staffPanel =
          document.getElementById(
            "staffPanel"
          );

        if (
          staffPanel
        ) {
          if (
            !requirePermission(
              "staff.view"
            )
          ) {
            return;
          }

          switchPanel(
            "staffPanel"
          );

          if (
            window.AZAAD_STAFF &&
            typeof window.AZAAD_STAFF.load ===
              "function"
          ) {
            window.AZAAD_STAFF.load();
          }

          return;
        }

        showFeatureNotice(
          "👥 Staff Management"
        );
      }
    );

  refreshCommandCenter();
}

/* ------------------------------------------------------------
   COMMAND CENTER REFRESH
   ------------------------------------------------------------ */

function refreshCommandCenter() {
  const today =
    todayISO();

  const todays =
    state.bookings.filter(
      x =>
        x.appointment_date ===
        today
    );

  const confirmed =
    todays.filter(
      x =>
        normalizeStatus(
          x.status
        ) === "confirmed"
    );

  const noShows =
    state.bookings.filter(
      x =>
        normalizeStatus(
          x.status
        ) === "no_show"
    );

  const pending =
    state.bookings.filter(
      x =>
        normalizeStatus(
          x.status
        ) === "pending"
    );

  if ($("ccToday")) {
    $("ccToday")
      .textContent =
      todays.length;
  }

  if ($("ccConfirmed")) {
    $("ccConfirmed")
      .textContent =
      confirmed.length;
  }

  if ($("ccNoShow")) {
    $("ccNoShow")
      .textContent =
      noShows.length;
  }

  if ($("ccPending")) {
    $("ccPending")
      .textContent =
      pending.length;
  }

  if ($("ccTodayLabel")) {
    $("ccTodayLabel")
      .textContent =
      formatDate(
        today
      );
  }

  renderTodayList(
    todays
  );

  renderNoShowList(
    noShows
  );
}

/* ------------------------------------------------------------
   TODAY LIST
   ------------------------------------------------------------ */

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
    [
      ...bookings
    ].sort(
      (
        a,
        b
      ) =>
        String(
          a.appointment_time ||
          ""
        ).localeCompare(
          String(
            b.appointment_time ||
            ""
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

/* ------------------------------------------------------------
   NO SHOW
   ------------------------------------------------------------ */

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
        🟢 لا توجد حالات No-Show مسجلة.
      </div>
    `;

    return;
  }

  container.innerHTML =
    bookings
      .slice(
        0,
        20
      )
      .map(
        booking => {
          const message =
            `مرحبًا ${
              booking.patient_name ||
              ""
            }، ` +
            `معك عيادة أزاد للصحة النفسية. ` +
            `لاحظنا عدم حضوركم للموعد المحدد، ونتمنى أن تكونوا بخير. ` +
            `إذا كنتم ترغبون في إعادة حجز الموعد، يسعدنا مساعدتكم.`;

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

                  🆔
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
                        style="text-decoration:none"
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
          () => {
            markNoShowFollowup(
              button.dataset
                .bookingCode
            );
          }
        );
      }
    );
}

/* ------------------------------------------------------------
   NO SHOW FOLLOWUP
   ------------------------------------------------------------ */

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
    `🔔 سيتم تسجيل متابعة للحجز ${bookingCode}.`,
    "success"
  );

  /*
   * The final Follow-up INSERT remains controlled by
   * the existing Follow-up Center / database automation.
   */
}

/* ------------------------------------------------------------
   SHARE WEBSITE
   ------------------------------------------------------------ */

async function shareWhatsApp() {
  window.open(
    "https://wa.me/?text=" +
      encodeURIComponent(
        WEBSITE_MESSAGE
      ),
    "_blank",
    "noopener,noreferrer"
  );
}

/* ------------------------------------------------------------ */

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
        "Clipboard API unavailable"
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

    input.setAttribute(
      "readonly",
      ""
    );

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
      /* Ignore fallback failure */
    }

    input.remove();

    showToast(
      "🔗 تم نسخ رابط الموقع.",
      "success"
    );
  }
}

/* ------------------------------------------------------------ */

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

/* ------------------------------------------------------------ */

async function shareWebsite() {
  await nativeShare();
}

/* ------------------------------------------------------------
   NO SHOW CENTER
   ------------------------------------------------------------ */

function showNoShowCenter() {
  if (
    !requirePermission(
      "bookings.view"
    )
  ) {
    return;
  }

  const panel =
    document.getElementById(
      "bookingsPanel"
    );

  if (!panel) {
    showFeatureNotice(
      "🔴 No-Show Center"
    );

    return;
  }

  switchPanel(
    "bookingsPanel"
  );

  const status =
    $("bookingStatus");

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

/* ------------------------------------------------------------
   PANEL SWITCHING
   ------------------------------------------------------------ */

function switchPanel(
  panelId
) {
  const panel =
    document.getElementById(
      panelId
    );

  if (!panel) {
    showFeatureNotice(
      panelId
    );

    return;
  }

  document
    .querySelectorAll(
      ".panel"
    )
    .forEach(
      p =>
        p.classList.remove(
          "active"
        )
    );

  panel.classList.add(
    "active"
  );

  document
    .querySelectorAll(
      ".tab"
    )
    .forEach(
      tab => {
        tab.classList.toggle(
          "active",
          tab.dataset.panel ===
            panelId
        );
      }
    );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* ------------------------------------------------------------
   FEATURE NOTICE
   ------------------------------------------------------------ */

function showFeatureNotice(
  feature
) {
  showToast(
    `${feature} — سيتم تشغيل هذه الوحدة حسب صلاحيات حسابك.`,
    "info"
  );
}

/* ------------------------------------------------------------
   TABS
   ------------------------------------------------------------ */

function bindTabs() {
  document
    .querySelectorAll(
      ".tab"
    )
    .forEach(
      tab => {
        tab.addEventListener(
          "click",
          () =>
            switchPanel(
              tab.dataset.panel
            )
        );
      }
    );
}

/* ------------------------------------------------------------
   SEARCH / FILTER
   ------------------------------------------------------------ */

function bindBookingFilters() {
  $("bookingSearch")
    ?.addEventListener(
      "input",
      renderBookings
    );

  $("bookingStatus")
    ?.addEventListener(
      "change",
      renderBookings
    );

  $("refreshBookings")
    ?.addEventListener(
      "click",
      async () => {
        await loadBookings();

        showToast(
          "🔄 تم تحديث الحجوزات.",
          "success"
        );
      }
    );

  $("refreshBtn")
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
}

/* ------------------------------------------------------------
   PATIENT PAGE
   ------------------------------------------------------------ */

function bindPatientPage() {
  $("patientPageBtn")
    ?.addEventListener(
      "click",
      () => {
        window.location.href =
          "./index.html";
      }
    );
}

/* ------------------------------------------------------------
   LOGOUT BUTTON
   ------------------------------------------------------------ */

function bindLogout() {
  $("logoutBtn")
    ?.addEventListener(
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

/* ------------------------------------------------------------
   LOGIN FORM
   ------------------------------------------------------------ */

function bindLogin() {
  const form =
    $("loginForm");

  if (!form) {
    return;
  }

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

      if (submitButton) {
        submitButton.disabled =
          true;

        submitButton.dataset.originalText =
          submitButton.textContent;

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
            submitButton.dataset
              .originalText ||
            "تسجيل الدخول";
        }
      }
    }
  );
}

/* ------------------------------------------------------------
   AUTH STATE LISTENER
   ------------------------------------------------------------ */

supabase.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {
    if (
      event ===
        "SIGNED_IN" &&
      session
    ) {
      state.session =
        session;

      state.user =
        session.user;

      /*
       * Do not recursively call login here.
       * Username login already established the session.
       */

      if (
        !state.initialized
      ) {
        try {
          const validStaff =
            await restoreStaffProfile();

          if (
            validStaff
          ) {
            await initializeApplication();
          } else {
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error(
            "Auth staff restore:",
            error
          );

          await supabase.auth.signOut();
        }
      }

      return;
    }

    if (
      event ===
        "TOKEN_REFRESHED" &&
      session
    ) {
      state.session =
        session;

      state.user =
        session.user;

      return;
    }

    if (
      event ===
      "SIGNED_OUT"
    ) {
      state.session =
        null;

      state.user =
        null;

      state.staff =
        null;

      state.currentRole =
        null;

      state.permissions =
        new Set();

      state.initialized =
        false;
    }
  }
);

/* ------------------------------------------------------------
   GLOBAL API
   ------------------------------------------------------------ */

window.AZAAD = {
  supabase,

  state,

  refresh: async () => {
    await loadBookings();

    refreshCommandCenter();

    if (
      window.AZAAD_STAFF &&
      typeof window.AZAAD_STAFF.load ===
        "function"
    ) {
      await window.AZAAD_STAFF.load();
    }
  },

  shareWebsite,

  shareWhatsApp,

  copyWebsite,

  nativeShare,

  markNoShowFollowup,

  logout,

  hasPermission
};

/* ------------------------------------------------------------
   START
   ------------------------------------------------------------ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    bindLogin();

    bindLogout();

    bindTabs();

    bindBookingFilters();

    bindPatientPage();

    try {
      await restoreSession();
    } catch (error) {
      console.error(
        "Application startup error:",
        error
      );

      showToast(
        error?.message ||
          "تعذر استعادة جلسة الدخول.",
        "error"
      );
    }
  }
);
