/* ============================================================
   AZAAD CLINIC
   STAFF MANAGEMENT CENTER
   File: staff-management.js

   Version: 2.0
   Purpose:
   - Employee creation
   - Employee listing
   - Role management
   - Enable / Disable employee
   - Password reset
   - Staff management UI
   - Secure communication with staff-admin-v2 Edge Function

   IMPORTANT:
   This file NEVER contains the Supabase Service Role Key.
   ============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     CONFIGURATION
     ---------------------------------------------------------- */

  const SUPABASE_URL =
    "https://derofsthjivlkcdnojww.supabase.co";

  /*
   IMPORTANT:
   This is the NEW deployed Edge Function.
   Do not change back to staff-admin.
  */
  const STAFF_ADMIN_FUNCTION =
    `${SUPABASE_URL}/functions/v1/staff-admin-v2`;

  const WEBSITE_URL =
    "https://magdy4287-beep.github.io/-azaad-clinic-website/";

  /* ----------------------------------------------------------
     STATE
     ---------------------------------------------------------- */

  const state = {
    staff: [],
    loading: false,
    editingStaffId: null
  };

  /* ----------------------------------------------------------
     ROLE DEFINITIONS
     ---------------------------------------------------------- */

  const ROLES = {
    OWNER: {
      label: "👑 Owner",
      description: "صلاحيات المالك الكاملة",
      protected: true
    },

    ADMIN: {
      label: "🛡️ Admin",
      description: "إدارة النظام والموظفين"
    },

    MANAGER: {
      label: "👨‍💼 Manager",
      description: "إدارة وتشغيل العيادة"
    },

    SECRETARY: {
      label: "👩‍💼 Secretary",
      description: "الحجوزات والمرضى والتحصيل حسب الصلاحيات"
    },

    CASHIER: {
      label: "💰 Cashier",
      description: "المدفوعات والتحصيل والفواتير"
    },

    RECEPTION: {
      label: "🧑‍💼 Reception",
      description: "الاستقبال والحجوزات والبيانات الأساسية"
    },

    DOCTOR: {
      label: "🧑‍⚕️ Doctor",
      description: "المواعيد والمهام الطبية المصرح بها"
    },

    MARKETING: {
      label: "📣 Marketing",
      description: "التسويق والمحتوى والحملات والعروض"
    }
  };

  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */

  function escapeHTML(value) {
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
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    try {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "—";
      }

      return date.toLocaleString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "—";
    }
  }

  function showMessage(
    message,
    type = "info"
  ) {
    let box =
      document.getElementById(
        "staffMessage"
      );

    if (!box) {
      box =
        document.createElement("div");

      box.id =
        "staffMessage";

      box.style.cssText = `
        position:fixed;
        top:20px;
        right:20px;
        z-index:999999;
        max-width:460px;
        padding:14px 18px;
        border-radius:14px;
        color:#fff;
        font-weight:700;
        white-space:pre-line;
        box-shadow:0 10px 30px rgba(0,0,0,.18);
        font-family:inherit;
        direction:rtl;
      `;

      document.body.appendChild(box);
    }

    box.style.background =
      type === "error"
        ? "#a52d3d"
        : type === "success"
        ? "#14734b"
        : "#17214f";

    box.textContent =
      message;

    box.style.display =
      "block";

    clearTimeout(
      window.__staffMessageTimer
    );

    window.__staffMessageTimer =
      setTimeout(() => {
        box.style.display =
          "none";
      }, 6000);
  }

  function getSupabaseClient() {
    if (
      window.AZAAD &&
      window.AZAAD.supabase
    ) {
      return window.AZAAD.supabase;
    }

    /*
      Supabase CDN normally exposes the global
      client as window.supabase only when the
      application initialized it that way.
    */

    if (
      window.supabase &&
      typeof window.supabase.auth ===
        "object"
    ) {
      return window.supabase;
    }

    return null;
  }

  async function getAccessToken() {
    const client =
      getSupabaseClient();

    if (!client) {
      throw new Error(
        "Supabase client غير متاح."
      );
    }

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
        "🔐 يجب تسجيل الدخول أولاً."
      );
    }

    return data.session.access_token;
  }

  async function callStaffAdmin(
    action,
    payload = {}
  ) {
    const token =
      await getAccessToken();

    const response =
      await fetch(
        STAFF_ADMIN_FUNCTION,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`
          },

          body: JSON.stringify({
            action,
            ...payload
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
        `Staff API Error ${response.status}`
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

  /* ----------------------------------------------------------
     ROLE LABEL
     ---------------------------------------------------------- */

  function getRoleLabel(
    role
  ) {
    const key =
      String(
        role || ""
      ).toUpperCase();

    return (
      ROLES[key]?.label ||
      `🎯 ${escapeHTML(
        role || "غير محدد"
      )}`
    );
  }

  /* ----------------------------------------------------------
     ROLE OPTIONS
     ---------------------------------------------------------- */

  function getRoleOptions(
    selectedRole = ""
  ) {
    return Object.entries(
      ROLES
    )
      .map(
        ([key, role]) => `
          <option
            value="${escapeHTML(key)}"
            ${
              String(
                selectedRole || ""
              ).toUpperCase() === key
                ? "selected"
                : ""
            }
          >
            ${escapeHTML(role.label)}
          </option>
        `
      )
      .join("");
  }

  /* ----------------------------------------------------------
     RENDER STAFF MANAGEMENT
     ---------------------------------------------------------- */

  function renderStaffManagement() {
    if (
      document.getElementById(
        "staffManagementCenter"
      )
    ) {
      return;
    }

    const container =
      document.createElement(
        "section"
      );

    container.id =
      "staffManagementCenter";

    container.className =
      "card";

    container.style.cssText = `
      margin-top:20px;
      direction:rtl;
    `;

    container.innerHTML = `

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          margin-bottom:18px;
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
            إنشاء الحسابات وإدارة الوظائف والحالة والوصول
          </div>

        </div>

        <button
          id="addStaffButton"
          class="btn btn-primary"
          type="button"
        >
          ➕ إضافة موظف جديد
        </button>

      </div>


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
          placeholder="🔎 ابحث باسم الموظف أو Username أو Email"
          style="
            flex:1;
            min-width:240px;
            padding:12px 14px;
            border:1px solid #d9deea;
            border-radius:12px;
            font-family:inherit;
          "
        />


        <select
          id="staffRoleFilter"
          style="
            min-width:180px;
            padding:12px;
            border:1px solid #d9deea;
            border-radius:12px;
            font-family:inherit;
          "
        >

          <option value="">
            🎯 كل الوظائف
          </option>

          ${getRoleOptions()}

        </select>


        <button
          id="refreshStaffButton"
          class="btn btn-secondary"
          type="button"
        >
          🔄 تحديث
        </button>

      </div>


      <div
        id="staffTableContainer"
      >
        <div class="empty">
          ⏳ جاري تحميل الموظفين...
        </div>
      </div>

    `;

    const target =
      document.querySelector(
        "#staffPanel"
      ) ||
      document.querySelector(
        "#staff"
      ) ||
      document.querySelector(
        "#adminPage"
      );

    if (!target) {
      return;
    }

    target.appendChild(
      container
    );

    document
      .getElementById(
        "addStaffButton"
      )
      ?.addEventListener(
        "click",
        openCreateStaffModal
      );

    document
      .getElementById(
        "refreshStaffButton"
      )
      ?.addEventListener(
        "click",
        loadStaff
      );

    document
      .getElementById(
        "staffSearch"
      )
      ?.addEventListener(
        "input",
        renderStaffTable
      );

    document
      .getElementById(
        "staffRoleFilter"
      )
      ?.addEventListener(
        "change",
        renderStaffTable
      );
  }

  /* ----------------------------------------------------------
     LOAD STAFF
     ---------------------------------------------------------- */

  async function loadStaff() {
    const table =
      document.getElementById(
        "staffTableContainer"
      );

    if (table) {
      table.innerHTML = `
        <div class="empty">
          ⏳ جاري تحميل بيانات الموظفين...
        </div>
      `;
    }

    state.loading = true;

    try {
      /*
       IMPORTANT:
       We intentionally load through the protected
       Edge Function instead of querying clinic_staff
       directly from the browser.

       This means:
       - no Service Role Key in browser
       - server-side authorization
       - active is the correct DB field
      */

      const result =
        await callStaffAdmin(
          "list"
        );

      state.staff =
        Array.isArray(
          result?.staff
        )
          ? result.staff
          : [];

      renderStaffTable();

      updateStaffStats();

    } catch (error) {
      console.error(
        "Load staff error:",
        error
      );

      state.staff = [];

      if (table) {
        table.innerHTML = `
          <div
            style="
              padding:20px;
              border-radius:14px;
              background:#fff2f2;
              color:#8e2534;
              font-weight:700;
            "
          >
            ❌ تعذر تحميل الموظفين.
            <br><br>
            ${escapeHTML(
              error.message
            )}
          </div>
        `;
      }

    } finally {
      state.loading =
        false;
    }
  }

  /* ----------------------------------------------------------
     STAFF STATS
     ---------------------------------------------------------- */

  function updateStaffStats() {
    const total =
      state.staff.length;

    const active =
      state.staff.filter(
        staff =>
          staff.active !== false
      ).length;

    const inactive =
      total - active;

    const marketing =
      state.staff.filter(
        staff =>
          String(
            staff.role || ""
          ).toUpperCase() ===
          "MARKETING"
      ).length;

    const totalElement =
      document.getElementById(
        "staffTotal"
      );

    const activeElement =
      document.getElementById(
        "staffActive"
      );

    const inactiveElement =
      document.getElementById(
        "staffInactive"
      );

    const marketingElement =
      document.getElementById(
        "marketingCount"
      );

    if (totalElement) {
      totalElement.textContent =
        total;
    }

    if (activeElement) {
      activeElement.textContent =
        active;
    }

    if (inactiveElement) {
      inactiveElement.textContent =
        inactive;
    }

    if (marketingElement) {
      marketingElement.textContent =
        marketing;
    }
  }

  /* ----------------------------------------------------------
     FILTER STAFF
     ---------------------------------------------------------- */

  function getFilteredStaff() {
    const search =
      (
        document.getElementById(
          "staffSearch"
        )?.value || ""
      )
        .trim()
        .toLowerCase();

    const role =
      (
        document.getElementById(
          "staffRoleFilter"
        )?.value || ""
      )
        .trim()
        .toUpperCase();

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
            .join(" ")
            .toLowerCase();

        const matchesSearch =
          !search ||
          searchable.includes(
            search
          );

        const matchesRole =
          !role ||
          String(
            staff.role || ""
          ).toUpperCase() ===
          role;

        return (
          matchesSearch &&
          matchesRole
        );
      }
    );
  }

  /* ----------------------------------------------------------
     STAFF TABLE
     ---------------------------------------------------------- */

  function renderStaffTable() {
    const container =
      document.getElementById(
        "staffTableContainer"
      );

    if (!container) {
      return;
    }

    const rows =
      getFilteredStaff();

    if (!rows.length) {
      container.innerHTML = `
        <div class="empty">
          📭 لا توجد سجلات موظفين مطابقة.
        </div>
      `;

      return;
    }

    container.innerHTML = `

      <div
        style="
          overflow-x:auto;
          border:1px solid #e5e8f0;
          border-radius:14px;
        "
      >

        <table
          style="
            width:100%;
            border-collapse:collapse;
            min-width:1120px;
          "
        >

          <thead>

            <tr>

              <th>👤 الموظف</th>

              <th>🔑 Username</th>

              <th>📧 Email</th>

              <th>🎯 الوظيفة</th>

              <th>🚦 الحالة</th>

              <th>🕐 آخر تحديث</th>

              <th>⚙️ الإجراءات</th>

            </tr>

          </thead>

          <tbody>

            ${rows
              .map(
                staff => {
                  const active =
                    staff.active !== false;

                  const isOwner =
                    String(
                      staff.role || ""
                    ).toUpperCase() ===
                    "OWNER";

                  return `

                    <tr>

                      <td>

                        <strong>
                          ${escapeHTML(
                            staff.full_name ||
                            "-"
                          )}
                        </strong>

                        ${
                          staff.phone
                            ? `
                              <div
                                class="muted"
                                dir="ltr"
                              >
                                📱
                                ${escapeHTML(
                                  staff.phone
                                )}
                              </div>
                            `
                            : ""
                        }

                      </td>


                      <td dir="ltr">

                        ${escapeHTML(
                          staff.username ||
                          "-"
                        )}

                      </td>


                      <td dir="ltr">

                        ${escapeHTML(
                          staff.email ||
                          "-"
                        )}

                      </td>


                      <td>

                        <span class="badge">
                          ${getRoleLabel(
                            staff.role
                          )}
                        </span>

                      </td>


                      <td>

                        ${
                          active
                            ? `
                              <span
                                class="badge badge-confirmed"
                              >
                                🟢 Active
                              </span>
                            `
                            : `
                              <span
                                class="badge badge-cancelled"
                              >
                                🔴 Disabled
                              </span>
                            `
                        }

                      </td>


                      <td>

                        <small>
                          ${formatDate(
                            staff.updated_at ||
                            staff.created_at
                          )}
                        </small>

                      </td>


                      <td>

                        <div
                          style="
                            display:flex;
                            flex-wrap:wrap;
                            gap:6px;
                          "
                        >

                          ${
                            isOwner
                              ? `
                                <button
                                  type="button"
                                  class="btn btn-secondary"
                                  disabled
                                  title="حساب OWNER محمي"
                                >
                                  👑 OWNER
                                </button>
                              `
                              : `
                                <button
                                  type="button"
                                  class="btn btn-secondary"
                                  data-action="role"
                                  data-id="${escapeHTML(
                                    staff.id
                                  )}"
                                >
                                  🎯 Role
                                </button>

                                <button
                                  type="button"
                                  class="btn btn-secondary"
                                  data-action="password"
                                  data-id="${escapeHTML(
                                    staff.id
                                  )}"
                                >
                                  🔐 Reset
                                </button>

                                ${
                                  active
                                    ? `
                                      <button
                                        type="button"
                                        class="btn btn-danger"
                                        data-action="disable"
                                        data-id="${escapeHTML(
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
                                        data-action="enable"
                                        data-id="${escapeHTML(
                                          staff.id
                                        )}"
                                      >
                                        🟢 تفعيل
                                      </button>
                                    `
                                }
                              `
                          }

                        </div>

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

    container
      .querySelectorAll(
        "[data-action]"
      )
      .forEach(
        button => {
          button.addEventListener(
            "click",
            () => {
              const action =
                button.dataset.action;

              const id =
                button.dataset.id;

              handleStaffAction(
                action,
                id
              );
            }
          );
        }
      );
  }

  /* ----------------------------------------------------------
     CREATE STAFF MODAL
     ---------------------------------------------------------- */

  function openCreateStaffModal() {
    closeModal();

    const modal =
      document.createElement(
        "div"
      );

    modal.id =
      "staffModal";

    modal.style.cssText = `
      position:fixed;
      inset:0;
      z-index:999998;
      background:rgba(10,18,45,.65);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      direction:rtl;
    `;

    modal.innerHTML = `

      <div
        style="
          width:min(760px,100%);
          max-height:92vh;
          overflow:auto;
          background:#fff;
          border-radius:22px;
          padding:25px;
          box-shadow:0 25px 70px rgba(0,0,0,.3);
        "
      >

        <div
          style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:10px;
            margin-bottom:20px;
          "
        >

          <div>

            <h2 style="margin:0">
              ➕ إضافة موظف جديد
            </h2>

            <div class="muted">
              إنشاء حساب دخول وربطه بوظيفة الموظف
            </div>

          </div>

          <button
            id="closeStaffModal"
            type="button"
            class="btn btn-secondary"
          >
            ✖
          </button>

        </div>


        <form id="createStaffForm">

          <div
            style="
              display:grid;
              grid-template-columns:
                repeat(auto-fit,minmax(230px,1fr));
              gap:14px;
            "
          >

            <label>

              👤 الاسم الكامل

              <input
                id="newStaffName"
                required
                type="text"
                autocomplete="name"
                placeholder="مثال: Sara Mohamed"
                style="
                  width:100%;
                  margin-top:6px;
                  padding:12px;
                  border:1px solid #d9deea;
                  border-radius:12px;
                  box-sizing:border-box;
                "
              />

            </label>


            <label>

              🔑 Username

              <input
                id="newStaffUsername"
                required
                type="text"
                autocomplete="username"
                pattern="[a-z0-9._-]{3,40}"
                placeholder="مثال: sara"
                style="
                  width:100%;
                  margin-top:6px;
                  padding:12px;
                  border:1px solid #d9deea;
                  border-radius:12px;
                  box-sizing:border-box;
                  direction:ltr;
                  text-align:left;
                "
              />

            </label>


            <label>

              📧 Email

              <input
                id="newStaffEmail"
                required
                type="email"
                autocomplete="email"
                placeholder="employee@example.com"
                style="
                  width:100%;
                  margin-top:6px;
                  padding:12px;
                  border:1px solid #d9deea;
                  border-radius:12px;
                  box-sizing:border-box;
                  direction:ltr;
                  text-align:left;
                "
              />

            </label>


            <label>

              📱 الهاتف

              <input
                id="newStaffPhone"
                type="tel"
                autocomplete="tel"
                placeholder="01xxxxxxxxx"
                style="
                  width:100%;
                  margin-top:6px;
                  padding:12px;
                  border:1px solid #d9deea;
                  border-radius:12px;
                  box-sizing:border-box;
                  direction:ltr;
                  text-align:left;
                "
              />

            </label>


            <label>

              🎯 الوظيفة

              <select
                id="newStaffRole"
                required
                style="
                  width:100%;
                  margin-top:6px;
                  padding:12px;
                  border:1px solid #d9deea;
                  border-radius:12px;
                  box-sizing:border-box;
                "
              >

                <option value="">
                  اختر الوظيفة
                </option>

                ${getRoleOptions()}

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
                style="
                  width:100%;
                  margin-top:6px;
                  padding:12px;
                  border:1px solid #d9deea;
                  border-radius:12px;
                  box-sizing:border-box;
                  direction:ltr;
                  text-align:left;
                "
              />

              <small class="muted">
                🔒 الحد الأدنى 10 أحرف
              </small>

            </label>

          </div>


          <div
            id="marketingPermissionNotice"
            style="
              display:none;
              margin-top:15px;
              padding:14px;
              border-radius:12px;
              background:#f4f0ff;
              color:#493276;
              font-weight:700;
              line-height:1.8;
            "
          >

            📣 <strong>Marketing</strong>

            <br>

            هذا الحساب مخصص للتسويق والمحتوى
            والحملات والعروض.

            <br>

            🙅‍♀️ لا يحصل تلقائيًا على بيانات المرضى
            الطبية أو الحسابات المالية أو إدارة الموظفين.

          </div>


          <div
            id="roleDescription"
            style="
              margin-top:15px;
              padding:14px;
              border-radius:12px;
              background:#f5f7fb;
              color:#46516b;
              line-height:1.8;
            "
          >
            🎯 اختر الوظيفة لعرض وصف الصلاحيات.
          </div>


          <div
            style="
              margin-top:15px;
              padding:14px;
              border-radius:12px;
              background:#f5f7fb;
              color:#46516b;
              line-height:1.8;
            "
          >

            🔐 <strong>الأمان:</strong>

            كلمة المرور لا يتم تخزينها في
            JavaScript أو في جدول الموظفين.

            <br>

            يتم إنشاء حساب Auth من خلال
            Edge Function المؤمنة.

          </div>


          <div
            style="
              display:flex;
              justify-content:flex-end;
              gap:10px;
              margin-top:20px;
            "
          >

            <button
              id="cancelStaffCreation"
              type="button"
              class="btn btn-secondary"
            >
              إلغاء
            </button>


            <button
              type="submit"
              class="btn btn-primary"
            >
              ➕ إنشاء حساب الموظف
            </button>

          </div>

        </form>

      </div>

    `;

    document.body.appendChild(
      modal
    );

    document
      .getElementById(
        "closeStaffModal"
      )
      ?.addEventListener(
        "click",
        closeModal
      );

    document
      .getElementById(
        "cancelStaffCreation"
      )
      ?.addEventListener(
        "click",
        closeModal
      );

    document
      .getElementById(
        "newStaffRole"
      )
      ?.addEventListener(
        "change",
        updateRoleNotice
      );

    document
      .getElementById(
        "createStaffForm"
      )
      ?.addEventListener(
        "submit",
        createStaff
      );

    updateRoleNotice();
  }

  /* ----------------------------------------------------------
     ROLE NOTICE
     ---------------------------------------------------------- */

  function updateRoleNotice() {
    const role =
      document.getElementById(
        "newStaffRole"
      )?.value;

    const marketingNotice =
      document.getElementById(
        "marketingPermissionNotice"
      );

    const roleDescription =
      document.getElementById(
        "roleDescription"
      );

    if (marketingNotice) {
      marketingNotice.style.display =
        role === "MARKETING"
          ? "block"
          : "none";
    }

    if (roleDescription) {
      if (
        role &&
        ROLES[role]
      ) {
        roleDescription.innerHTML = `
          🎯 <strong>
            ${escapeHTML(
              ROLES[role].label
            )}
          </strong>

          <br>

          ${escapeHTML(
            ROLES[role].description
          )}
        `;
      } else {
        roleDescription.innerHTML =
          "🎯 اختر الوظيفة لعرض وصف الصلاحيات.";
      }
    }
  }

  /* ----------------------------------------------------------
     CLOSE MODAL
     ---------------------------------------------------------- */

  function closeModal() {
    document
      .getElementById(
        "staffModal"
      )
      ?.remove();

    document
      .getElementById(
        "staffActionModal"
      )
      ?.remove();
  }

  /* ----------------------------------------------------------
     CREATE STAFF
     ---------------------------------------------------------- */

  async function createStaff(
    event
  ) {
    event.preventDefault();

    const name =
      document
        .getElementById(
          "newStaffName"
        )
        ?.value
        ?.trim();

    const username =
      document
        .getElementById(
          "newStaffUsername"
        )
        ?.value
        ?.trim()
        .toLowerCase();

    const email =
      document
        .getElementById(
          "newStaffEmail"
        )
        ?.value
        ?.trim()
        .toLowerCase();

    const phone =
      document
        .getElementById(
          "newStaffPhone"
        )
        ?.value
        ?.trim();

    const role =
      document
        .getElementById(
          "newStaffRole"
        )
        ?.value;

    const password =
      document
        .getElementById(
          "newStaffPassword"
        )
        ?.value || "";

    if (!name) {
      showMessage(
        "❌ الاسم مطلوب.",
        "error"
      );
      return;
    }

    if (!username) {
      showMessage(
        "❌ Username مطلوب.",
        "error"
      );
      return;
    }

    if (
      !/^[a-z0-9._-]{3,40}$/.test(
        username
      )
    ) {
      showMessage(
        "❌ Username يجب أن يحتوي على حروف إنجليزية صغيرة أو أرقام أو . _ - فقط، من 3 إلى 40 حرفًا.",
        "error"
      );
      return;
    }

    if (!email) {
      showMessage(
        "❌ Email مطلوب.",
        "error"
      );
      return;
    }

    if (!role) {
      showMessage(
        "❌ اختر وظيفة الموظف.",
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
      event.submitter;

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

            /*
             The Edge Function accepts both
             password and temp_password.
            */
            password:
              password || null
          }
        );

      closeModal();

      await loadStaff();

      let successMessage =
        "✅ تم إنشاء حساب الموظف بنجاح.";

      if (
        result?.temporary_password
      ) {
        successMessage +=
          `\n🔐 كلمة المرور المؤقتة:\n${result.temporary_password}\n\n⚠️ احفظها الآن؛ لا نعرضها مرة أخرى تلقائيًا.`;
      }

      showMessage(
        successMessage,
        "success"
      );

    } catch (error) {
      console.error(
        "Create staff error:",
        error
      );

      showMessage(
        `❌ تعذر إنشاء الموظف:\n${error.message}`,
        "error"
      );

      if (submit) {
        submit.disabled =
          false;

        submit.textContent =
          "➕ إنشاء حساب الموظف";
      }
    }
  }

  /* ----------------------------------------------------------
     STAFF ACTIONS
     ---------------------------------------------------------- */

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

    if (
      String(
        staff.role || ""
      ).toUpperCase() ===
      "OWNER"
    ) {
      showMessage(
        "👑 حساب OWNER محمي ولا يمكن تعديل حالته من هنا.",
        "error"
      );
      return;
    }

    if (action === "role") {
      openRoleModal(
        staff
      );
      return;
    }

    if (action === "password") {
      await resetStaffPassword(
        staff
      );
      return;
    }

    if (action === "disable") {
      await disableStaff(
        staff
      );
      return;
    }

    if (action === "enable") {
      await enableStaff(
        staff
      );
      return;
    }
  }

  /* ----------------------------------------------------------
     ROLE MODAL
     ---------------------------------------------------------- */

  function openRoleModal(
    staff
  ) {
    closeModal();

    const modal =
      document.createElement(
        "div"
      );

    modal.id =
      "staffActionModal";

    modal.style.cssText = `
      position:fixed;
      inset:0;
      z-index:999999;
      background:rgba(10,18,45,.65);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      direction:rtl;
    `;

    modal.innerHTML = `

      <div
        style="
          width:min(520px,100%);
          max-height:90vh;
          overflow:auto;
          background:#fff;
          border-radius:20px;
          padding:24px;
          box-shadow:0 25px 70px rgba(0,0,0,.3);
        "
      >

        <h2>
          🎯 تغيير وظيفة الموظف
        </h2>

        <p>
          👤
          <strong>
            ${escapeHTML(
              staff.full_name ||
              "-"
            )}
          </strong>
        </p>

        <p class="muted">
          🔑 Username:
          ${escapeHTML(
            staff.username ||
            "-"
          )}
        </p>

        <label>

          🎯 الوظيفة الجديدة

          <select
            id="changeStaffRole"
            style="
              width:100%;
              margin-top:8px;
              padding:12px;
              border:1px solid #d9deea;
              border-radius:12px;
              box-sizing:border-box;
            "
          >

            ${getRoleOptions(
              staff.role
            )}

          </select>

        </label>


        <div
          id="editRoleDescription"
          style="
            margin-top:14px;
            padding:14px;
            border-radius:12px;
            background:#f5f7fb;
            line-height:1.8;
          "
        >
        </div>


        <div
          style="
            display:flex;
            justify-content:flex-end;
            gap:10px;
            margin-top:20px;
          "
        >

          <button
            id="cancelRoleChange"
            class="btn btn-secondary"
            type="button"
          >
            إلغاء
          </button>

          <button
            id="saveRoleChange"
            class="btn btn-primary"
            type="button"
          >
            💾 حفظ الوظيفة
          </button>

        </div>

      </div>

    `;

    document.body.appendChild(
      modal
    );

    const roleSelect =
      document.getElementById(
        "changeStaffRole"
      );

    const description =
      document.getElementById(
        "editRoleDescription"
      );

    function updateDescription() {
      const role =
        roleSelect?.value;

      if (
        description &&
        role &&
        ROLES[role]
      ) {
        description.innerHTML = `
          🎯 <strong>
            ${escapeHTML(
              ROLES[role].label
            )}
          </strong>

          <br>

          ${escapeHTML(
            ROLES[role].description
          )}
        `;
      }
    }

    roleSelect?.addEventListener(
      "change",
      updateDescription
    );

    updateDescription();

    document
      .getElementById(
        "cancelRoleChange"
      )
      ?.addEventListener(
        "click",
        closeModal
      );

    document
      .getElementById(
        "saveRoleChange"
      )
      ?.addEventListener(
        "click",
        async event => {
          const role =
            roleSelect?.value;

          if (!role) {
            showMessage(
              "❌ اختر الوظيفة.",
              "error"
            );
            return;
          }

          const button =
            event.currentTarget;

          button.disabled =
            true;

          button.textContent =
            "⏳ جاري الحفظ...";

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
              "✅ تم تحديث وظيفة الموظف.",
              "success"
            );

          } catch (
            error
          ) {
            console.error(
              "Update role error:",
              error
            );

            showMessage(
              `❌ تعذر تغيير الوظيفة:\n${error.message}`,
              "error"
            );

            button.disabled =
              false;

            button.textContent =
              "💾 حفظ الوظيفة";
          }
        }
      );
  }

  /* ----------------------------------------------------------
     RESET PASSWORD
     ---------------------------------------------------------- */

  async function resetStaffPassword(
    staff
  ) {
    const confirmed =
      window.confirm(
        `🔐 هل تريد إعادة تعيين كلمة مرور ${staff.full_name || "الموظف"}؟\n\nسيتم إبطال كلمة المرور الحالية واستبدالها بكلمة مرور جديدة.`
      );

    if (!confirmed) {
      return;
    }

    try {
      const result =
        await callStaffAdmin(
          "reset_password",
          {
            staff_id:
              staff.id
          }
        );

      let message =
        "✅ تم إعادة تعيين كلمة المرور.";

      if (
        result?.temporary_password
      ) {
        message +=
          `\n🔐 كلمة المرور الجديدة:\n${result.temporary_password}\n\n⚠️ احفظها الآن.`;
      }

      showMessage(
        message,
        "success"
      );

    } catch (
      error
    ) {
      console.error(
        "Reset password error:",
        error
      );

      showMessage(
        `❌ تعذر إعادة تعيين كلمة المرور:\n${error.message}`,
        "error"
      );
    }
  }

  /* ----------------------------------------------------------
     DISABLE STAFF
     ---------------------------------------------------------- */

  async function disableStaff(
    staff
  ) {
    const confirmed =
      window.confirm(
        `⛔ هل أنت متأكد من تعطيل حساب ${staff.full_name || "هذا الموظف"}؟\n\nسيتم إلغاء وصول الموظف للنظام، مع الاحتفاظ بسجل الموظف والعمليات السابقة.`
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

    } catch (
      error
    ) {
      console.error(
        "Disable staff error:",
        error
      );

      showMessage(
        `❌ تعذر تعطيل الموظف:\n${error.message}`,
        "error"
      );
    }
  }

  /* ----------------------------------------------------------
     ENABLE STAFF
     ---------------------------------------------------------- */

  async function enableStaff(
    staff
  ) {
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
        "🟢 تم تفعيل حساب الموظف.",
        "success"
      );

    } catch (
      error
    ) {
      console.error(
        "Enable staff error:",
        error
      );

      showMessage(
        `❌ تعذر تفعيل الموظف:\n${error.message}`,
        "error"
      );
    }
  }

  /* ----------------------------------------------------------
     INSERT STAFF PANEL TAB IF NEEDED
     ---------------------------------------------------------- */

  function ensureStaffTab() {
    const existing =
      document.querySelector(
        '[data-panel="staffPanel"]'
      );

    if (existing) {
      return;
    }

    const tabs =
      document.querySelector(
        ".tabs"
      ) ||
      document.querySelector(
        ".nav-tabs"
      ) ||
      document.querySelector(
        ".sidebar"
      );

    if (!tabs) {
      return;
    }

    const button =
      document.createElement(
        "button"
      );

    button.type =
      "button";

    button.className =
      "tab";

    button.dataset.panel =
      "staffPanel";

    button.textContent =
      "👥 الموظفون";

    button.addEventListener(
      "click",
      () => {
        const panel =
          document.getElementById(
            "staffPanel"
          );

        if (panel) {
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

          loadStaff();
        }
      }
    );

    tabs.appendChild(
      button
    );
  }

  /* ----------------------------------------------------------
     CREATE STAFF PANEL
     ---------------------------------------------------------- */

  function ensureStaffPanel() {
    let panel =
      document.getElementById(
        "staffPanel"
      );

    if (panel) {
      return panel;
    }

    const adminPage =
      document.getElementById(
        "adminPage"
      );

    if (!adminPage) {
      return null;
    }

    panel =
      document.createElement(
        "section"
      );

    panel.id =
      "staffPanel";

    panel.className =
      "panel";

    panel.innerHTML = `
      <div class="card">
        <div class="empty">
          👥 جاري تجهيز إدارة الموظفين...
        </div>
      </div>
    `;

    adminPage.appendChild(
      panel
    );

    return panel;
  }

  /* ----------------------------------------------------------
     INITIALIZATION
     ---------------------------------------------------------- */

  async function initialize() {
    /*
      admin.js should initialize the Supabase client
      and session before this module runs.

      We wait briefly to avoid racing admin.js.
    */

    let attempts =
      0;

    while (
      attempts < 50
    ) {
      if (
        getSupabaseClient()
      ) {
        break;
      }

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            100
          )
      );

      attempts++;
    }

    if (
      !getSupabaseClient()
    ) {
      console.error(
        "Azaad Staff Management: Supabase client unavailable."
      );

      return;
    }

    ensureStaffPanel();

    renderStaffManagement();

    ensureStaffTab();

    /*
      The initial load is intentionally protected
      by the Edge Function.
    */
    await loadStaff();
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */

  window.AZAAD_STAFF = {
    init:
      initialize,

    load:
      loadStaff,

    openCreate:
      openCreateStaffModal,

    refresh:
      loadStaff,

    state
  };

  /* ----------------------------------------------------------
     START
     ---------------------------------------------------------- */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

})();
