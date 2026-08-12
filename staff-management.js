/* ============================================================
   AZAAD CLINIC
   STAFF MANAGEMENT CENTER
   File: staff-management.js

   Purpose:
   - Employee creation
   - Employee listing
   - Role management
   - Enable / Disable employee
   - Password reset
   - Staff permissions UI
   - Secure communication with staff-admin Edge Function

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

  const STAFF_ADMIN_FUNCTION =
    `${SUPABASE_URL}/functions/v1/staff-admin`;

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
        z-index:99999;
        max-width:420px;
        padding:14px 18px;
        border-radius:14px;
        color:#fff;
        font-weight:700;
        box-shadow:0 10px 30px rgba(0,0,0,.18);
        font-family:inherit;
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
      }, 4500);
  }

  function getSupabaseClient() {
    if (
      window.AZAAD &&
      window.AZAAD.supabase
    ) {
      return window.AZAAD.supabase;
    }

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
        "يجب تسجيل الدخول أولاً."
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
     ROLE DEFINITIONS
     ---------------------------------------------------------- */

  const ROLES = {
    OWNER: {
      label: "👑 Owner",
      description:
        "صلاحيات المالك الكاملة"
    },

    ADMIN: {
      label: "🛡️ Admin",
      description:
        "إدارة النظام والموظفين"
    },

    MANAGER: {
      label: "👨‍💼 Manager",
      description:
        "إدارة تشغيل العيادة"
    },

    SECRETARY: {
      label: "👩‍💼 Secretary",
      description:
        "الحجوزات والتحصيل والمتابعة"
    },

    CASHIER: {
      label: "💰 Cashier",
      description:
        "المدفوعات والفواتير"
    },

    RECEPTION: {
      label: "🧑‍💼 Reception",
      description:
        "استقبال المرضى والحجوزات"
    },

    DOCTOR: {
      label: "🧑‍⚕️ Doctor",
      description:
        "المواعيد والمهام الطبية المصرح بها"
    },

    MARKETING: {
      label: "📣 Marketing",
      description:
        "التسويق والمحتوى والحملات"
    }
  };

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

          <div
            class="muted"
          >
            إنشاء الحسابات وإدارة الوظائف والصلاحيات
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

        <div
          class="stat"
        >
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


        <div
          class="stat"
        >
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


        <div
          class="stat"
        >
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


        <div
          class="stat"
        >
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

          ${Object.entries(ROLES)
            .map(
              ([key, role]) => `
                <option value="${key}">
                  ${role.label}
                </option>
              `
            )
            .join("")}

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
        <div
          class="empty"
        >
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

      const client =
        getSupabaseClient();

      if (!client) {
        throw new Error(
          "Supabase client غير متاح."
        );
      }

      /*
       IMPORTANT:
       RLS decides which authenticated employee
       is allowed to read staff records.
      */

      const {
        data,
        error
      } =
        await client
          .from("clinic_staff")
          .select(`
            id,
            auth_user_id,
            full_name,
            username,
            email,
            phone,
            role,
            is_active,
            created_at,
            updated_at
          `)
          .order(
            "created_at",
            {
              ascending:false
            }
          );

      if (error) {
        throw error;
      }

      state.staff =
        data || [];

      renderStaffTable();

      updateStaffStats();

    } catch (error) {

      console.error(
        "Load staff error:",
        error
      );

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
          staff.is_active !== false
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

    if (totalElement)
      totalElement.textContent =
        total;

    if (activeElement)
      activeElement.textContent =
        active;

    if (inactiveElement)
      inactiveElement.textContent =
        inactive;

    if (marketingElement)
      marketingElement.textContent =
        marketing;
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
            min-width:900px;
          "
        >

          <thead>

            <tr>

              <th>👤 الموظف</th>

              <th>🔑 Username</th>

              <th>📧 Email</th>

              <th>🎯 الوظيفة</th>

              <th>🚦 الحالة</th>

              <th>⚙️ الإجراءات</th>

            </tr>

          </thead>

          <tbody>

            ${rows
              .map(
                staff => {

                  const active =
                    staff.is_active !==
                    false;

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

                        <span
                          class="badge"
                        >
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

                        <div
                          style="
                            display:flex;
                            flex-wrap:wrap;
                            gap:6px;
                          "
                        >

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
      z-index:99998;
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

            <h2
              style="margin:0"
            >
              ➕ إضافة موظف جديد
            </h2>

            <div class="muted">
              إنشاء حساب دخول وصلاحيات للموظف
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


        <form
          id="createStaffForm"
        >

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

                ${Object.entries(
                  ROLES
                )
                  .map(
                    ([key, role]) => `
                      <option value="${key}">
                        ${role.label}
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
                minlength="8"
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
            "
          >

            📣 هذا حساب Marketing.

            <br><br>

            سيحصل على صلاحيات التسويق والمحتوى
            والحملات والـLeads فقط حسب إعدادات
            RLS والصلاحيات.

            <br>

            🙅‍♀️ لن يحصل تلقائيًا على صلاحيات
            المرضى الطبية أو المالية أو إدارة الموظفين.

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
            JavaScript أو جدول الموظفين.

            <br>

            سيتم إرسال عملية إنشاء الحساب إلى
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
        updateMarketingNotice
      );

    document
      .getElementById(
        "createStaffForm"
      )
      ?.addEventListener(
        "submit",
        createStaff
      );

    updateMarketingNotice();
  }

  /* ----------------------------------------------------------
     MARKETING NOTICE
     ---------------------------------------------------------- */

  function updateMarketingNotice() {

    const role =
      document.getElementById(
        "newStaffRole"
      )?.value;

    const notice =
      document.getElementById(
        "marketingPermissionNotice"
      );

    if (!notice) {
      return;
    }

    notice.style.display =
      role === "MARKETING"
        ? "block"
        : "none";
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
      password.length < 8
    ) {

      showMessage(
        "❌ كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
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
          `\n🔐 كلمة المرور المؤقتة: ${result.temporary_password}`;

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
        `❌ تعذر إنشاء الموظف: ${error.message}`,
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
      z-index:99999;
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
          width:min(500px,100%);
          background:#fff;
          border-radius:20px;
          padding:24px;
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

        <label>

          الوظيفة الجديدة

          <select
            id="changeStaffRole"
            style="
              width:100%;
              margin-top:8px;
              padding:12px;
              border:1px solid #d9deea;
              border-radius:12px;
            "
          >

            ${Object.entries(
              ROLES
            )
              .map(
                ([key, role]) => `
                  <option
                    value="${key}"
                    ${
                      String(
                        staff.role || ""
                      ).toUpperCase() ===
                      key
                        ? "selected"
                        : ""
                    }
                  >
                    ${role.label}
                  </option>
                `
              )
              .join("")}

          </select>

        </label>


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
        async () => {

          const role =
            document
              .getElementById(
                "changeStaffRole"
              )
              ?.value;

          if (!role) {
            return;
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
              "✅ تم تحديث وظيفة الموظف.",
              "success"
            );

          } catch (
            error
          ) {

            console.error(
              error
            );

            showMessage(
              `❌ ${error.message}`,
              "error"
            );

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
        `🔐 هل تريد إعادة تعيين كلمة مرور ${staff.full_name || "الموظف"}؟`
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
          `\n🔐 كلمة المرور المؤقتة: ${result.temporary_password}`;

      }

      showMessage(
        message,
        "success"
      );

    } catch (
      error
    ) {

      console.error(
        error
      );

      showMessage(
        `❌ تعذر إعادة تعيين كلمة المرور: ${error.message}`,
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
        `⛔ هل أنت متأكد من إلغاء صلاحيات ${staff.full_name || "هذا الموظف"}؟\n\nسيتم تعطيل تسجيل الدخول مع الاحتفاظ بسجل الموظف والعمليات السابقة.`
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
        error
      );

      showMessage(
        `❌ تعذر تعطيل الموظف: ${error.message}`,
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
        error
      );

      showMessage(
        `❌ تعذر تفعيل الموظف: ${error.message}`,
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
      <div
        class="card"
      >
        <div
          class="empty"
        >
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
      Wait briefly because admin.js is responsible
      for initializing the Supabase client and session.
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
