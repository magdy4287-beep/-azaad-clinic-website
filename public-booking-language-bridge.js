(() => {
  'use strict';
  const KEY = '__AZAAD_PUBLIC_BOOKING_LANGUAGE_BRIDGE_V2__';
  if (window[KEY]) return;
  window[KEY] = true;

  const lang = () => {
    try {
      const saved = localStorage.getItem('azaadClinicLanguage');
      if (saved === 'en' || saved === 'ar') return saved;
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

  const knownArabic = new Map([
    ['للصحة النفسية والعلاج النفسي', 'Mental health and psychotherapy'],
    ['الصحة النفسية والعلاج النفسي', 'Mental health and psychotherapy'],
    ['علاج نفسي', 'Psychotherapy'],
    ['العلاج النفسي', 'Psychotherapy'],
    ['الصحة النفسية', 'Mental health'],
    ['الطب النفسي', 'Psychiatry'],
    ['جلسة علاج نفسي', 'Psychotherapy session'],
    ['جلسة أونلاين', 'Online session'],
    ['داخل العيادة', 'In-clinic'],
    ['تقييم نفسي', 'Psychological assessment'],
    ['استشارة نفسية', 'Psychological consultation'],
    ['علاج القلق', 'Anxiety treatment'],
    ['علاج الاكتئاب', 'Depression treatment'],
    ['العلاج السلوكي المعرفي', 'Cognitive behavioral therapy'],
    ['العلاج الأسري', 'Family therapy'],
    ['العلاج الزوجي', 'Couples therapy']
  ]);

  const phraseTranslate = value => {
    let text = String(value || '').trim();
    if (!text) return '';
    if (knownArabic.has(text)) return knownArabic.get(text);
    for (const [ar, en] of knownArabic) text = text.replaceAll(ar, en);
    if (!/[\u0600-\u06FF]/.test(text)) return text;
    return text.replace(/[\u0600-\u06FF]+/g, token => {
      const normalized = token.trim();
      if (knownArabic.has(normalized)) return knownArabic.get(normalized);
      return transliterateArabic(normalized);
    });
  };

  const transliterateArabic = value => {
    const map = {
      'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ي':'y','ى':'a','ة':'a','ء':'a','ؤ':'w','ئ':'y','ﻻ':'la','لا':'la','ّ':'','َ':'','ً':'','ُ':'','ٌ':'','ِ':'','ٍ':'','ْ':'','ـ':''
    };
    return String(value).split('').map(ch => map[ch] ?? ch).join('').replace(/\s+/g, ' ').trim();
  };

  const localized = (item, arKeys, enKeys) => {
    if (lang() !== 'en') return first(item, arKeys.concat(enKeys));
    return phraseTranslate(first(item, enKeys) || first(item, arKeys));
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function renderSelect(id, rows, type) {
    const select = document.getElementById(id);
    if (!select || !Array.isArray(rows)) return;
    const current = select.value;
    const english = lang() === 'en';
    const placeholder = type === 'doctor'
      ? (english ? 'Select doctor' : 'اختر الطبيب')
      : (english ? 'Select service' : 'اختر الخدمة');
    const html = [`<option value="">${esc(placeholder)}</option>`];
    for (const item of rows) {
      const name = localized(
        item,
        ['name', 'title', 'full_name', 'display_name'],
        ['name_en', 'title_en', 'full_name_en', 'display_name_en', 'english_name', 'english_full_name']
      );
      const title = type === 'doctor'
        ? localized(item, ['title', 'specialty'], ['title_en', 'specialty_en', 'english_title', 'english_specialty'])
        : '';
      const duration = type === 'service' && item?.duration_minutes
        ? ` — ${esc(item.duration_minutes)} ${english ? 'minutes' : 'دقيقة'}`
        : '';
      if (!item?.id || !name) continue;
      html.push(`<option value="${esc(item.id)}">${esc(name)}${title && title !== name ? ` — ${esc(title)}` : ''}${duration}</option>`);
    }
    select.innerHTML = html.join('');
    if ([...select.options].some(o => o.value === current)) select.value = current;
  }

  function repair() {
    const data = window.AZAAD_PUBLIC_CLINIC_DATA;
    if (data) {
      renderSelect('doctor', data.doctors, 'doctor');
      renderSelect('service', data.services, 'service');
    }

    const tagline = document.querySelector('.azaad-footer-tagline');
    if (tagline) {
      tagline.textContent = lang() === 'en'
        ? 'Mental health and psychotherapy'
        : 'للصحة النفسية والعلاج النفسي';
      tagline.dataset.azaadLocalized = lang();
    }
  }

  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(repair, 0);
  };

  window.addEventListener('azaadPublicClinicDataReady', schedule);
  window.addEventListener('azaadPublicClinicDataChanged', schedule);
  window.addEventListener('azaadLanguageChanged', schedule);
  window.addEventListener('storage', event => {
    if (event.key === 'azaadClinicLanguage') schedule();
  });

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  [0, 200, 500, 1000, 2000, 4000].forEach(ms => setTimeout(repair, ms));
})();