(() => {
  'use strict';

  const db = () => window.AZAAD?.supabase;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const toast = message => {
    const x = document.getElementById('toast');
    if (!x) return;
    x.textContent = message;
    x.classList.add('show');
    setTimeout(() => x.classList.remove('show'), 2800);
  };

  let renderTimer = null;
  let loading = false;

  function cardForProfile(id) {
    const input = document.getElementById(`ptp-name-${id}`);
    return input?.closest('.card') || null;
  }

  function serviceName(service) {
    return service.name || service.name_en || 'Service';
  }

  function renderServiceEditor(card, profile, doctorId, services, overrides) {
    if (!card || !doctorId) return;
    card.querySelector('[data-doctor-services-editor]')?.remove();

    const byService = new Map(
      overrides
        .filter(row => String(row.doctor_id) === String(doctorId))
        .map(row => [String(row.service_id), row])
    );

    const host = document.createElement('div');
    host.dataset.doctorServicesEditor = 'true';
    host.style.cssText = 'margin-top:14px;padding:14px;border:1px solid rgba(23,33,79,.12);border-radius:14px;background:rgba(23,33,79,.025);';

    const title = document.createElement('div');
    title.innerHTML = '<strong>🩺 الخدمات المقدمة للدكتور / Doctor services</strong><div class="muted" style="margin-top:4px">الخدمة مفعّلة تلقائيًا ما لم يتم إيقافها لهذا الدكتور فقط. / New active clinic services are enabled automatically.</div>';
    host.appendChild(title);

    const list = document.createElement('div');
    list.style.cssText = 'display:grid;gap:8px;margin-top:10px;';

    services.forEach(service => {
      const override = byService.get(String(service.id));
      const enabled = override ? override.enabled !== false : true;
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fff;border-radius:10px;cursor:pointer;';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = enabled;
      checkbox.disabled = service.active === false;
      checkbox.dataset.doctorServiceToggle = 'true';
      checkbox.dataset.doctorId = doctorId;
      checkbox.dataset.serviceId = service.id;
      const text = document.createElement('span');
      text.innerHTML = `<strong>${esc(serviceName(service))}</strong>${service.name_en ? ` <span class="muted">(${esc(service.name_en)})</span>` : ''}${service.duration_minutes ? ` <span class="muted">• ${esc(service.duration_minutes)} min</span>` : ''}${service.active === false ? ' <span class="muted">• غير نشطة / Inactive</span>' : ''}`;
      row.append(checkbox, text);
      list.appendChild(row);
    });

    if (!services.length) {
      list.innerHTML = '<div class="muted">لا توجد خدمات في الكتالوج المركزي حاليًا. / No services in the central catalog.</div>';
    }

    host.appendChild(list);
    card.appendChild(host);

    host.querySelectorAll('[data-doctor-service-toggle]').forEach(input => {
      input.addEventListener('change', async () => {
        input.disabled = true;
        const previous = !input.checked;
        const { data, error } = await db().rpc('clinic_admin_set_doctor_service', {
          p_doctor_id: input.dataset.doctorId,
          p_service_id: input.dataset.serviceId,
          p_enabled: input.checked
        });
        if (error || data !== true) {
          input.checked = previous;
          toast(`❌ ${error?.message || 'تعذر حفظ خدمة الدكتور.'}`);
        } else {
          toast(input.checked ? '✅ تم تفعيل الخدمة لهذا الدكتور.' : '⏸️ تم إيقاف الخدمة لهذا الدكتور.');
        }
        input.disabled = serviceIsInactive(services, input.dataset.serviceId);
      });
    });
  }

  function serviceIsInactive(services, serviceId) {
    return services.find(s => String(s.id) === String(serviceId))?.active === false;
  }

  async function load() {
    const host = document.getElementById('azaadPublicTeamAdmin');
    const database = db();
    if (!host || !database || loading) return;
    loading = true;
    try {
      const profilesResult = await database
        .from('clinic_public_team_profiles')
        .select('id,staff_id,display_name')
        .order('sort_order');
      if (profilesResult.error) throw profilesResult.error;

      const profiles = profilesResult.data || [];
      const staffIds = profiles.map(p => p.staff_id).filter(Boolean);
      const [staffResult, servicesResult, overridesResult] = await Promise.all([
        staffIds.length
          ? database.from('clinic_staff').select('id,doctor_id').in('id', staffIds)
          : Promise.resolve({ data: [], error: null }),
        database.from('clinic_services').select('id,name,name_en,duration_minutes,active,sort_order').order('sort_order').order('created_at'),
        database.from('clinic_doctor_service_overrides').select('doctor_id,service_id,enabled')
      ]);
      if (staffResult.error) throw staffResult.error;
      if (servicesResult.error) throw servicesResult.error;
      if (overridesResult.error) throw overridesResult.error;

      const doctorByStaff = new Map((staffResult.data || []).map(row => [String(row.id), row.doctor_id]));
      const services = servicesResult.data || [];
      const overrides = overridesResult.data || [];

      profiles.forEach(profile => {
        const doctorId = doctorByStaff.get(String(profile.staff_id));
        const card = cardForProfile(profile.id);
        if (card && doctorId) renderServiceEditor(card, profile, doctorId, services, overrides);
      });
    } catch (error) {
      console.error('[AZAAD] doctor service editor failed', error);
      document.querySelectorAll('[data-doctor-services-editor]').forEach(node => node.remove());
    } finally {
      loading = false;
    }
  }

  function scheduleLoad() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(load, 150);
  }

  function boot() {
    if (!db()) return;
    scheduleLoad();
    const observer = new MutationObserver(scheduleLoad);
    observer.observe(document.body, { childList: true, subtree: true });
    window.AZAAD_DOCTOR_SERVICES_ADMIN = { load };
  }

  const wait = setInterval(() => {
    if (db() && document.getElementById('azaadPublicTeamAdmin')) {
      clearInterval(wait);
      boot();
    }
  }, 500);
  setTimeout(() => clearInterval(wait), 20000);
})();
