(() => {
  'use strict';

  const KEY = 'azaadClinicLanguage';
  const ADMIN_KEY = 'azaad_admin_lang';
  const ENGLISH = {
    'عيادة أزاد للصحة النفسية':'Azaad Clinic Mental Health','جاري التحميل...':'Loading...','اختر الطبيب':'Select doctor','اختر الخدمة':'Select service','اكتب اسمك':'Enter your name','رقم الهاتف':'Phone number','أي معلومات إضافية...':'Any additional information...','دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض':'Damietta - Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyad Pharmacy',
    'لوحة إدارة العيادة':'Clinic Administration Panel','تسجيل الدخول بحساب الموظف عبر Supabase Auth':'Sign in with your staff account through Supabase Auth','اسم المستخدم':'Username','كلمة المرور':'Password','تسجيل الدخول':'Sign in','تحديث':'Refresh','الموقع':'Website','تسجيل الخروج':'Sign out','إجمالي الحجوزات':'Total bookings','قيد المراجعة':'Pending','مؤكدة':'Confirmed','حجوزات اليوم':"Today's bookings",'الحجوزات':'Bookings','الأطباء':'Doctors','الخدمات':'Services','جداول الأطباء':'Doctor schedules','المنشورات والعروض':'Posts & Offers','العطلات والإغلاقات':'Holidays & Closures','ساعات العمل':'Working Hours','ساعات العمل العامة':'General Working Hours','الموظفون':'Staff','إدارة الموظفين':'Staff Management','إعدادات العيادة':'Clinic Settings','حساب الإدارة':'Admin Account','كل الحالات':'All statuses','مؤكد':'Confirmed','ملغي':'Cancelled','مكتمل':'Completed','رقم الحجز':'Booking number','المريض':'Patient','الهاتف':'Phone','التاريخ':'Date','الوقت':'Time','الحالة':'Status','لا توجد حجوزات مطابقة.':'No matching bookings.','إضافة طبيب':'Add doctor','تعديل':'Edit','إضافة خدمة':'Add service','إضافة إغلاق':'Add closure','منشور جديد':'New post','اختر طبيبًا.':'Select a doctor.','اختر تاريخًا.':'Select a date.','حفظ':'Save','إغلاق':'Close','حذف':'Delete','إلغاء':'Cancel','الدور':'Role','نشط':'Active','غير نشط':'Inactive','يوم عمل':'Working day','متاح':'Available','من':'From','إلى':'To','بداية الراحة':'Break start','نهاية الراحة':'Break end','مدة الموعد، البريك، وساعات كل يوم.':'Appointment duration, breaks, and daily hours.','حفظ الجدول':'Save schedule','حفظ ساعات العمل':'Save working hours','حفظ البيانات':'Save details','حفظ كلمة المرور':'Save password','تغيير كلمة المرور':'Change password','كلمة المرور الحالية':'Current password','كلمة المرور الجديدة':'New password','تأكيد كلمة المرور الجديدة':'Confirm new password','إضافة موظف':'Add employee','إنشاء موظف':'Create employee','كلمة المرور المؤقتة':'Temporary password','Username غير صالح.':'Invalid username.','بيانات الدخول غير صحيحة.':'Invalid login credentials.','تعذر إنشاء جلسة الدخول.':'Unable to create the sign-in session.','جلسة الإدارة غير موجودة.':'Admin session is missing.','جلسة الإدارة غير موجودة أو منتهية.':'Admin session is missing or expired.','جلسة Supabase غير صالحة أو منتهية.':'Supabase session is invalid or expired.','حساب الموظف غير فعال أو دوره غير صالح.':'The staff account is inactive or its role is invalid.','ليس لديك صلاحية لتنفيذ هذا الإجراء.':'You do not have permission to perform this action.','تم تسجيل الدخول بنجاح':'Signed in successfully','تم تحديث النظام.':'System refreshed.','تم تحديث الحجوزات.':'Bookings refreshed.','تم حفظ بيانات الطبيب.':'Doctor details saved.','تم حفظ الخدمة.':'Service saved.','تم حفظ المنشور.':'Post saved.','تم حفظ الإغلاق.':'Closure saved.','تم حفظ الإعدادات.':'Settings saved.','تم حفظ ساعات العمل.':'Working hours saved.','تم تغيير الدور.':'Role updated.','تم تغيير كلمة المرور.':'Password changed.','تم تحديث حالة الموظف.':'Staff status updated.','لا يوجد أطباء.':'No doctors found.','لا توجد خدمات.':'No services found.','لا توجد منشورات.':'No posts found.','لا توجد إغلاقات.':'No closures found.','لا توجد بيانات.':'No data available.','لا يوجد موظفون.':'No staff found.','جاري تحميل الجدول...':'Loading schedule...','تعذر تحميل بيانات الإدارة.':'Unable to load admin data.','ملفات المرضى':'Patient Files','مواعيد المرضى':'Patient Appointments','فتح الملف':'Open Patient','تعديل الاسم والموبايل':'Edit Name & Phone','ملف المريض':'Patient File','السجل الطبي':'Clinical Record','التطور':'Progress','الفواتير':'Invoices','المدفوعات':'Payments','المتابعة':'Follow-up','الحجوزات':'Appointments','الزيارات':'Visits','الموعد القادم':'Next appointment','الاسم':'Name','الموبايل':'Phone','لا توجد بيانات مطابقة.':'No matching patient records.','جاري تحميل الملف الكامل...':'Loading the full patient record...','لا توجد حجوزات بتاريخ':'No appointments on','اليوم':'Today','المواعيد':'Appointments','رقم الملف':'Patient Number','تعديل ملف المريض':'Edit Patient','سيتم تسجيل التعديل في Audit Log.':'This change will be recorded in the Audit Log.','رقم الملف الظاهر ثابت، والـMRN الداخلي لا يمكن تعديله.':'The display number is fixed; the canonical MRN cannot be edited.','كل الأطباء':'All doctors','طبيب محدد':'Specific doctor','العيادة بالكامل':'Entire clinic','لا يمكن إزالة دور OWNER من آخر Owner نشط.':'The last active OWNER role cannot be removed.','حساب OWNER محمي ولا يمكن تعطيله.':'The OWNER account is protected and cannot be disabled.','تم تحديث ملف المريض.':'Patient record updated.','تم حفظ بيانات الحساب.':'Account details saved.'
  };

  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let currentLanguage = null;
  let applying = false;
  let queued = false;
  let observer = null;
  let observerSuppressed = false;

  const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();

  function isAdmin() {
    return /(^|\/)admin\.html$/i.test(location.pathname);
  }

  function getLang() {
    try {
      if (isAdmin()) {
        const admin = localStorage.getItem(ADMIN_KEY);
        if (admin === 'en' || admin === 'ar') return admin;
      }
      const saved = localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    return String(document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  }

  function persist(lang) {
    try {
      localStorage.setItem(KEY, lang);
      if (isAdmin()) localStorage.setItem(ADMIN_KEY, lang);
    } catch (_) {}
  }

  function rememberText(node) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue || '');
    return originalText.get(node);
  }

  function rememberAttr(el, attr) {
    let values = originalAttrs.get(el);
    if (!values) {
      values = new Map();
      originalAttrs.set(el, values);
    }
    if (!values.has(attr)) values.set(attr, el.getAttribute(attr));
    return values.get(attr);
  }

  function translateText(source, lang) {
    if (lang !== 'en') return source;
    const exact = ENGLISH[normalize(source)];
    return exact === undefined ? source : String(source).replace(normalize(source), exact);
  }

  function shouldSkip(node) {
    const parent = node.parentElement;
    return !parent || !!parent.closest('script,style,textarea,[data-no-i18n]');
  }

  function apply(lang = getLang()) {
    lang = lang === 'en' ? 'en' : 'ar';
    persist(lang);
    currentLanguage = lang;
    applying = true;
    observerSuppressed = true;
    if (observer) observer.disconnect();
    try {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
      document.documentElement.dataset.language = lang;

      const title = lang === 'en' ? 'Azaad Clinic | Mental Health Clinic' : 'Azaad Clinic | عيادة أزاد للصحة النفسية';
      document.title = title;
      const description = document.querySelector('meta[name="description"]');
      if (description) description.content = lang === 'en'
        ? 'Azaad Clinic — specialized mental health and psychotherapy care with privacy and compassionate support.'
        : 'Azaad Clinic - عيادة متخصصة في الصحة النفسية والعلاج النفسي';

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (shouldSkip(node)) continue;
        const source = rememberText(node);
        const translated = translateText(source, lang);
        if (node.nodeValue !== translated) node.nodeValue = translated;
      }

      document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
        for (const attr of ['placeholder','title','aria-label']) {
          if (!el.hasAttribute(attr)) continue;
          const source = rememberAttr(el, attr);
          if (source == null) continue;
          const translated = translateText(source, lang);
          if (el.getAttribute(attr) !== translated) el.setAttribute(attr, translated);
        }
      });

      bindLanguageControls();
      window.AZAAD_ADMIN_ENGLISH_HARDENING?.run?.();
      window.dispatchEvent(new CustomEvent('azaadLanguageChanged', { detail: { language: lang } }));
    } finally {
      applying = false;
      observerSuppressed = false;
      if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  function queueApply() {
    if (applying || queued || observerSuppressed) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!applying && !observerSuppressed) apply(getLang());
    });
  }

  function bindLanguageControls() {
    const controls = document.querySelectorAll('[data-lang],[data-azaad-lang]');
    controls.forEach(control => {
      if (control.dataset.azaadCentralBound === 'true') return;
      control.dataset.azaadCentralBound = 'true';
      control.addEventListener('click', event => {
        const lang = control.dataset.lang === 'en' || control.dataset.azaadLang === 'en' ? 'en' : 'ar';
        event.preventDefault();
        event.stopImmediatePropagation();
        apply(lang);
      }, true);
    });
  }

  function init() {
    if (window.__AZAAD_CENTRAL_I18N_V4__) return;
    window.__AZAAD_CENTRAL_I18N_V4__ = true;
    window.AZAAD_I18N = {
      version: '4.0.0',
      apply,
      language: getLang,
      dictionary: ENGLISH,
      setLanguage: apply
    };
    apply(getLang());
    observer = new MutationObserver(() => queueApply());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('storage', event => {
      if (event.key === KEY || event.key === ADMIN_KEY) apply(getLang());
    });
    window.addEventListener('azaadLanguageChanged', event => {
      if (!applying && event.detail?.language && event.detail.language !== currentLanguage) apply(event.detail.language);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();