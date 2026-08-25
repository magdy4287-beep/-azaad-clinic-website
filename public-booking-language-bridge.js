(() => {
  'use strict';
  const KEY = '__AZAAD_PUBLIC_BOOKING_LANGUAGE_BRIDGE_V5__';
  if (window[KEY]) return;
  window[KEY] = true;

  const lang = () => {
    try {
      const value = localStorage.getItem('azaadClinicLanguage');
      if (value === 'en' || value === 'ar') return value;
    } catch (_) {}
    return String(document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  };
  const first = (item, keys) => {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return '';
  };
  const known = new Map([
    ['للصحة النفسية والعلاج النفسي','Mental health and psychotherapy'], ['الصحة النفسية والعلاج النفسي','Mental health and psychotherapy'],
    ['علاج نفسي','Psychotherapy'], ['العلاج النفسي','Psychotherapy'], ['الصحة النفسية','Mental health'], ['الطب النفسي','Psychiatry'],
    ['جلسة علاج نفسي','Psychotherapy session'], ['جلسة أونلاين','Online session'], ['داخل العيادة','In-clinic'],
    ['تقييم نفسي','Psychological assessment'], ['استشارة نفسية','Psychological consultation'], ['علاج القلق','Anxiety treatment'],
    ['علاج الاكتئاب','Depression treatment'], ['العلاج السلوكي المعرفي','Cognitive behavioral therapy'], ['العلاج الأسري','Family therapy'], ['العلاج الزوجي','Couples therapy']
  ]);
  const transliterate = value => {
    const map = {'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ى':'a','ة':'a','ء':'a','ؤ':'w','ئ':'y','لا':'la','ّ':'','َ':'','ً':'','ُ':'','ٌ':'','ِ':'','ٍ':'','ْ':'','ـ':''};
    return String(value).split('').map(ch => map[ch] ?? ch).join('').replace(/\s+/g,' ').trim();
  };
  const englishText = value => {
    let text = String(value || '').trim();
    for (const [ar, en] of known) text = text.replaceAll(ar, en);
    return text.replace(/[\u0600-\u06FF]+/g, token => known.get(token.trim()) || transliterate(token));
  };
  const localized = (item, arKeys, enKeys) => lang() === 'en' ? englishText(first(item, enKeys) || first(item, arKeys)) : first(item, [...arKeys, ...enKeys]);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function renderSelect(id, rows, type) {
    const select = document.getElementById(id); if (!select || !Array.isArray(rows)) return;
    const current = select.value; const en = lang() === 'en';
    const placeholder = type === 'doctor' ? (en ? 'Select doctor' : 'اختر الطبيب') : (en ? 'Select service' : 'اختر الخدمة');
    const html = [`<option value="">${esc(placeholder)}</option>`];
    rows.forEach(item => {
      const name = localized(item, ['name','full_name','display_name','title'], ['name_en','full_name_en','display_name_en','english_name','english_full_name']);
      const title = type === 'doctor' ? localized(item, ['title','specialty'], ['title_en','specialty_en','english_title','english_specialty']) : '';
      const duration = type === 'service' && item?.duration_minutes ? ` — ${esc(item.duration_minutes)} ${en ? 'minutes' : 'دقيقة'}` : '';
      if (item?.id && name) html.push(`<option value="${esc(item.id)}">${esc(name)}${title && title !== name ? ` — ${esc(title)}` : ''}${duration}</option>`);
    });
    const next = html.join('');
    if (select.innerHTML !== next) select.innerHTML = next;
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }

  function repairCards(data) {
    if (!data || lang() !== 'en') return;
    const doctors = Array.isArray(data.doctors) ? data.doctors : [];
    document.querySelectorAll('#doctorsGrid .azaad-doctor-card').forEach((card, index) => {
      const item = doctors[index]; if (!item) return;
      const h = card.querySelector('h3'); const strong = card.querySelector('strong'); const p = card.querySelector('p');
      if (h) h.textContent = localized(item, ['name','full_name','display_name'], ['name_en','full_name_en','display_name_en','english_name','english_full_name']);
      if (strong) strong.textContent = localized(item, ['title','specialty'], ['title_en','specialty_en','english_title','english_specialty']);
      if (p) p.textContent = localized(item, ['bio','description'], ['bio_en','description_en','english_bio','english_description']);
    });
    const services = Array.isArray(data.services) ? data.services : [];
    document.querySelectorAll('#servicesGrid .azaad-service-card').forEach((card, index) => {
      const item = services[index]; if (!item) return;
      const h = card.querySelector('h3'); const p = card.querySelector('p');
      if (h) h.textContent = localized(item, ['name','title'], ['name_en','title_en','english_name']);
      if (p) p.textContent = localized(item, ['description'], ['description_en','english_description']);
    });
    const posts = Array.isArray(data.posts) ? data.posts : [];
    document.querySelectorAll('#clinicPostsGrid .clinic-post-card, #clinicPostsGrid .azaad-post-card, #clinicPostsGrid .card').forEach((card, index) => {
      const item = posts[index]; if (!item) return;
      const title = card.querySelector('h3,h4,strong'); const body = card.querySelector('p');
      if (title) title.textContent = localized(item, ['title','name'], ['title_en','name_en','english_title','english_name']);
      if (body) body.textContent = localized(item, ['content','description','body'], ['content_en','description_en','body_en','english_content','english_description']);
    });
  }

  function repair() {
    const data = window.AZAAD_PUBLIC_CLINIC_DATA;
    if (data) { renderSelect('doctor', data.doctors, 'doctor'); renderSelect('service', data.services, 'service'); repairCards(data); }
  }
  let timer = null;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(repair, 0); };
  window.addEventListener('azaadPublicClinicDataReady', schedule);
  window.addEventListener('azaadPublicClinicDataChanged', schedule);
  window.addEventListener('azaadLanguageChanged', schedule);
  window.addEventListener('azaadPublicContentLanguageChanged', schedule);
  window.addEventListener('storage', event => { if (event.key === 'azaadClinicLanguage') schedule(); });
  [100,500,1200,2500].forEach(ms => setTimeout(repair, ms));
})();
