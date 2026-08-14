(() => {
  'use strict';

  const KEY = 'azaadClinicLanguage';
  const ENGLISH = {
    'لوحة إدارة العيادة':'Clinic Administration Panel',
    'تسجيل الدخول بحساب الموظف عبر Supabase Auth':'Sign in with your staff account through Supabase Auth',
    'اسم المستخدم':'Username','كلمة المرور':'Password','تسجيل الدخول':'Sign in',
    'تحديث':'Refresh','الموقع':'Website','تسجيل الخروج':'Sign out',
    'إجمالي الحجوزات':'Total bookings','قيد المراجعة':'Pending','مؤكدة':'Confirmed','حجوزات اليوم':'Today\'s bookings',
    'الحجوزات':'Bookings','الأطباء':'Doctors','الخدمات':'Services','جداول الأطباء':'Doctor schedules','المنشورات والعروض':'Posts & Offers',
    'العطلات والإغلاقات':'Holidays & Closures','ساعات العمل':'Working Hours','ساعات العمل العامة':'General Working Hours',
    'الموظفون':'Staff','إدارة الموظفين':'Staff Management','إعدادات العيادة':'Clinic Settings','حساب الإدارة':'Admin Account',
    'كل الحالات':'All statuses','مؤكد':'Confirmed','ملغي':'Cancelled','مكتمل':'Completed','رقم الحجز':'Booking number',
    'المريض':'Patient','الهاتف':'Phone','التاريخ':'Date','الوقت':'Time','الحالة':'Status','لا توجد حجوزات مطابقة.':'No matching bookings.',
    'إضافة طبيب':'Add doctor','تعديل':'Edit','إضافة خدمة':'Add service','إضافة إغلاق':'Add closure','منشور جديد':'New post',
    'اختر الطبيب':'Select doctor','اختر طبيبًا.':'Select a doctor.','اختر الخدمة':'Select service','اختر تاريخًا.':'Select a date.',
    'حفظ':'Save','إغلاق':'Close','حذف':'Delete','إلغاء':'Cancel','الدور':'Role','الحالة':'Status','نشط':'Active','غير نشط':'Inactive',
    'يوم عمل':'Working day','متاح':'Available','من':'From','إلى':'To','بداية الراحة':'Break start','نهاية الراحة':'Break end',
    'مدة الموعد، البريك، وساعات كل يوم.':'Appointment duration, breaks, and daily hours.',
    'حفظ الجدول':'Save schedule','حفظ ساعات العمل':'Save working hours','حفظ البيانات':'Save details','حفظ كلمة المرور':'Save password',
    'تغيير كلمة المرور':'Change password','كلمة المرور الحالية':'Current password','كلمة المرور الجديدة':'New password','تأكيد كلمة المرور الجديدة':'Confirm new password',
    'إضافة موظف':'Add employee','إنشاء الموظف':'Create employee','كلمة المرور المؤقتة':'Temporary password',
    'Username غير صالح.':'Invalid username.','بيانات الدخول غير صحيحة.':'Invalid login credentials.','تعذر إنشاء جلسة الدخول.':'Unable to create the sign-in session.',
    'جلسة الإدارة غير موجودة.':'Admin session is missing.','جلسة الإدارة غير موجودة أو منتهية.':'Admin session is missing or expired.',
    'جلسة Supabase غير صالحة أو منتهية.':'Supabase session is invalid or expired.',
    'حساب الموظف غير فعال أو دوره غير صالح.':'The staff account is inactive or its role is invalid.',
    'ليس لديك صلاحية لتنفيذ هذا الإجراء.':'You do not have permission to perform this action.',
    'تم تسجيل الدخول بنجاح':'Signed in successfully','تم تحديث النظام.':'System refreshed.','تم تحديث الحجوزات.':'Bookings refreshed.',
    'تم حفظ بيانات الطبيب.':'Doctor details saved.','تم حفظ الخدمة.':'Service saved.','تم حفظ المنشور.':'Post saved.',
    'تم حفظ الإغلاق.':'Closure saved.','تم حفظ الإعدادات.':'Settings saved.','تم حفظ ساعات العمل.':'Working hours saved.',
    'تم تغيير الدور.':'Role updated.','تم تغيير كلمة المرور.':'Password changed.','تم تحديث حالة الموظف.':'Staff status updated.',
    'لا يوجد أطباء.':'No doctors found.','لا توجد خدمات.':'No services found.','لا توجد منشورات.':'No posts found.','لا توجد إغلاقات.':'No closures found.','لا توجد بيانات.':'No data available.','لا يوجد موظفون.':'No staff found.',
    'جاري تحميل الجدول...':'Loading schedule...','تعذر تحميل بيانات الإدارة.':'Unable to load admin data.',
    'رقم الملف الظاهر سهل الاستخدام، لكن الـMRN الحقيقي لا يتغير. تعديلات الاسم والهاتف تمر عبر الصلاحيات والتدقيق.':'The display patient number is simplified for daily use; the canonical MRN never changes. Name and phone edits are permission-controlled and audited.',
    'ملفات المرضى':'Patient Files','مواعيد المرضى':'Patient Appointments','فتح الملف':'Open Patient','تعديل الاسم والموبايل':'Edit Name & Phone',
    'ملف المريض':'Patient File','السجل الطبي':'Clinical Record','التطور':'Progress','الفواتير':'Invoices','المدفوعات':'Payments','المتابعة':'Follow-up',
    'الحجوزات':'Appointments','الزيارات':'Visits','الموعد القادم':'Next appointment','الاسم':'Name','الموبايل':'Phone',
    'لا توجد بيانات مطابقة.':'No matching patient records.','جاري تحميل الملف الكامل...':'Loading the full patient record...','ملف':'files',
    'لا توجد حجوزات بتاريخ':'No appointments on','اليوم':'Today','المواعيد':'Appointments','رقم الملف':'Patient Number',
    'تعديل ملف المريض':'Edit Patient','سيتم تسجيل التعديل في Audit Log.':'This change will be recorded in the Audit Log.',
    'رقم الملف الظاهر ثابت، والـMRN الداخلي لا يمكن تعديله.':'The display number is fixed; the canonical MRN cannot be edited.',
    'كل الأطباء':'All doctors','طبيب محدد':'Specific doctor','العيادة بالكامل':'Entire clinic',
    'لا يمكن إزالة دور OWNER من آخر Owner نشط.':'The last active OWNER role cannot be removed.',
    'حساب OWNER محمي ولا يمكن تعطيله.':'The OWNER account is protected and cannot be disabled.',
    'تم تحديث ملف المريض.':'Patient record updated.','تم حفظ بيانات الحساب.':'Account details saved.'
  };

  const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const language = () => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (_) {}
    return String(document.documentElement.lang || 'ar').toLowerCase().startsWith('en') ? 'en' : 'ar';
  };

  function translateNode(node) {
    if (language() !== 'en' || !node?.parentElement) return;
    const parent = node.parentElement;
    if (parent.closest('script,style,textarea,input,select,option,[data-no-i18n]')) return;
    const raw = normalize(node.nodeValue);
    if (!raw) return;
    const exact = ENGLISH[raw];
    if (exact) node.nodeValue = node.nodeValue.replace(raw, exact);
  }

  function translateAttributes() {
    if (language() !== 'en') return;
    document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
      for (const attr of ['placeholder','title','aria-label']) {
        const value = normalize(el.getAttribute(attr));
        if (ENGLISH[value]) el.setAttribute(attr, ENGLISH[value]);
      }
    });
  }

  function apply() {
    document.documentElement.lang = language();
    document.documentElement.dir = language() === 'en' ? 'ltr' : 'rtl';
    if (language() !== 'en') return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateNode);
    translateAttributes();
  }

  function init() {
    apply();
    const observer = new MutationObserver(() => queueMicrotask(apply));
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    window.addEventListener('azaadLanguageChanged', apply);
    window.addEventListener('languagechange', apply);
    window.setInterval(apply, 700);
    window.AZAAD_I18N = { version:'1.0.0', apply, language, dictionary: ENGLISH };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
