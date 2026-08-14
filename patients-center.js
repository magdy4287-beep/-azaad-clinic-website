(() => {
  'use strict';

  /* ============================================================
     AZAAD CLINIC - PATIENT CENTER
     Production Patient Management Center
     v7.0.0

     SECURITY:
     - No Service Role Key in browser.
     - Uses the current Supabase Auth user session.
     - Patient authorization is enforced server-side by azaad-patients.
     ============================================================ */

  const SUPABASE_URL =
    'https://derofsthjivlkcdnojww.supabase.co';

  const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa';

  const PATIENTS_API =
    `${SUPABASE_URL}/functions/v1/azaad-patients`;

  const state = {
    patients: [],
    search: '',
    loading: false,
    initialized: false
  };

  const $ = (id) => document.getElementById(id);

  const escapeHTML = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));

  const formatDate = (value) => {
    if (!value) return '—';
    const raw = String(value).slice(0, 10);
    const date = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastAppointment = (value) => {
    if (!value) return 'لا يوجد موعد مسجل';
    const [date = '', time = ''] = String(value).split('T');
    return `${escapeHTML(formatDate(date))}${time ? ` — ⏰ ${escapeHTML(time.slice(0, 5))}` : ''}`;
  };

  const showToast = (message, type = 'info') => {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }

    let toast = $('patientsToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'patientsToast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.background = type === 'error' ? '#a32939' : type === 'success' ? '#167345' : '#17214f';
    toast.classList.add('show');
    clearTimeout(window.__patientsToastTimer);
    window.__patientsToastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  };

  async function getAccessToken() {
    const supabase = window.AZAAD?.supabase;

    if (supabase?.auth) {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!error && data?.session?.access_token) {
          return data.session.access_token;
        }
      } catch (error) {
        console.error('Patient Center session error:', error);
      }
    }

    try {
      return sessionStorage.getItem('azaad_admin_token') || '';
    } catch (_) {
      return '';
    }
  }

  async function api(query, options = {}) {
    const token = await getAccessToken();

    if (!token) {
      throw new Error('جلسة الإدارة غير موجودة أو منتهية. يرجى تسجيل الدخول مرة أخرى.');
    }

    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(`${PATIENTS_API}${query}`, {
      ...options,
      cache: 'no-store',
      headers
    });

    let body = {};
    try {
      body = await response.json();
    } catch (_) {
      body = {};
    }

    if (!response.ok) {
      throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
    }

    return body;
  }

  function injectStyles() {
    if ($('patientsCenterStyles')) return;

    const style = document.createElement('style');
    style.id = 'patientsCenterStyles';
    style.textContent = `
      #patientsPanel{width:100%}
      #patientsPanel .patient-tools{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;margin:15px 0}
      #patientsPanel .patient-card{border:1px solid #e2e6ef;border-radius:14px;padding:15px;background:#fff;transition:box-shadow .2s ease,transform .2s ease}
      #patientsPanel .patient-card:hover{box-shadow:0 8px 25px rgba(23,33,79,.08)}
      #patientsPanel .patient-card+.patient-card{margin-top:10px}
      #patientsPanel .patient-main{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:15px;align-items:center}
      #patientsPanel .patient-mrn{display:inline-flex;align-items:center;gap:6px;background:#eef1f8;color:#17214f;border-radius:999px;padding:5px 10px;font-weight:900;font-size:12px;direction:ltr}
      #patientsPanel .patient-name{font-size:17px;font-weight:900;color:#17214f;margin:7px 0 4px}
      #patientsPanel .patient-meta{color:#6c758c;font-size:12px;line-height:1.9}
      #patientsPanel .patient-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-start}
      #patientsPanel .patient-stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      #patientsPanel .patient-stat{background:#f7f8fb;border:1px solid #e8eaf0;border-radius:10px;padding:7px 10px;font-size:12px;color:#5f6880}
      #patientsPanel .mrn-warning{background:#fff8e6;color:#755c00;border:1px solid #f2df9a;border-radius:10px;padding:10px 12px;margin-top:12px;font-size:12px;line-height:1.8}
      #patientsPanel .patient-empty,#patientsPanel .patient-loading{text-align:center;padding:30px 15px}
      #patientsPanel .patient-error{background:#fff1f2;border:1px solid #f2c5ca;color:#8a2632;border-radius:12px;padding:15px;line-height:1.8}
      #patientsPanel .patient-security{display:flex;gap:8px;align-items:flex-start;margin-top:15px}
      #patientsPanel .patient-security-icon{font-size:20px;line-height:1}
      #patientsPanel .patient-readonly{background:#f5f6f9;color:#596177;cursor:not-allowed}
      @media(max-width:700px){#patientsPanel .patient-tools,#patientsPanel .patient-main{grid-template-columns:1fr}#patientsPanel .patient-actions{width:100%}#patientsPanel .patient-actions .btn{width:100%}#patientsPanel .patient-card{padding:13px}}
    `;
    document.head.appendChild(style);
  }

  function injectUI() {
    const tabs = document.querySelector('.tabs');
    const adminPage = $('adminPage');
    if (!tabs || !adminPage) return false;

    if (!$('patientsTab')) {
      const tab = document.createElement('button');
      tab.id = 'patientsTab';
      tab.className = 'tab';
      tab.dataset.panel = 'patientsPanel';
      tab.type = 'button';
      tab.textContent = '🤢 ملفات المرضى';
      tabs.insertBefore(tab, tabs.firstElementChild);
      tab.addEventListener('click', () => activatePanel('patientsPanel', tab));
    }

    if (!$('patientsPanel')) {
      const panel = document.createElement('section');
      panel.id = 'patientsPanel';
      panel.className = 'panel';
      panel.innerHTML = `
        <div class="card">
          <div class="panel-head">
            <div>
              <h2>🤢 ملفات المرضى</h2>
              <div class="muted">🆔 MRN ثابت مدى الحياة — لا يتغير عند تعديل الاسم أو رقم الهاتف.</div>
            </div>
            <button id="refreshPatientsBtn" class="btn btn-secondary" type="button">🔄 تحديث</button>
          </div>
          <div class="patient-tools">
            <input id="patientSearchInput" type="search" placeholder="🔎 ابحث بالاسم أو الموبايل أو MRN مثل AZA-000001" autocomplete="off">
            <button id="clearPatientSearchBtn" class="btn btn-secondary" type="button">مسح</button>
          </div>
          <div id="patientsCount" class="muted" style="margin-bottom:12px"></div>
          <div id="patientsList" class="items"><div class="empty patient-empty">👥 اضغط تحديث لتحميل ملفات المرضى.</div></div>
          <div class="mrn-warning patient-security">
            <div class="patient-security-icon">🔐</div>
            <div><strong>رقم الملف الطبي MRN</strong><br>هذا الرقم هو المعرف الدائم للمريض. لا يمكن تعديله أو تغييره من لوحة الإدارة، ولا يتم إعادة استخدامه لمريض آخر.<br>✍️ يمكن للإدارة تعديل الاسم ورقم الهاتف فقط وفقًا للصلاحيات المسجلة في النظام.</div>
          </div>
        </div>`;

      const firstPanel = adminPage.querySelector('.panel');
      if (firstPanel) adminPage.insertBefore(panel, firstPanel);
      else adminPage.appendChild(panel);

      $('refreshPatientsBtn')?.addEventListener('click', loadPatients);
      $('clearPatientSearchBtn')?.addEventListener('click', () => {
        const input = $('patientSearchInput');
        if (input) input.value = '';
        state.search = '';
        renderPatients();
      });
      $('patientSearchInput')?.addEventListener('input', (event) => {
        state.search = String(event.target.value || '').trim().toLowerCase();
        renderPatients();
      });
    }

    return true;
  }

  function activatePanel(panelId, activeTab) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab === activeTab));
    document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('active', panel.id === panelId));
    if (panelId === 'patientsPanel') loadPatients();
  }

  function filteredPatients() {
    const q = state.search;
    if (!q) return [...state.patients];
    return state.patients.filter(patient => {
      const text = [patient.mrn, patient.patient_name, patient.patient_phone, patient.patient_phone_normalized, patient.patient_email]
        .filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });
  }

  function renderPatients() {
    const list = $('patientsList');
    const count = $('patientsCount');
    if (!list) return;

    const rows = filteredPatients();
    if (count) count.textContent = `👥 ${rows.length} ملف من أصل ${state.patients.length}`;

    if (!rows.length) {
      list.innerHTML = `<div class="empty patient-empty">📭 لا توجد ملفات مطابقة للبحث.</div>`;
      return;
    }

    list.innerHTML = rows.map(patient => {
      const patientId = escapeHTML(patient.id);
      const mrn = escapeHTML(patient.mrn || '—');
      const name = escapeHTML(patient.patient_name || '—');
      const phone = escapeHTML(patient.patient_phone || '—');
      const email = escapeHTML(patient.patient_email || '');
      const created = escapeHTML(formatDate(patient.created_at));
      const updated = escapeHTML(formatDate(patient.updated_at));
      const bookingCount = Number(patient.booking_count || 0);
      const active = patient.active !== false;

      return `
        <article class="patient-card">
          <div class="patient-main">
            <div>
              <span class="patient-mrn">🆔 ${mrn}</span>
              <div class="patient-name">${name}</div>
              <div class="patient-meta">📲 <span dir="ltr">${phone}</span>${email ? `<br>📧 ${email}` : ''}<br>🗓️ فتح الملف: ${created}<br>🔄 آخر تحديث: ${updated}</div>
            </div>
            <div class="patient-actions">
              <button class="btn btn-primary" type="button" data-edit-patient="${patientId}">✍️ تعديل الاسم والموبايل</button>
            </div>
          </div>
          <div class="patient-stats">
            <span class="patient-stat">📅 عدد الحجوزات: <strong>${bookingCount}</strong></span>
            <span class="patient-stat">🕒 ${formatLastAppointment(patient.last_appointment)}</span>
            <span class="patient-stat">🚦 الحالة: ${active ? '🟢 نشط' : '🔴 غير نشط'}</span>
          </div>
        </article>`;
    }).join('');

    list.querySelectorAll('[data-edit-patient]').forEach(button => {
      button.addEventListener('click', () => {
        const patient = state.patients.find(item => String(item.id) === String(button.dataset.editPatient));
        if (patient) openEditPatient(patient);
      });
    });
  }

  async function loadPatients() {
    if (!$('patientsPanel') || state.loading) return;

    if (typeof window.AZAAD?.hasPermission === 'function' && !(
      window.AZAAD.hasPermission('patients.view') ||
      window.AZAAD.hasPermission('patient.view') ||
      window.AZAAD.hasPermission('bookings.view')
    )) {
      showToast('⛔ ليس لديك صلاحية لعرض ملفات المرضى.', 'error');
      return;
    }

    const list = $('patientsList');
    state.loading = true;
    if (list) list.innerHTML = `<div class="empty patient-loading">⏳ جاري تحميل ملفات المرضى...</div>`;

    try {
      const search = encodeURIComponent(state.search || '');
      const result = await api(`?api=patients&search=${search}`);
      state.patients = Array.isArray(result?.patients) ? result.patients : [];
      renderPatients();
    } catch (error) {
      console.error('Azaad Patient Center:', error);
      if (list) list.innerHTML = `<div class="patient-error">❌ <strong>تعذر تحميل ملفات المرضى.</strong><br>${escapeHTML(error?.message || 'حدث خطأ غير متوقع.')}</div>`;
      showToast(error?.message || 'تعذر تحميل ملفات المرضى.', 'error');
    } finally {
      state.loading = false;
    }
  }

  function openEditPatient(patient) {
    const modal = $('modal');
    const title = $('modalTitle');
    const content = $('modalContent');
    if (!modal || !title || !content) {
      showToast('تعذر فتح نافذة تعديل المريض.', 'error');
      return;
    }

    title.textContent = '✍️ تعديل ملف المريض';
    content.innerHTML = `
      <form id="patientEditForm">
        <div class="grid">
          <label class="full">🆔 MRN<input value="${escapeHTML(patient.mrn || '')}" disabled readonly class="patient-readonly"><small class="muted" style="display:block;margin-top:5px">🔐 رقم الملف الطبي ثابت مدى الحياة ولا يمكن تعديله.</small></label>
          <label>🤢 اسم المريض<input id="editPatientName" name="patient_name" required maxlength="200" autocomplete="name" value="${escapeHTML(patient.patient_name || '')}"></label>
          <label>📲 رقم الموبايل<input id="editPatientPhone" name="patient_phone" type="tel" required maxlength="30" autocomplete="tel" value="${escapeHTML(patient.patient_phone || '')}"></label>
        </div>
        <div class="warning" style="margin-top:15px">🔐 <strong>حماية الملف الطبي</strong><br>تعديل الاسم أو رقم الموبايل لا يغير رقم MRN.<br>📝 سيتم تسجيل عملية التعديل في سجل التدقيق Audit Log.<br>📅 سيتم تحديث بيانات الحجوزات المرتبطة بنفس ملف المريض.</div>
        <div class="modal-actions">
          <button class="btn btn-primary" type="submit" id="savePatientBtn">💾 حفظ التعديل</button>
          <button class="btn btn-secondary" type="button" id="cancelPatientBtn">إلغاء</button>
        </div>
      </form>`;

    modal.classList.add('show');

    $('cancelPatientBtn')?.addEventListener('click', closePatientModal);
    $('patientEditForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = $('savePatientBtn');
      const name = String($('editPatientName')?.value || '').trim();
      const phone = String($('editPatientPhone')?.value || '').trim();

      if (!name) {
        showToast('🤢 اسم المريض مطلوب.', 'error');
        $('editPatientName')?.focus();
        return;
      }
      if (!phone) {
        showToast('📲 رقم الموبايل مطلوب.', 'error');
        $('editPatientPhone')?.focus();
        return;
      }

      if (button) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = '⏳ جاري الحفظ...';
      }

      try {
        const result = await api('?api=patient', {
          method: 'PUT',
          body: JSON.stringify({ id: patient.id, patient_name: name, patient_phone: phone })
        });

        const updatedPatient = result?.patient;
        if (updatedPatient) {
          const index = state.patients.findIndex(item => String(item.id) === String(patient.id));
          if (index >= 0) state.patients[index] = { ...state.patients[index], ...updatedPatient };
        }

        closePatientModal();
        renderPatients();
        showToast(`✅ تم تحديث ملف ${updatedPatient?.mrn || patient.mrn || ''} بنجاح.`, 'success');
      } catch (error) {
        console.error('Patient update:', error);
        showToast(error?.message || 'تعذر تعديل بيانات المريض.', 'error');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = button.dataset.originalText || '💾 حفظ التعديل';
        }
      }
    });
  }

  function closePatientModal() {
    if (typeof window.closeModal === 'function') {
      window.closeModal();
      return;
    }
    $('modal')?.classList.remove('show');
  }

  function bindExistingTabs() {
    document.querySelectorAll('.tab:not(#patientsTab)').forEach(tab => {
      if (tab.dataset.patientCenterBound === '1') return;
      tab.dataset.patientCenterBound = '1';
      tab.addEventListener('click', () => {
        const panelId = tab.dataset.panel;
        document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === tab));
        document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('active', panel.id === panelId));
      });
    });
  }

  function init() {
    if (state.initialized) return true;
    injectStyles();
    if (!injectUI()) return false;
    bindExistingTabs();
    state.initialized = true;
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.AZAAD_PATIENTS = {
    init,
    load: loadPatients,
    refresh: loadPatients,
    get patients() { return [...state.patients]; },
    get state() { return { ...state, patients: [...state.patients] }; }
  };
})();