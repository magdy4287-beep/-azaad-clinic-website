/* ============================================================
   AZAAD CLINIC
   STAFF MANAGEMENT CENTER
   File: staff-management.js
   Production Staff Management UI
   ------------------------------------------------------------
   Supports:
   - Employee listing
   - Employee creation
   - Employee editing
   - Role management
   - Enable / Disable employee
   - Password reset
   - Last login
   - Search
   - Role filter
   - Staff statistics
   - Role descriptions
   - Temporary password display/copy
   - Secure communication with staff-admin Edge Function
   IMPORTANT:
   ------------------------------------------------------------
   - NEVER contains the Supabase Service Role Key.
   - Only the Supabase Publishable Key is used.
   - Password operations are handled by Edge Function.
   - clinic_staff.active is used, NOT is_active.
   - Backend / RLS remains authoritative.
   - OWNER protection is enforced by backend.
   - This file does NOT directly query clinic_staff.
   - All privileged staff operations go through staff-admin.
   ============================================================ */
(function () {
  "use strict";
  /* ==========================================================
     CONFIGURATION
     ========================================================== */
  const SUPABASE_URL =
    "https://derofsthjivlkcdnojww.supabase.co";
  /*
    Publishable key is safe for browser usage.
    NEVER replace this with the Service Role Key.
  */
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa";
  const STAFF_ADMIN_FUNCTION =
    `${SUPABASE_URL}/functions/v1/staff-admin`;
  const SUPABASE_JS_URL =
    "https://esm.sh/@supabase/supabase-js@2";
  const WEBSITE_URL =
    "https://magdy4287-beep.github.io/-azaad-clinic-website/";
  /* ==========================================================
     STATE
     ========================================================== */
  const state = {
    staff: [],
    loading: false,
    initialized: false,
    client: null,
    authSubscription: null,
    lastRequestId: 0,
    currentSession: null
  };
  /* ==========================================================
     ROLE DEFINITIONS
     ========================================================== */
  const ROLES = {
    OWNER: {
      label: "👑 Owner",
      description:
        "المالك — أعلى مستوى من الصلاحيات",
      level: 100
    },
    ADMIN: {
      label: "🛡️ Admin",
      description:
        "إدارة النظام والموظفين",
      level: 80
    },
    MANAGER: {
      label: "👨‍💼 Manager",
      description:
        "إدارة وتشغيل العيادة",
      level: 60
    },
    SECRETARY: {
      label: "👩‍💼 Secretary",
      description:
        "الحجوزات والمرضى والمتابعة حسب الصلاحيات",
      level: 40
    },
    CASHIER: {
      label: "💰 Cashier",
      description:
        "المدفوعات والتحصيل والفواتير",
      level: 40
    },
    RECEPTION: {
      label: "🧑‍💼 Reception",
      description:
        "استقبال المرضى والحجوزات",
      level: 40
    },
    DOCTOR: {
      label: "🧑‍⚕️ Doctor",
      description:
        "المواعيد والمهام الطبية المصرح بها",
      level: 40
    },
    MARKETING: {
      label: "📣 Marketing",
      description:
        "التسويق والمحتوى والحملات والـ Leads",
      level: 40
    }
  };
  const MANAGEMENT_ROLES = new Set([
    "OWNER",
    "ADMIN",
    "MANAGER"
  ]);
  /* ==========================================================
     DOM HELPERS
     ========================================================== */
  function $(id) {
    return document.getElementById(id);
  }
  function escapeHTML(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }
    return String(value).replace(
      /[&<>"']/g,
      character => {
        const map = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        };
        return map[character];
      }
    );
  }
  function normalizeRole(role) {
    return String(role || "")
      .trim()
      .toUpperCase();
  }
  function normalizeUsername(username) {
    return String(username || "")
      .trim()
      .toLowerCase();
  }
  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }
  /* ==========================================================
     DATE / TIME
     ========================================================== */
  function formatDateTime(value) {
    if (!value) {
      return "—";
    }
    try {
      const date = new Date(value);
      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return escapeHTML(value);
      }
      return date.toLocaleString(
        "ar-EG",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }
      );
    } catch {
      return escapeHTML(value);
    }
  }
  /* ==========================================================
     MESSAGE / TOAST
     ========================================================== */
  function showMessage(
    message,
    type = "info",
    duration = 5000
  ) {
    let box =
      $("staffMessage");
    if (!box) {
      box =
        document.createElement(
          "div"
        );
      box.id =
        "staffMessage";
      box.style.cssText = `
        position:fixed;
        right:20px;
        bottom:20px;
        z-index:999999;
        width:min(520px,calc(100vw - 40px));
        padding:15px 18px;
        border-radius:14px;
        color:#fff;
        font-weight:700;
        line-height:1.8;
        white-space:pre-line;
        box-shadow:0 12px 35px rgba(0,0,0,.22);
        font-family:inherit;
        direction:rtl;
        text-align:right;
        opacity:0;
        transform:translateY(12px);
        transition:.22s ease;
        pointer-events:none;
      `;
      document.body.appendChild(
        box
      );
    }
    box.textContent =
      message;
    box.style.background =
      type === "error"
        ? "#a32939"
        : type === "success"
        ? "#167345"
        : "#17214f";
    box.style.opacity =
      "1";
    box.style.transform =
      "translateY(0)";
    clearTimeout(
      window.__AZAAD_STAFF_MESSAGE_TIMER
    );
    window.__AZAAD_STAFF_MESSAGE_TIMER =
      setTimeout(() => {
        box.style.opacity =
          "0";
        box.style.transform =
          "translateY(12px)";
      }, duration);
  }
  /* ==========================================================
     MODAL HELPERS
     ========================================================== */
  function closeModal() {
    [
      "staffModal",
      "staffEditModal",
      "staffRoleModal",
      "staffPasswordModal"
    ].forEach(id => {
      $(id)?.remove();
    });
  }
  function createModal(
    id,
    content,
    maxWidth = "760px"
  ) {
    closeModal();
    const modal =
      document.createElement(
        "div"
      );
    modal.id = id;
    modal.style.cssText = `
      position:fixed;
      inset:0;
      z-index:99998;
      background:rgba(10,18,45,.68);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      direction:rtl;
    `;
    modal.innerHTML = `
      <div
        style="
          width:min(${maxWidth},100%);
          max-height:92vh;
          overflow:auto;
          background:#fff;
          border-radius:22px;
          padding:24px;
          box-shadow:0 25px 80px rgba(0,0,0,.30);
        "
      >
        ${content}
      </div>
    `;
    document.body.appendChild(
      modal
    );
    modal.addEventListener(
      "click",
      event => {
        if (
          event.target === modal
        ) {
          closeModal();
        }
      }
    );
    return modal;
  }
  /* ==========================================================
     SUPABASE CLIENT
     ========================================================== */
  async function getSupabaseClient() {
    if (state.client) {
      return state.client;
    }
    /*
      Reuse a project-level client if another script exposed one.
    */
    if (
      window.AZAAD &&
      window.AZAAD.supabase &&
      window.AZAAD.supabase.auth
    ) {
      state.client =
        window.AZAAD.supabase;
      return state.client;
    }
    if (
      window.supabase &&
      typeof window.supabase.createClient ===
        "function"
    ) {
      state.client =
        window.supabase.createClient(
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
      return state.client;
    }
    /*
      admin.html currently creates its client inside a module,
      so it is not automatically available globally.
      Dynamically importing supabase-js makes this file
      independent and prevents the old "client unavailable"
      problem.
    */
    const module =
      await import(
        SUPABASE_JS_URL
      );
    state.client =
      module.createClient(
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
    return state.client;
  }
  /* ==========================================================
     SESSION
     ========================================================== */
  async function getSession() {
    const client =
      await getSupabaseClient();
    const {
      data,
      error
    } =
      await client.auth.getSession();
    if (error) {
      throw error;
    }
    if (
      !data ||
      !data.session ||
      !data.session.access_token
    ) {
      throw new Error(
        "يجب تسجيل الدخول أولاً."
      );
    }
    state.currentSession =
      data.session;
    return data.session;
  }
  async function getAccessToken() {
    const session =
      await getSession();
    return session.access_token;
  }
  /* ==========================================================
     STAFF ADMIN API
     ========================================================== */
  async function callStaffAdmin(
    action,
    payload = {},
    retry = true
  ) {
    if (!action) {
      throw new Error(
        "Staff action غير محدد."
      );
    }
    let token =
      await getAccessToken();
    const headers = {
      "Content-Type":
        "application/json",
      Accept:
        "application/json",
      Authorization:
        `Bearer ${token}`,
      /*
        Publishable key is not a secret.
        It is sent in the correct apikey header.
      */
      apikey:
        SUPABASE_PUBLISHABLE_KEY
    };
    let response;
    try {
      response =
        await fetch(
          STAFF_ADMIN_FUNCTION,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              action,
              ...payload
            }),
            cache: "no-store"
          }
        );
    } catch (networkError) {
      throw new Error(
        "تعذر الاتصال بخدمة إدارة الموظفين. تحقق من اتصال الإنترنت ثم حاول مرة أخرى."
      );
    }
    /*
      If the current JWT expired, refresh the session once
      and retry the exact request.
    */
    if (
      response.status === 401 &&
      retry
    ) {
      try {
        const client =
          await getSupabaseClient();
        const {
          data,
          error
        } =
          await client.auth.refreshSession();
        if (
          !error &&
          data?.session?.access_token
        ) {
          state.currentSession =
            data.session;
          token =
            data.session.access_token;
          return callStaffAdmin(
            action,
            payload,
            false
          );
        }
      } catch (refreshError) {
        console.error(
          "Staff session refresh error:",
          refreshError
        );
      }
    }
    let result = null;
    const contentType =
      response.headers.get(
        "content-type"
      ) || "";
    if (
      contentType.includes(
        "application/json"
      )
    ) {
      try {
        result =
          await response.json();
      } catch {
        result = null;
      }
    } else {
      try {
        const text =
          await response.text();
        result = {
          message:
            text || null
        };
      } catch {
        result = null;
      }
    }
    if (!response.ok) {
      const message =
        result?.error ||
        result?.message ||
        `Staff API Error ${response.status}`;
      throw new Error(
        message
      );
    }
    if (
      result &&
      result.error
    ) {
      throw new Error(
        result.error
      );
    }
    return result;
  }
  /* ==========================================================
     PANEL
     ========================================================== */
  function getStaffHost() {
    /*
      admin.html already contains:
      <section id="staff" class="panel">
    */
    const existing =
      $("staff");
    if (existing) {
      return existing;
    }
    /*
      Fallback for another page using this JS.
    */
    const adminPage =
      $("adminPage");
    if (!adminPage) {
      return null;
    }
    const panel =
      document.createElement(
        "section"
      );
    panel.id =
      "staff";
    panel.className =
      "panel";
    adminPage.appendChild(
      panel
    );
    return panel;
  }
  function renderStaffManagement() {
    const host =
      getStaffHost();
    if (!host) {
      console.error(
        "Azaad Staff Management: #staff panel not found."
      );
      return false;
    }
    /*
      Do not create another tab.
      admin.html already contains the staff tab.
    */
    let container =
      $("staffManagementCenter");
    if (!container) {
      container =
        document.createElement(
          "div"
        );
      container.id =
        "staffManagementCenter";
      container.className =
        "card";
      host.appendChild(
        container
      );
    }
    container.innerHTML = `
      <div
        class="panel-head"
        style="
          margin-bottom:18px;
          align-items:flex-start;
        "
      >
        <div>
          <h2
            style="
              margin:0 0 5px;
              font-size:24px;
            "
          >
            👥 إدارة الموظفين
          </h2>
          <div class="muted">
            إنشاء الحسابات وإدارة الوظائف والحالة وكلمات المرور.
          </div>
        </div>
        <div
          style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
          "
        >
          <button
            id="addStaffButton"
            class="btn btn-primary"
            type="button"
          >
            ➕ إضافة موظف
          </button>
          <button
            id="refreshStaffButton"
            class="btn btn-secondary"
            type="button"
          >
            🔄 تحديث
          </button>
        </div>
      </div>
      <div
        id="staffPermissionNotice"
        style="
          display:none;
          margin-bottom:15px;
          padding:14px;
          border-radius:12px;
          background:#fff4cc;
          color:#755c00;
          font-weight:700;
          line-height:1.8;
        "
      ></div>
      <div
        style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(180px,1fr));
          gap:12px;
          margin-bottom:20px;
        "
      >
        <div class="stat">
          <div
            id="staffTotal"
            class="stat-number"
          >
            0
          </div>
          <div class="muted">
            👥 إجمالي الموظفين
          </div>
        </div>
        <div class="stat">
          <div
            id="staffActive"
            class="stat-number"
          >
            0
          </div>
          <div class="muted">
            🟢 حسابات نشطة
          </div>
        </div>
        <div class="stat">
          <div
            id="staffInactive"
            class="stat-number"
          >
            0
          </div>
          <div class="muted">
            🔴 حسابات موقوفة
          </div>
        </div>
        <div class="stat">
          <div
            id="marketingCount"
            class="stat-number"
          >
            0
          </div>
          <div class="muted">
            📣 Marketing
          </div>
        </div>
      </div>
      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:15px;
        "
      >
        <input
          id="staffSearch"
          type="search"
          autocomplete="off"
          placeholder="🔎 ابحث باسم الموظف أو Username أو Email أو الهاتف"
          style="
            flex:1;
            min-width:250px;
          "
        />
        <select
          id="staffRoleFilter"
          style="
            min-width:190px;
          "
        >
          <option value="">
            🎯 كل الوظائف
          </option>
          ${Object.entries(ROLES)
            .map(
              ([key, value]) => `
                <option value="${key}">
                  ${value.label}
                </option>
              `
            )
            .join("")}
        </select>
      </div>
      <div
        id="staffTableContainer"
      >
        <div class="empty">
          ⏳ جاري تحميل الموظفين...
        </div>
      </div>
    `;
    bindPanelEvents();
    return true;
  }
  function bindPanelEvents() {
    $("addStaffButton")
      ?.addEventListener(
        "click",
        openCreateStaffModal
      );
    $("refreshStaffButton")
      ?.addEventListener(
        "click",
        loadStaff
      );
    $("staffSearch")
      ?.addEventListener(
        "input",
        renderStaffTable
      );
    $("staffRoleFilter")
      ?.addEventListener(
        "change",
        renderStaffTable
      );
  }
  /* ==========================================================
     STAFF LOADING
     ========================================================== */
  async function loadStaff() {
    const table =
      $("staffTableContainer");
    if (!table) {
      return;
    }
    if (state.loading) {
      return;
    }
    const requestId =
      ++state.lastRequestId;
    state.loading =
      true;
    table.innerHTML = `
      <div class="empty">
        ⏳ جاري تحميل بيانات الموظفين...
      </div>
    `;
    try {
      const result =
        await callStaffAdmin(
          "list"
        );
      /*
        Ignore an older response if another request
        became newer.
      */
      if (
        requestId !==
        state.lastRequestId
      ) {
        return;
      }
      let staff = [];
      if (
        Array.isArray(result)
      ) {
        staff =
          result;
      } else if (
        Array.isArray(
          result?.staff
        )
      ) {
        staff =
          result.staff;
      } else if (
        Array.isArray(
          result?.data
        )
      ) {
        staff =
          result.data;
      }
      state.staff =
        staff.map(
          item => {
            const safe =
              {
                ...item
              };
            /*
              Never keep password-like fields in UI state.
            */
            delete safe.password;
            delete safe.encrypted_password;
            delete safe.temp_password;
            delete safe.temporary_password;
            return safe;
          }
        );
      updateStaffStats();
      renderStaffTable();
    } catch (error) {
      console.error(
        "Azaad Staff Management load error:",
        error
      );
      state.staff = [];
      updateStaffStats();
      table.innerHTML = `
        <div
          style="
            padding:20px;
            border-radius:14px;
            background:#fff0f2;
            color:#a32939;
            line-height:1.8;
            font-weight:700;
          "
        >
          ❌ تعذر تحميل الموظفين.
          <br><br>
          ${escapeHTML(
            error?.message ||
            "حدث خطأ غير معروف."
          )}
        </div>
      `;
    } finally {
      if (
        requestId ===
        state.lastRequestId
      ) {
        state.loading =
          false;
      }
    }
  }
  /* ==========================================================
     STATISTICS
     ========================================================== */
  function updateStaffStats() {
    const total =
      state.staff.length;
    const active =
      state.staff.filter(
        staff =>
          staff?.active === true
      ).length;
    const inactive =
      state.staff.filter(
        staff =>
          staff?.active === false
      ).length;
    const marketing =
      state.staff.filter(
        staff =>
          normalizeRole(
            staff.role
          ) === "MARKETING"
      ).length;
    if ($("staffTotal")) {
      $("staffTotal")
        .textContent =
        String(total);
    }
    if ($("staffActive")) {
      $("staffActive")
        .textContent =
        String(active);
    }
    if ($("staffInactive")) {
      $("staffInactive")
        .textContent =
        String(inactive);
    }
    if ($("marketingCount")) {
      $("marketingCount")
        .textContent =
        String(marketing);
    }
  }
  /* ==========================================================
     FILTER
     ========================================================== */
  function getFilteredStaff() {
    const search =
      String(
        $("staffSearch")
          ?.value ||
        ""
      )
        .trim()
        .toLowerCase();
    const selectedRole =
      normalizeRole(
        $("staffRoleFilter")
          ?.value ||
        ""
      );
    return state.staff.filter(
      staff => {
        const searchable =
          [
            staff.full_name,
            staff.username,
            staff.email,
            staff.phone,
            staff.role
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        const searchMatch =
          !search ||
          searchable.includes(
            search
          );
        const roleMatch =
          !selectedRole ||
          normalizeRole(
            staff.role
          ) === selectedRole;
        return (
          searchMatch &&
          roleMatch
        );
      }
    );
  }
  /* ==========================================================
     ROLE LABEL
     ========================================================== */
  function getRoleLabel(role) {
    const key =
      normalizeRole(role);
    if (
      ROLES[key]
    ) {
      return ROLES[key].label;
    }
    return `🎯 ${escapeHTML(
      role || "غير محدد"
    )}`;
  }
  function getRoleDescription(
    role
  ) {
    const key =
      normalizeRole(role);
    return (
      ROLES[key]?.description ||
      "صلاحيات غير محددة"
    );
  }
  /* ==========================================================
     STAFF TABLE
     ========================================================== */
  function renderStaffTable() {
    const container =
      $("staffTableContainer");
    if (!container) {
      return;
    }
    const rows =
      getFilteredStaff();
    if (!rows.length) {
      container.innerHTML = `
        <div class="empty">
          📭 لا توجد سجلات موظفين مطابقة للبحث.
        </div>
      `;
      return;
    }
    container.innerHTML = `
      <div
        class="table-wrap"
        style="
          overflow-x:auto;
          border-radius:14px;
        "
      >
        <table
          style="
            min-width:1150px;
          "
        >
          <thead>
            <tr>
              <th>👤 الموظف</th>
              <th>🔑 Username</th>
              <th>📧 Email</th>
              <th>🎯 الوظيفة</th>
              <th>🚦 الحالة</th>
              <th>🕐 آخر دخول</th>
              <th>⚙️ الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                staff =>
                  renderStaffRow(
                    staff
                  )
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
    container
      .querySelectorAll(
        "[data-staff-action]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            handleStaffAction(
              button.dataset
                .staffAction,
              button.dataset
                .staffId
            );
          }
        );
      });
  }
  function renderStaffRow(
    staff
  ) {
    const active =
      staff.active === true;
    const role =
      normalizeRole(
        staff.role
      );
    const owner =
      role === "OWNER";
    const phone =
      staff.phone
        ? `
          <div
            class="muted"
            dir="ltr"
            style="margin-top:4px"
          >
            📱 ${escapeHTML(
              staff.phone
            )}
          </div>
        `
        : "";
    const terminated =
      !active &&
      staff.terminated_at
        ? `
          <div
            class="muted"
            style="
              margin-top:4px;
              font-size:11px;
            "
          >
            🕐 ${formatDateTime(
              staff.terminated_at
            )}
          </div>
        `
        : "";
    return `
      <tr>
        <td>
          <strong>
            ${escapeHTML(
              staff.full_name ||
              "—"
            )}
          </strong>
          ${phone}
        </td>
        <td dir="ltr">
          ${escapeHTML(
            staff.username ||
            "—"
          )}
        </td>
        <td dir="ltr">
          ${escapeHTML(
            staff.email ||
            "—"
          )}
        </td>
        <td>
          <span class="badge">
            ${getRoleLabel(
              role
            )}
          </span>
          <div
            class="muted"
            style="
              margin-top:5px;
              font-size:11px;
            "
          >
            ${escapeHTML(
              getRoleDescription(
                role
              )
            )}
          </div>
        </td>
        <td>
          ${
            active
              ? `
                <span class="badge confirmed">
                  🟢 Active
                </span>
              `
              : `
                <span class="badge cancelled">
                  🔴 Disabled
                </span>
                ${terminated}
              `
          }
        </td>
        <td>
          ${
            staff.last_login
              ? `
                🕐 ${formatDateTime(
                  staff.last_login
                )}
              `
              : `
                <span class="muted">
                  لم يسجل دخول
                </span>
              `
          }
        </td>
        <td>
          <div
            class="item-actions"
            style="
              min-width:330px;
            "
          >
            <button
              type="button"
              class="btn btn-secondary"
              data-staff-action="edit"
              data-staff-id="${escapeHTML(
                staff.id
              )}"
            >
              ✍️ تعديل
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              data-staff-action="role"
              data-staff-id="${escapeHTML(
                staff.id
              )}"
              ${
                owner
                  ? "disabled"
                  : ""
              }
            >
              🎯 Role
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              data-staff-action="password"
              data-staff-id="${escapeHTML(
                staff.id
              )}"
            >
              🔐 Reset
            </button>
            ${
              owner
                ? `
                  <button
                    type="button"
                    class="btn btn-secondary"
                    disabled
                    title="Owner محمي من التعطيل"
                  >
                    👑 Owner محمي
                  </button>
                `
                : active
                ? `
                  <button
                    type="button"
                    class="btn btn-danger"
                    data-staff-action="disable"
                    data-staff-id="${escapeHTML(
                      staff.id
                    )}"
                  >
                    ⛔ تعطيل
                  </button>
                `
                : `
                  <button
                    type="button"
                    class="btn btn-success"
                    data-staff-action="enable"
                    data-staff-id="${escapeHTML(
                      staff.id
                    )}"
                  >
                    🟢 تفعيل
                  </button>
                `
            }
          </div>
        </td>
      </tr>
    `;
  }
  /* ==========================================================
     ACTION ROUTER
     ========================================================== */
  async function handleStaffAction(
    action,
    staffId
  ) {
    const staff =
      state.staff.find(
        item =>
          String(item.id) ===
          String(staffId)
      );
    if (!staff) {
      showMessage(
        "❌ الموظف غير موجود.",
        "error"
      );
      return;
    }
    switch (action) {
      case "edit":
        openEditStaffModal(
          staff
        );
        break;
      case "role":
        openRoleModal(
          staff
        );
        break;
      case "password":
        openPasswordResetModal(
          staff
        );
        break;
      case "disable":
        await disableStaff(
          staff
        );
        break;
      case "enable":
        await enableStaff(
          staff
        );
        break;
      default:
        console.warn(
          "Unknown staff action:",
          action
        );
    }
  }
  /* ==========================================================
     CREATE STAFF MODAL
     ========================================================== */
  function openCreateStaffModal() {
    const content = `
      <div
        class="panel-head"
        style="margin-bottom:20px"
      >
        <div>
          <h2 style="margin:0">
            ➕ إضافة موظف جديد
          </h2>
          <div class="muted">
            إنشاء حساب الموظف وربطه بـ Supabase Auth.
          </div>
        </div>
        <button
          id="closeCreateStaff"
          type="button"
          class="btn btn-secondary"
        >
          ✖️ إغلاق
        </button>
      </div>
      <form id="createStaffForm">
        <div class="grid">
          <label>
            👤 الاسم الكامل
            <input
              id="newStaffName"
              type="text"
              required
              autocomplete="name"
              placeholder="اسم الموظف"
            >
          </label>
          <label>
            🔑 Username
            <input
              id="newStaffUsername"
              type="text"
              required
              autocomplete="username"
              pattern="[A-Za-z0-9._-]{3,40}"
              placeholder="مثال: sara"
              dir="ltr"
            >
          </label>
          <label>
            📧 Email
            <input
              id="newStaffEmail"
              type="email"
              required
              autocomplete="email"
              placeholder="employee@example.com"
              dir="ltr"
            >
          </label>
          <label>
            📱 الهاتف
            <input
              id="newStaffPhone"
              type="tel"
              autocomplete="tel"
              placeholder="01xxxxxxxxx"
              dir="ltr"
            >
          </label>
          <label>
            🎯 الوظيفة
            <select
              id="newStaffRole"
              required
            >
              <option value="">
                اختر الوظيفة
              </option>
              ${Object.entries(
                ROLES
              )
                .map(
                  ([key, value]) => `
                    <option value="${key}">
                      ${value.label}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
          <label>
            🔐 Temporary Password
            <input
              id="newStaffPassword"
              type="password"
              minlength="10"
              autocomplete="new-password"
              placeholder="اتركه فارغًا للتوليد التلقائي"
              dir="ltr"
            >
            <small class="muted">
              الحد الأدنى 10 أحرف.
            </small>
          </label>
        </div>
        <div
          id="newStaffRoleDescription"
          style="
            display:none;
            margin-top:5px;
            padding:14px;
            border-radius:12px;
            background:#f5f7fb;
            line-height:1.8;
          "
        ></div>
        <div
          style="
            margin-top:15px;
            padding:14px;
            border-radius:12px;
            background:#f5f7fb;
            line-height:1.8;
          "
        >
          🔐 <strong>الأمان:</strong>
          <br>
          كلمة المرور لا يتم تخزينها في هذا الملف
          ولا في جدول الموظفين.
          <br>
          يتم إنشاء حساب Auth من خلال
          <strong>staff-admin</strong>.
          <br>
          🙅‍♀️ لا تضع Service Role Key هنا.
        </div>
        <div
          style="
            display:flex;
            justify-content:flex-end;
            gap:8px;
            margin-top:20px;
          "
        >
          <button
            id="cancelCreateStaff"
            type="button"
            class="btn btn-secondary"
          >
            إلغاء
          </button>
          <button
            id="createStaffSubmit"
            type="submit"
            class="btn btn-primary"
          >
            ➕ إنشاء الحساب
          </button>
        </div>
      </form>
    `;
    const modal =
      createModal(
        "staffModal",
        content,
        "760px"
      );
    $("closeCreateStaff")
      ?.addEventListener(
        "click",
        closeModal
      );
    $("cancelCreateStaff")
      ?.addEventListener(
        "click",
        closeModal
      );
    $("newStaffRole")
      ?.addEventListener(
        "change",
        updateNewRoleDescription
      );
    $("createStaffForm")
      ?.addEventListener(
        "submit",
        createStaff
      );
    updateNewRoleDescription();
    modal
      ?.querySelector(
        "#newStaffName"
      )
      ?.focus();
  }
  function updateNewRoleDescription() {
    const role =
      normalizeRole(
        $("newStaffRole")
          ?.value
      );
    const box =
      $("newStaffRoleDescription");
    if (!box) {
      return;
    }
    if (!role) {
      box.style.display =
        "none";
      return;
    }
    box.style.display =
      "block";
    box.innerHTML = `
      🎯 <strong>
        ${getRoleLabel(
          role
        )}
      </strong>
      <br>
      ${escapeHTML(
        getRoleDescription(
          role
        )
      )}
      ${
        role === "MARKETING"
          ? `
            <br><br>
            📣 حساب Marketing مخصص للتسويق
            والمحتوى والحملات والـ Leads.
            <br>
            🙅‍♀️ لا يحصل تلقائيًا على البيانات
            الطبية أو المالية أو إدارة الموظفين.
          `
          : ""
      }
    `;
  }
  /* ==========================================================
     CREATE STAFF
     ========================================================== */
  async function createStaff(
    event
  ) {
    event.preventDefault();
    const name =
      $("newStaffName")
        ?.value
        ?.trim();
    const username =
      normalizeUsername(
        $("newStaffUsername")
          ?.value
      );
    const email =
      normalizeEmail(
        $("newStaffEmail")
          ?.value
      );
    const phone =
      $("newStaffPhone")
        ?.value
        ?.trim();
    const role =
      normalizeRole(
        $("newStaffRole")
          ?.value
      );
    const password =
      $("newStaffPassword")
        ?.value ||
      "";
    if (!name) {
      showMessage(
        "❌ الاسم الكامل مطلوب.",
        "error"
      );
      return;
    }
    if (
      !/^[a-z0-9._-]{3,40}$/i.test(
        username
      )
    ) {
      showMessage(
        "❌ Username يجب أن يحتوي على 3 إلى 40 حرفًا أو رقمًا، ويمكن استخدام . _ - فقط.",
        "error"
      );
      return;
    }
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      showMessage(
        "❌ Email غير صالح.",
        "error"
      );
      return;
    }
    if (
      !ROLES[role]
    ) {
      showMessage(
        "❌ الوظيفة المحددة غير صالحة.",
        "error"
      );
      return;
    }
    if (
      password &&
      password.length < 10
    ) {
      showMessage(
        "❌ كلمة المرور يجب أن تكون 10 أحرف على الأقل.",
        "error"
      );
      return;
    }
    const submit =
      $("createStaffSubmit");
    if (submit) {
      submit.disabled =
        true;
      submit.textContent =
        "⏳ جاري إنشاء الحساب...";
    }
    try {
      const result =
        await callStaffAdmin(
          "create",
          {
            full_name:
              name,
            username:
              username,
            email:
              email,
            phone:
              phone || null,
            role:
              role,
            password:
              password || null
          }
        );
      closeModal();
      await loadStaff();
      showTemporaryPasswordResult(
        "تم إنشاء حساب الموظف بنجاح.",
        result?.temporary_password
      );
    } catch (error) {
      console.error(
        "Create staff error:",
        error
      );
      showMessage(
        `❌ تعذر إنشاء الموظف:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
      if (submit) {
        submit.disabled =
          false;
        submit.textContent =
          "➕ إنشاء الحساب";
      }
    }
  }
  /* ==========================================================
     EDIT STAFF MODAL
     ========================================================== */
  function openEditStaffModal(
    staff
  ) {
    const role =
      normalizeRole(
        staff.role
      );
    const content = `
      <div
        class="panel-head"
        style="margin-bottom:20px"
      >
        <div>
          <h2 style="margin:0">
            ✍️ تعديل بيانات الموظف
          </h2>
          <div class="muted">
            ${escapeHTML(
              staff.full_name ||
              "—"
            )}
          </div>
        </div>
        <button
          id="closeEditStaff"
          type="button"
          class="btn btn-secondary"
        >
          ✖️ إغلاق
        </button>
      </div>
      <form id="editStaffForm">
        <div class="grid">
          <label>
            👤 الاسم الكامل
            <input
              id="editStaffName"
              type="text"
              required
              value="${escapeHTML(
                staff.full_name ||
                ""
              )}"
            >
          </label>
          <label>
            📧 Email
            <input
              id="editStaffEmail"
              type="email"
              required
              value="${escapeHTML(
                staff.email ||
                ""
              )}"
              dir="ltr"
            >
          </label>
          <label>
            📱 الهاتف
            <input
              id="editStaffPhone"
              type="tel"
              value="${escapeHTML(
                staff.phone ||
                ""
              )}"
              dir="ltr"
            >
          </label>
          <label>
            🎯 الوظيفة
            <select
              id="editStaffRole"
              required
            >
              ${Object.entries(
                ROLES
              )
                .map(
                  ([key, value]) => `
                    <option
                      value="${key}"
                      ${
                        role === key
                          ? "selected"
                          : ""
                      }
                    >
                      ${value.label}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
        </div>
        <div
          style="
            margin-top:15px;
            padding:14px;
            border-radius:12px;
            background:#f5f7fb;
            line-height:1.8;
          "
        >
          🔒 Username:
          <strong dir="ltr">
            ${escapeHTML(
              staff.username ||
              "—"
            )}
          </strong>
          <br>
          🔐 لتغيير كلمة المرور استخدم
          <strong>Reset Password</strong>.
        </div>
        <div
          style="
            display:flex;
            justify-content:flex-end;
            gap:8px;
            margin-top:20px;
          "
        >
          <button
            id="cancelEditStaff"
            type="button"
            class="btn btn-secondary"
          >
            إلغاء
          </button>
          <button
            id="saveEditStaff"
            type="submit"
            class="btn btn-primary"
          >
            💾 حفظ التعديلات
          </button>
        </div>
      </form>
    `;
    createModal(
      "staffEditModal",
      content,
      "680px"
    );
    $("closeEditStaff")
      ?.addEventListener(
        "click",
        closeModal
      );
    $("cancelEditStaff")
      ?.addEventListener(
        "click",
        closeModal
      );
    $("editStaffForm")
      ?.addEventListener(
        "submit",
        event =>
          saveStaffEdit(
            event,
            staff
          )
      );
  }
  /* ==========================================================
     SAVE EDIT
     ========================================================== */
  async function saveStaffEdit(
    event,
    staff
  ) {
    event.preventDefault();
    const fullName =
      $("editStaffName")
        ?.value
        ?.trim();
    const email =
      normalizeEmail(
        $("editStaffEmail")
          ?.value
      );
    const phone =
      $("editStaffPhone")
        ?.value
        ?.trim();
    const role =
      normalizeRole(
        $("editStaffRole")
          ?.value
      );
    if (!fullName) {
      showMessage(
        "❌ الاسم الكامل مطلوب.",
        "error"
      );
      return;
    }
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      showMessage(
        "❌ Email غير صالح.",
        "error"
      );
      return;
    }
    if (
      !ROLES[role]
    ) {
      showMessage(
        "❌ الوظيفة غير صالحة.",
        "error"
      );
      return;
    }
    const submit =
      $("saveEditStaff");
    if (submit) {
      submit.disabled =
        true;
      submit.textContent =
        "⏳ جاري الحفظ...";
    }
    try {
      await callStaffAdmin(
        "update",
        {
          staff_id:
            staff.id,
          full_name:
            fullName,
          email:
            email,
          phone:
            phone || null,
          role:
            role
        }
      );
      closeModal();
      await loadStaff();
      showMessage(
        "✅ تم تحديث بيانات الموظف بنجاح.",
        "success"
      );
    } catch (error) {
      console.error(
        "Update staff error:",
        error
      );
      showMessage(
        `❌ تعذر تحديث الموظف:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
      if (submit) {
        submit.disabled =
          false;
        submit.textContent =
          "💾 حفظ التعديلات";
      }
    }
  }
  /* ==========================================================
     ROLE MODAL
     ========================================================== */
  function openRoleModal(
    staff
  ) {
    if (
      normalizeRole(
        staff.role
      ) === "OWNER"
    ) {
      showMessage(
        "👑 حساب Owner محمي. لا يمكن تغيير دوره من شاشة الموظفين.",
        "error"
      );
      return;
    }
    const currentRole =
      normalizeRole(
        staff.role
      );
    const content = `
      <div
        class="panel-head"
        style="margin-bottom:20px"
      >
        <div>
          <h2 style="margin:0">
            🎯 تغيير وظيفة الموظف
          </h2>
          <div class="muted">
            👤 ${escapeHTML(
              staff.full_name ||
              "—"
            )}
          </div>
        </div>
        <button
          id="closeRoleModal"
          type="button"
          class="btn btn-secondary"
        >
          ✖️ إغلاق
        </button>
      </div>
      <label>
        🎯 الوظيفة الجديدة
        <select
          id="changeStaffRole"
        >
          ${Object.entries(
            ROLES
          )
            .filter(
              ([key]) =>
                key !== "OWNER"
            )
            .map(
              ([key, value]) => `
                <option
                  value="${key}"
                  ${
                    currentRole === key
                      ? "selected"
                      : ""
                  }
                >
                  ${value.label}
                </option>
              `
            )
            .join("")}
        </select>
      </label>
      <div
        id="roleChangeDescription"
        style="
          margin-top:12px;
          padding:14px;
          border-radius:12px;
          background:#f5f7fb;
          line-height:1.8;
        "
      ></div>
      <div
        style="
          margin-top:15px;
          padding:14px;
          border-radius:12px;
          background:#fff4cc;
          color:#755c00;
          line-height:1.8;
        "
      >
        🔐 الصلاحيات الفعلية لا تعتمد على JavaScript.
        <br>
        🛡️ الـ backend هو الذي يقرر هل يسمح
        المستخدم الحالي بتغيير هذا الدور.
      </div>
      <div
        style="
          display:flex;
          justify-content:flex-end;
          gap:8px;
          margin-top:20px;
        "
      >
        <button
          id="cancelRoleChange"
          type="button"
          class="btn btn-secondary"
        >
          إلغاء
        </button>
        <button
          id="saveRoleChange"
          type="button"
          class="btn btn-primary"
        >
          💾 حفظ الوظيفة
        </button>
      </div>
    `;
    createModal(
      "staffRoleModal",
      content,
      "560px"
    );
    $("closeRoleModal")
      ?.addEventListener(
        "click",
        closeModal
      );
    $("cancelRoleChange")
      ?.addEventListener(
        "click",
        closeModal
      );
    $("changeStaffRole")
      ?.addEventListener(
        "change",
        updateRoleDescription
      );
    $("saveRoleChange")
      ?.addEventListener(
        "click",
        () =>
          saveRoleChange(
            staff
          )
      );
    updateRoleDescription();
  }
  function updateRoleDescription() {
    const role =
      normalizeRole(
        $("changeStaffRole")
          ?.value
      );
    const box =
      $("roleChangeDescription");
    if (!box) {
      return;
    }
    box.innerHTML = `
      🎯 <strong>
        ${getRoleLabel(
          role
        )}
      </strong>
      <br>
      ${escapeHTML(
        getRoleDescription(
          role
        )
      )}
    `;
  }
  async function saveRoleChange(
    staff
  ) {
    const role =
      normalizeRole(
        $("changeStaffRole")
          ?.value
      );
    if (
      !ROLES[role] ||
      role === "OWNER"
    ) {
      showMessage(
        "❌ الوظيفة المحددة غير صالحة.",
        "error"
      );
      return;
    }
    const button =
      $("saveRoleChange");
    if (button) {
      button.disabled =
        true;
      button.textContent =
        "⏳ جاري الحفظ...";
    }
    try {
      await callStaffAdmin(
        "update_role",
        {
          staff_id:
            staff.id,
          role:
            role
        }
      );
      closeModal();
      await loadStaff();
      showMessage(
        "✅ تم تحديث وظيفة الموظف بنجاح.",
        "success"
      );
    } catch (error) {
      console.error(
        "Update role error:",
        error
      );
      showMessage(
        `❌ تعذر تغيير الوظيفة:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
      if (button) {
        button.disabled =
          false;
        button.textContent =
          "💾 حفظ الوظيفة";
      }
    }
  }
  /* ==========================================================
     PASSWORD RESET MODAL
     ========================================================== */
  function openPasswordResetModal(
    staff
  ) {
    const content = `
      <div
        class="panel-head"
        style="margin-bottom:20px"
      >
        <div>
          <h2 style="margin:0">
            🔐 إعادة تعيين كلمة المرور
          </h2>
          <div class="muted">
            👤 ${escapeHTML(
              staff.full_name ||
              "—"
            )}
          </div>
        </div>
        <button
          id="closePasswordModal"
          type="button"
          class="btn btn-secondary"
        >
          ✖️ إغلاق
        </button>
      </div>
      <div
        style="
          padding:15px;
          border-radius:12px;
          background:#f5f7fb;
          line-height:1.8;
        "
      >
        🔐 يمكنك ترك الحقل فارغًا ليقوم
        النظام بإنشاء كلمة مرور مؤقتة قوية
        تلقائيًا.
        <br>
        ⚠️ كلمة المرور ستظهر لك مرة واحدة
        بعد نجاح العملية.
      </div>
      <form
        id="staffPasswordForm"
        style="margin-top:18px"
      >
        <label>
          🔐 كلمة مرور جديدة اختيارية
          <input
            id="staffResetPassword"
            type="password"
            minlength="10"
            autocomplete="new-password"
            placeholder="اتركها فارغة للتوليد التلقائي"
            dir="ltr"
          >
        </label>
        <div
          style="
            display:flex;
            justify-content:flex-end;
            gap:8px;
            margin-top:18px;
          "
        >
          <button
            id="cancelPasswordReset"
            type="button"
            class="btn btn-secondary"
          >
            إلغاء
          </button>
          <button
            id="confirmPasswordReset"
            type="submit"
            class="btn btn-primary"
          >
            🔐 إعادة تعيين
          </button>
        </div>
      </form>
    `;
    createModal(
      "staffPasswordModal",
      content,
      "560px"
    );
    $("closePasswordModal")
      ?.addEventListener(
        "click",
        closeModal
      );
    $("cancelPasswordReset")
      ?.addEventListener(
        "click",
        closeModal
      );
    $("staffPasswordForm")
      ?.addEventListener(
        "submit",
        event =>
          resetStaffPassword(
            event,
            staff
          )
      );
  }
  async function resetStaffPassword(
    event,
    staff
  ) {
    event.preventDefault();
    const password =
      $("staffResetPassword")
        ?.value ||
      "";
    if (
      password &&
      password.length < 10
    ) {
      showMessage(
        "❌ كلمة المرور يجب أن تكون 10 أحرف على الأقل.",
        "error"
      );
      return;
    }
    const button =
      $("confirmPasswordReset");
    if (button) {
      button.disabled =
        true;
      button.textContent =
        "⏳ جاري التحديث...";
    }
    try {
      const result =
        await callStaffAdmin(
          "reset_password",
          {
            staff_id:
              staff.id,
            password:
              password || null
          }
        );
      closeModal();
      showTemporaryPasswordResult(
        "تم إعادة تعيين كلمة المرور بنجاح.",
        result?.temporary_password
      );
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );
      showMessage(
        `❌ تعذر إعادة تعيين كلمة المرور:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
      if (button) {
        button.disabled =
          false;
        button.textContent =
          "🔐 إعادة تعيين";
      }
    }
  }
  /* ==========================================================
     TEMPORARY PASSWORD RESULT
     ========================================================== */
  function showTemporaryPasswordResult(
    title,
    temporaryPassword
  ) {
    if (
      !temporaryPassword
    ) {
      showMessage(
        `✅ ${title}`,
        "success"
      );
      return;
    }
    const content = `
      <div
        style="
          text-align:center;
          direction:rtl;
        "
      >
        <div
          style="
            font-size:42px;
            margin-bottom:8px;
          "
        >
          🔐
        </div>
        <h2>
          ${escapeHTML(
            title
          )}
        </h2>
        <p
          class="muted"
          style="line-height:1.8"
        >
          هذه كلمة المرور متاحة لك الآن.
          <br>
          لا يتم حفظها في هذا الملف.
        </p>
        <div
          style="
            display:flex;
            gap:8px;
            align-items:center;
            margin-top:18px;
          "
        >
          <input
            id="generatedStaffPassword"
            type="text"
            readonly
            value="${escapeHTML(
              temporaryPassword
            )}"
            dir="ltr"
            style="
              flex:1;
              font-family:monospace;
              font-size:16px;
              font-weight:700;
              text-align:center;
            "
          >
          <button
            id="copyStaffPassword"
            type="button"
            class="btn btn-secondary"
          >
            📋 نسخ
          </button>
        </div>
        <div
          style="
            margin-top:15px;
            padding:13px;
            border-radius:12px;
            background:#fff4cc;
            color:#755c00;
            line-height:1.8;
          "
        >
          ⚠️ احتفظ بكلمة المرور بشكل آمن.
          <br>
          لا ترسلها في قناة غير آمنة.
        </div>
        <button
          id="closeGeneratedPassword"
          type="button"
          class="btn btn-primary"
          style="
            margin-top:18px;
          "
        >
          ✅ تم
        </button>
      </div>
    `;
    createModal(
      "staffPasswordModal",
      content,
      "560px"
    );
    $("copyStaffPassword")
      ?.addEventListener(
        "click",
        async () => {
          const input =
            $("generatedStaffPassword");
          if (!input) {
            return;
          }
          try {
            await navigator.clipboard.writeText(
              input.value
            );
            showMessage(
              "📋 تم نسخ كلمة المرور.",
              "success",
              2500
            );
          } catch {
            input.select();
            document.execCommand(
              "copy"
            );
            showMessage(
              "📋 تم نسخ كلمة المرور.",
              "success",
              2500
            );
          }
        }
      );
    $("closeGeneratedPassword")
      ?.addEventListener(
        "click",
        closeModal
      );
    $("generatedStaffPassword")
      ?.focus();
  }
  /* ==========================================================
     DISABLE STAFF
     ========================================================== */
  async function disableStaff(
    staff
  ) {
    if (
      normalizeRole(
        staff.role
      ) === "OWNER"
    ) {
      showMessage(
        "👑 حساب Owner محمي ولا يمكن تعطيله.",
        "error"
      );
      return;
    }
    const confirmed =
      window.confirm(
        `⛔ هل أنت متأكد من تعطيل حساب ${staff.full_name || "هذا الموظف"}؟\n\nسيتم إلغاء الوصول للحساب مع الاحتفاظ بسجل الموظف والعمليات السابقة.`
      );
    if (!confirmed) {
      return;
    }
    try {
      await callStaffAdmin(
        "disable",
        {
          staff_id:
            staff.id
        }
      );
      await loadStaff();
      showMessage(
        "⛔ تم تعطيل حساب الموظف وإلغاء الوصول.",
        "success"
      );
    } catch (error) {
      console.error(
        "Disable staff error:",
        error
      );
      showMessage(
        `❌ تعذر تعطيل الموظف:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
    }
  }
  /* ==========================================================
     ENABLE STAFF
     ========================================================== */
  async function enableStaff(
    staff
  ) {
    if (
      normalizeRole(
        staff.role
      ) === "OWNER"
    ) {
      showMessage(
        "👑 حساب Owner محمي.",
        "error"
      );
      return;
    }
    const confirmed =
      window.confirm(
        `🟢 هل تريد إعادة تفعيل حساب ${staff.full_name || "هذا الموظف"}؟`
      );
    if (!confirmed) {
      return;
    }
    try {
      await callStaffAdmin(
        "enable",
        {
          staff_id:
            staff.id
        }
      );
      await loadStaff();
      showMessage(
        "🟢 تم تفعيل حساب الموظف بنجاح.",
        "success"
      );
    } catch (error) {
      console.error(
        "Enable staff error:",
        error
      );
      showMessage(
        `❌ تعذر تفعيل الموظف:\n${error?.message || "حدث خطأ."}`,
        "error"
      );
    }
  }
  /* ==========================================================
     AUTH LISTENER
     ========================================================== */
  async function setupAuthListener() {
    const client =
      await getSupabaseClient();
    if (
      state.authSubscription
    ) {
      return;
    }
    const result =
      client.auth.onAuthStateChange(
        async (
          event,
          session
        ) => {
          state.currentSession =
            session || null;
          if (
            event === "SIGNED_OUT"
          ) {
            state.staff = [];
            updateStaffStats();
            renderStaffTable();
            return;
          }
          if (
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED"
          ) {
            if (session) {
              /*
                Delay the request slightly to avoid
                racing another Auth operation.
              */
              setTimeout(
                () => {
                  loadStaff();
                },
                0
              );
            }
          }
        }
      );
    state.authSubscription =
      result?.data?.subscription ||
      null;
  }
  /* ==========================================================
     INITIALIZATION
     ========================================================== */
  async function initialize() {
    if (
      state.initialized
    ) {
      return;
    }
    state.initialized =
      true;
    try {
      await getSupabaseClient();
      /*
        admin.html already contains the #staff panel.
      */
      const rendered =
        renderStaffManagement();
      if (!rendered) {
        state.initialized =
          false;
        return;
      }
      await setupAuthListener();
      /*
        getSession is used only to obtain the current browser
        session/token. Authorization itself is enforced by
        staff-admin on the server.
      */
      try {
        await getSession();
      } catch (sessionError) {
        console.info(
          "Azaad Staff Management: no active session yet.",
          sessionError?.message
        );
        return;
      }
      await loadStaff();
    } catch (error) {
      console.error(
        "Azaad Staff Management initialization error:",
        error
      );
      state.initialized =
        false;
      const table =
        $("staffTableContainer");
      if (table) {
        table.innerHTML = `
          <div
            style="
              padding:20px;
              border-radius:14px;
              background:#fff0f2;
              color:#a32939;
              line-height:1.8;
              font-weight:700;
            "
          >
            ❌ تعذر تشغيل إدارة الموظفين.
            <br><br>
            ${escapeHTML(
              error?.message ||
              "حدث خطأ غير معروف."
            )}
          </div>
        `;
      }
    }
  }
  /* ==========================================================
     PUBLIC API
     ========================================================== */
  window.AZAAD_STAFF = {
    init:
      initialize,
    load:
      loadStaff,
    refresh:
      loadStaff,
    openCreate:
      openCreateStaffModal,
    closeModal:
      closeModal,
    getState:
      () => ({
        staff:
          [...state.staff],
        loading:
          state.loading,
        initialized:
          state.initialized
      })
  };
  /* ==========================================================
     START
     ========================================================== */
  function start() {
    /*
      admin.html has its own module initialization.
      We wait briefly so the existing DOM and panel are ready.
    */
    initialize();
  }
  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true
      }
    );
  } else {
    start();
  }
})();
