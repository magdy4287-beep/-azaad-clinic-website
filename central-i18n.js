(() => {
  'use strict';

  const KEY = 'azaadClinicLanguage';
  const ADMIN_KEY = 'azaad_admin_lang';
  const ENGLISH = {
    'عيادة أزاد للصحة النفسية':'Azaad Clinic Mental Health','جاري التحميل...':'Loading...','اختر الطبيب':'Select doctor','اختر الخدمة':'Select service','اكتب اسمك':'Enter your name','رقم الهاتف':'Phone number','أي معلومات إضافية...':'Any additional information...','دمياط - شارع نافع، مقابل مسجد المظلوم - أعلى صيدلية الرياض':'Damietta - Nafea Street, opposite Al-Mazloum Mosque, above Al-Riyad Pharmacy',
    'لوحة إدارة العيادة':'Clinic Administration Panel','تسجيل الدخول بحساب الموظف عبر Supabase Auth':'Sign in with your staff account through Supabase Auth','اسم المستخدم':'Username','كلمة المرور':'Password','تسجيل الدخول':'Sign in','تحديث':'Refresh','الموقع':'Website','تسجيل الخروج':'Sign out','إجمالي الحجوزات':'Total bookings','قيد المراجعة':'Pending','مؤكدة':'Confirmed','حجوزات اليوم':"Today's bookings",'الحجوزات':'Bookings','الأطباء':'Doctors','الخدمات':'Services','جداول الأطباء':'Doctor schedules','المنشورات والعروض':'Posts & Offers','العطلات والإغلاقات':'Holidays & Closures','ساعات العمل':'Working Hours','ساعات العمل العامة':'General Working Hours','الموظفون':'Staff','إدارة الموظفين':'Staff Management','إعدادات العيادة':'Clinic Settings','حساب الإدارة':'Admin Account','كل الحالات':'All statuses','مؤكد':'Confirmed','ملغي':'Cancelled','مكتمل':'Completed','رقم الحجز':'Booking number','المريض':'Patient','الهاتف':'Phone','التاريخ':'Date','الوقت':'Time','الحالة':'Status','لا توجد حجوزات مطابقة.':'No matching bookings.','إضافة طبيب':'Add doctor','تعديل':'Edit','إضافة خدمة':'Add service','إضافة إغلاق':'Add closure','منشور جديد':'New post','اختر طبيبًا.':'Select a doctor.','اختر تاريخًا.':'Select a date.','حفظ':'Save','إغلاق':'Close','حذف':'Delete','إلغاء':'Cancel','الدور':'Role','نشط':'Active','غير نشط':'Inactive','يوم عمل':'Working day','متاح':'Available','من':'From','إلى':'To','بداية الراحة':'Break start','نهاية الراحة':'Break end','مدة الموعد، البريك، وساعات كل يوم.':'Appointment duration, breaks, and daily hours.','حفظ الجدول':'Save schedule','حفظ ساعات العمل':'Save working hours','حفظ البيانات':'Save details','حفظ كلمة المرور':'Save password','تغيير كلمة المرور':'Change password','كلمة المرور الحالية':'Current password','كلمة المرور الجديدة':'New password','تأكيد كلمة المرور الجديدة':'Confirm new password','إضافة موظف':'Add employee','إنشاء الموظف':'Create employee','كلمة المرور المؤقتة':'Temporary password','Username غير صالح.':'Invalid username.','بيانات الدخول غير صحيحة.':'Invalid login credentials.','تعذر إنشاء جلسة الدخول.':'Unable to create the sign-in session.','جلسة الإدارة غير موجودة.':'Admin session is missing.','جلسة الإدارة غير موجودة أو منتهية.':'Admin session is missing or expired.','جلسة Supabase غير صالحة أو منتهية.':'Supabase session is invalid or expired.','حساب الموظف غير فعال أو دوره غير صالح.':'The staff account is inactive or its role is invalid.','ليس لديك صلاحية لتنفيذ هذا الإجراء.':'You do not have permission to perform this action.','تم تسجيل الدخول بنجاح':'Signed in successfully','تم تحديث النظام.':'System refreshed.','تم تحديث الحجوزات.':'Bookings refreshed.','تم حفظ بيانات الطبيب.':'Doctor details saved.','تم حفظ الخدمة.':'Service saved.','تم حفظ المنشور.':'Post saved.','تم حفظ الإغلاق.':'Closure saved.','تم حفظ الإعدادات.':'Settings saved.','تم حفظ ساعات العمل.':'Working hours saved.','تم تغيير الدور.':'Role updated.','تم تغيير كلمة المرور.':'Password changed.','تم تحديث حالة الموظف.':'Staff status updated.','لا يوجد أطباء.':'No doctors found.','لا توجد خدمات.':'No services found.','لا توجد منشورات.':'No posts found.','لا توجد إغلاقات.':'No closures found.','لا توجد بيانات.':'No data available.','لا يوجد موظفون.':'No staff found.','جاري تحميل الجدول...':'Loading schedule...','تعذر تحميل بيانات الإدارة.':'Unable to load admin data.','رقم الملف الظاهر سهل الاستخدام، لكن الـMRN الحقيقي لا يتغير. تعديلات الاسم والهاتف تمر عبر الصلاحيات والتدقيق.':'The display patient number is simplified for daily use; the canonical MRN never changes. Name and phone edits are permission-controlled and audited.','ملفات المرضى':'Patient Files','مواعيد المرضى':'Patient Appointments','فتح الملف':'Open Patient','تعديل الاسم والموبايل':'Edit Name & Phone','ملف المريض':'Patient File','السجل الطبي':'Clinical Record','التطور':'Progress','الفواتير':'Invoices','المدفوعات':'Payments','المتابعة':'Follow-up','الحجوزات':'Appointments','الزيارات':'Visits','الموعد القادم':'Next appointment','الاسم':'Name','الموبايل':'Phone','لا توجد بيانات مطابقة.':'No matching patient records.','جاري تحميل الملف الكامل...':'Loading the full patient record...','ملف':'files','لا توجد حجوزات بتاريخ':'No appointments on','اليوم':'Today','المواعيد':'Appointments','رقم الملف':'Patient Number','تعديل ملف المريض':'Edit Patient','سيتم تسجيل التعديل في Audit Log.':'This change will be recorded in the Audit Log.','رقم الملف الظاهر ثابت، والـMRN الداخلي لا يمكن تعديله.':'The display number is fixed; the canonical MRN cannot be edited.','كل الأطباء':'All doctors','طبيب محدد':'Specific doctor','العيادة بالكامل':'Entire clinic','لا يمكن إزالة دور OWNER من آخر Owner نشط.':'The last active OWNER role cannot be removed.','حساب OWNER محمي ولا يمكن تعطيله.':'The OWNER account is protected and cannot be disabled.','تم تحديث ملف المريض.':'Patient record updated.','تم حفظ بيانات الحساب.':'Account details saved.'
  };

  const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const getLang = () => {
    try {
      if (/admin\.html$/i.test(location.pathname)) {
        const admin = localStorage.getItem(ADMIN_KEY);
        if (admin === 'en' || admin === 'ar') return admin;
      }
      const saved = localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    return String(document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  };

  function syncStorage(lang) {
    try {
      if (localStorage.getItem(KEY) !== lang) localStorage.setItem(KEY, lang);
      if (/admin\.html$/i.test(location.pathname) && localStorage.getItem(ADMIN_KEY) !== lang) localStorage.setItem(ADMIN_KEY, lang);
    } catch (_) {}
  }

  function translateMetadata(lang) {
    if (lang !== 'en') {
      document.title = 'Azaad Clinic | عيادة أزاد للصحة النفسية';
      return;
    }
    document.title = 'Azaad Clinic | Mental Health Clinic';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', 'Azaad Clinic — specialized mental health and psychotherapy care with privacy and compassionate support.');
    document.querySelectorAll('meta[property="og:title"],meta[name="twitter:title"]').forEach(el => el.setAttribute('content', 'Azaad Clinic | Mental Health Clinic'));
    document.querySelectorAll('meta[property="og:description"],meta[name="twitter:description"]').forEach(el => el.setAttribute('content', 'Specialized mental health and psychotherapy care with privacy and compassionate support.'));
  }

  function injectAdminSwitch() {
    if (!/admin\.html$/i.test(location.pathname)) return;
    if (document.getElementById('azaadCentralLanguageSwitch')) return;
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const wrap = document.createElement('div');
    wrap.id = 'azaadCentralLanguageSwitch';
    wrap.style.cssText = 'display:flex;gap:6px;align-items:center;margin-inline-start:auto;';
    const current = getLang();
    wrap.innerHTML = `<button type="button" data-azaad-lang="ar" style="border:1px solid #d9deea;border-radius:999px;padding:7px 11px;background:${current==='ar'?'#17214f':'#fff'};color:${current==='ar'?'#fff':'#17214f'};font-weight:800;cursor:pointer">العربية</button><button type="button" data-azaad-lang="en" style="border:1px solid #d9deea;border-radius:999px;padding:7px 11px;background:${current==='en'?'#17214f':'#fff'};color:${current==='en'?'#fff':'#17214f'};font-weight:800;cursor:pointer">English</button>`;
    wrap.querySelectorAll('[data-azaad-lang]').forEach(btn => btn.addEventListener('click', () => {
      const lang = btn.dataset.azaadLang === 'en' ? 'en' : 'ar';
      syncStorage(lang);
      location.reload();
    }));
    topbar.appendChild(wrap);
  }

  function replaceText(raw) {
    return ENGLISH[raw] || raw;
  }

  function apply() {
    const lang = getLang();
    syncStorage(lang);
    if (document.documentElement.lang !== lang) document.documentElement.lang = lang;
    const dir = lang === 'en' ? 'ltr' : 'rtl';
    if (document.documentElement.dir !== dir) document.documentElement.dir = dir;
    translateMetadata(lang);
    injectAdminSwitch();
    if (lang !== 'en') return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (!node.parentElement || node.parentElement.closest('script,style,textarea,input,select,option,[data-no-i18n]')) return;
      const raw = normalize(node.nodeValue);
      if (!raw) return;
      const translated = replaceText(raw);
      if (translated !== raw) node.nodeValue = node.nodeValue.replace(raw, translated);
    });
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
      ['placeholder','title','aria-label'].forEach(attr => {
        const value = normalize(el.getAttribute(attr));
        const translated = replaceText(value);
        if (translated !== value) el.setAttribute(attr, translated);
      });
    });
    window.AZAAD_ADMIN_ENGLISH_HARDENING?.run?.();
  }

  function init() {
    apply();
    const observer = new MutationObserver(() => queueMicrotask(apply));
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    window.addEventListener('storage', event => { if (event.key === KEY || event.key === ADMIN_KEY) apply(); });
    window.addEventListener('azaadLanguageChanged', apply);
    window.setInterval(apply, 1000);
    window.AZAAD_I18N = { version:'1.3.0', apply, language:getLang, dictionary:ENGLISH };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
