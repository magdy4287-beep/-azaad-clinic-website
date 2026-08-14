from pathlib import Path
import re

AUTH_REFRESH_COORDINATOR = '''
let azaadRefreshPromise = null;

async function azaadEnsureFreshSession(){
  if(azaadRefreshPromise) return azaadRefreshPromise;
  azaadRefreshPromise = (async () => {
    const refreshed = await supabase.auth.refreshSession();
    if(refreshed.error || !refreshed.data?.session){
      throw refreshed.error || new Error("Session refresh failed");
    }
    state.session = refreshed.data.session;
    state.user = refreshed.data.session.user;
    try { sessionStorage.setItem("azaad_admin_token", refreshed.data.session.access_token); } catch (_) {}
    return refreshed.data.session;
  })();
  try { return await azaadRefreshPromise; }
  finally { azaadRefreshPromise = null; }
}
'''.strip()

ADMIN_AUTH = '''
async function restoreStaff(){
  if(!state.user?.id) return false;
  async function requestAccount(){
    const current = state.session || (await supabase.auth.getSession()).data.session;
    if(!current?.access_token) return { response:null, body:null, session:null };
    const response = await fetch(`${SUPABASE_URL}/functions/v1/azaad-admin-auth`, {
      method:"GET", cache:"no-store",
      headers:{Accept:"application/json", Authorization:`Bearer ${current.access_token}`, apikey:SUPABASE_PUBLISHABLE_KEY}
    });
    let body = {};
    try { body = await response.json(); } catch(_) {}
    return { response, body, session:current };
  }
  let result = await requestAccount();
  if(result.response?.status === 401){
    try { await azaadEnsureFreshSession(); } catch (_) { return false; }
    result = await requestAccount();
  }
  if(!result.response?.ok || !result.body?.admin) return false;
  if(!applyStaff(result.body.admin)) return false;
  state.session = result.session || state.session;
  state.user = result.body.user || state.user;
  try { sessionStorage.setItem('azaad_admin_token', state.session.access_token); } catch (_) {}
  return true;
}
'''.strip()

STAFF_API = '''
async function staffApi(
  action,
  payload = {}
){
  if(!requirePermission("staff.view")){
    throw new Error("ليس لديك صلاحية.");
  }

  async function request(){
    const session = state.session || (await supabase.auth.getSession()).data.session;
    if(!session?.access_token) throw new Error("جلسة الإدارة غير موجودة.");

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/staff-admin`,
      {
        method:"POST",
        cache:"no-store",
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
          Authorization:`Bearer ${session.access_token}`,
          apikey:SUPABASE_PUBLISHABLE_KEY
        },
        body:JSON.stringify({
          action,
          ...(payload || {})
        })
      }
    );

    let body = {};
    try { body = await response.json(); } catch(_) {}
    return { response, body };
  }

  let result = await request();

  if(result.response.status === 401){
    try { await azaadEnsureFreshSession(); }
    catch (_) { throw new Error("جلسة الإدارة منتهية."); }
    result = await request();
  }

  if(!result.response.ok){
    throw new Error(
      result.body?.error ||
      result.body?.message ||
      `HTTP ${result.response.status}`
    );
  }

  return result.body;
}
'''.strip()

ADMIN_I18N = r'''
const AZAAD_I18N = {
  ar: {
    "لوحة إدارة العيادة":"لوحة إدارة العيادة",
    "🔐 تسجيل الدخول بحساب الموظف عبر Supabase Auth":"🔐 تسجيل الدخول بحساب الموظف عبر Supabase Auth",
    "اسم المستخدم":"اسم المستخدم","كلمة المرور":"كلمة المرور","تسجيل الدخول":"تسجيل الدخول",
    "لوحة إدارة عيادة أزاد للصحة النفسية":"لوحة إدارة عيادة أزاد للصحة النفسية",
    "🔄 تحديث":"🔄 تحديث","🏥 الموقع":"🏥 الموقع","🚪 تسجيل الخروج":"🚪 تسجيل الخروج",
    "📅 إجمالي الحجوزات":"📅 إجمالي الحجوزات","🟡 قيد المراجعة":"🟡 قيد المراجعة","🟢 مؤكدة":"🟢 مؤكدة","🚦 حجوزات اليوم":"🚦 حجوزات اليوم",
    "📅 الحجوزات":"📅 الحجوزات","🧑‍⚕️ الأطباء":"🧑‍⚕️ الأطباء","🩺 الخدمات":"🩺 الخدمات","🕐 جداول الأطباء":"🕐 جداول الأطباء",
    "📣 المنشورات والعروض":"📣 المنشورات والعروض","🚫 العطلات والإغلاقات":"🚫 العطلات والإغلاقات","🕘 ساعات العمل":"🕘 ساعات العمل",
    "👥 الموظفون":"👥 الموظفون","⚙️ الإعدادات":"⚙️ الإعدادات","👤 حساب الإدارة":"👤 حساب الإدارة",
    "📅 الحجوزات":"📅 الحجوزات","🔎 الاسم / الهاتف / رقم الحجز":"🔎 الاسم / الهاتف / رقم الحجز","كل الحالات":"كل الحالات",
    "قيد المراجعة":"قيد المراجعة","مؤكد":"مؤكد","ملغي":"ملغي","مكتمل":"مكتمل",
    "➕ إضافة طبيب":"➕ إضافة طبيب","➕ إضافة خدمة":"➕ إضافة خدمة","➕ منشور جديد":"➕ منشور جديد","➕ إضافة إغلاق":"➕ إضافة إغلاق",
    "اختر الطبيب":"اختر الطبيب","اختر طبيبًا.":"اختر طبيبًا.","مدة الموعد، البريك، وساعات كل يوم.":"مدة الموعد، البريك، وساعات كل يوم.",
    "لا يوجد أطباء.":"لا يوجد أطباء.","لا توجد خدمات.":"لا توجد خدمات.","✍️ تعديل":"✍️ تعديل","💾 حفظ":"💾 حفظ",
    "🟢 نشط":"🟢 نشط","🔴 غير نشط":"🔴 غير نشط","اسم الطبيب":"اسم الطبيب","التخصص":"التخصص","الهاتف":"الهاتف","الحالة":"الحالة",
    "اسم الخدمة":"اسم الخدمة","السعر":"السعر","الوصف":"الوصف","🧾 الفواتير":"🧾 الفواتير","📊 التقارير":"📊 التقارير",
    "⛔ ليس لديك صلاحية لتنفيذ هذا الإجراء.":"⛔ ليس لديك صلاحية لتنفيذ هذا الإجراء.",
    "ليس لديك صلاحية.":"ليس لديك صلاحية.","جلسة الإدارة غير موجودة.":"جلسة الإدارة غير موجودة.","جلسة الإدارة منتهية.":"جلسة الإدارة منتهية.",
    "لا توجد حجوزات مطابقة.":"لا توجد حجوزات مطابقة.","لا يوجد أطباء.":"لا يوجد أطباء.","لا توجد خدمات.":"لا توجد خدمات.",
    "تعديل طبيب":"تعديل طبيب","إضافة طبيب":"إضافة طبيب","تعديل خدمة":"تعديل خدمة","إضافة خدمة":"إضافة خدمة",
    "تم حفظ بيانات الطبيب.":"تم حفظ بيانات الطبيب.","تم حفظ بيانات الخدمة.":"تم حفظ بيانات الخدمة.",
    "🚫 لا توجد بيانات":"🚫 لا توجد بيانات"
  },
  en: {
    "لوحة إدارة العيادة":"Clinic Administration",
    "🔐 تسجيل الدخول بحساب الموظف عبر Supabase Auth":"🔐 Sign in with your staff account via Supabase Auth",
    "اسم المستخدم":"Username","كلمة المرور":"Password","تسجيل الدخول":"Sign in",
    "لوحة إدارة عيادة أزاد للصحة النفسية":"Azaad Clinic for Mental Health Administration",
    "🔄 تحديث":"🔄 Refresh","🏥 الموقع":"🏥 Website","🚪 تسجيل الخروج":"🚪 Sign out",
    "📅 إجمالي الحجوزات":"📅 Total Appointments","🟡 قيد المراجعة":"🟡 Pending","🟢 مؤكدة":"🟢 Confirmed","🚦 حجوزات اليوم":"🚦 Today's Appointments",
    "📅 الحجوزات":"📅 Appointments","🧑‍⚕️ الأطباء":"🧑‍⚕️ Doctors","🩺 الخدمات":"🩺 Services","🕐 جداول الأطباء":"🕐 Doctor Schedules",
    "📣 المنشورات والعروض":"📣 Posts & Offers","🚫 العطلات والإغلاقات":"🚫 Holidays & Closures","🕘 ساعات العمل":"🕘 Working Hours",
    "👥 الموظفون":"👥 Staff","⚙️ الإعدادات":"⚙️ Settings","👤 حساب الإدارة":"👤 Administration Account",
    "🔎 الاسم / الهاتف / رقم الحجز":"🔎 Name / Phone / Booking Number","كل الحالات":"All statuses",
    "قيد المراجعة":"Pending","مؤكد":"Confirmed","ملغي":"Cancelled","مكتمل":"Completed",
    "➕ إضافة طبيب":"➕ Add Doctor","➕ إضافة خدمة":"➕ Add Service","➕ منشور جديد":"➕ New Post","➕ إضافة إغلاق":"➕ Add Closure",
    "اختر الطبيب":"Select doctor","اختر طبيبًا.":"Select a doctor.","مدة الموعد، البريك، وساعات كل يوم.":"Appointment duration, breaks, and daily hours.",
    "لا يوجد أطباء.":"No doctors found.","لا توجد خدمات.":"No services found.","✍️ تعديل":"✍️ Edit","💾 حفظ":"💾 Save",
    "🟢 نشط":"🟢 Active","🔴 غير نشط":"🔴 Inactive","اسم الطبيب":"Doctor name","التخصص":"Specialty","الهاتف":"Phone","الحالة":"Status",
    "اسم الخدمة":"Service name","السعر":"Price","الوصف":"Description","🧾 الفواتير":"🧾 Invoices","📊 التقارير":"📊 Reports",
    "⛔ ليس لديك صلاحية لتنفيذ هذا الإجراء.":"⛔ You do not have permission to perform this action.",
    "ليس لديك صلاحية.":"You do not have permission.","جلسة الإدارة غير موجودة.":"Admin session is not available.","جلسة الإدارة منتهية.":"Admin session has expired.",
    "لا توجد حجوزات مطابقة.":"No matching appointments.","تعديل طبيب":"Edit Doctor","إضافة طبيب":"Add Doctor","تعديل خدمة":"Edit Service","إضافة خدمة":"Add Service",
    "تم حفظ بيانات الطبيب.":"Doctor details saved.","تم حفظ بيانات الخدمة.":"Service details saved.","🚫 لا توجد بيانات":"🚫 No data"
  }
};

let azaadLanguage = localStorage.getItem("azaad_admin_language") || "ar";

function azaadNormalizeText(value){
  return String(value || "").replace(/\s+/g," ").trim();
}

function azaadTranslate(root=document.body){
  const map = AZAAD_I18N[azaadLanguage] || AZAAD_I18N.ar;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes=[];
  let node;
  while(node=walker.nextNode()) nodes.push(node);
  nodes.forEach(n=>{
    const key=azaadNormalizeText(n.nodeValue);
    if(map[key]) n.nodeValue=n.nodeValue.replace(key,map[key]);
  });
  root.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{
    const key=azaadNormalizeText(el.getAttribute("placeholder"));
    if(map[key]) el.setAttribute("placeholder",map[key]);
  });
  root.querySelectorAll("option").forEach(el=>{
    const key=azaadNormalizeText(el.textContent);
    if(map[key]) el.textContent=map[key];
  });
}

function azaadSetLanguage(lang){
  azaadLanguage = lang === "en" ? "en" : "ar";
  localStorage.setItem("azaad_admin_language", azaadLanguage);
  document.documentElement.lang = azaadLanguage;
  document.documentElement.dir = azaadLanguage === "en" ? "ltr" : "rtl";
  const button=document.getElementById("azaadLanguageToggle");
  if(button) button.textContent = azaadLanguage === "ar" ? "🇬🇧 English" : "🇪🇬 العربية";
  azaadTranslate(document.body);
  try { sessionStorage.setItem("azaad_admin_language", azaadLanguage); } catch(_) {}
}

function azaadInstallLanguageSwitch(){
  if(document.getElementById("azaadLanguageToggle")) return;
  const button=document.createElement("button");
  button.id="azaadLanguageToggle";
  button.type="button";
  button.className="btn btn-secondary";
  button.style.fontWeight="800";
  button.onclick=()=>azaadSetLanguage(azaadLanguage === "ar" ? "en" : "ar");
  const loginCard=document.querySelector("#loginPage .login-card");
  const topActions=document.querySelector(".topbar .top-actions");
  if(topActions) topActions.prepend(button);
  else if(loginCard) loginCard.prepend(button);
  azaadSetLanguage(azaadLanguage);
}

const azaadLanguageObserver=new MutationObserver(mutations=>{
  if(azaadLanguage !== "ar") mutations.forEach(m=>m.addedNodes.forEach(n=>{
    if(n.nodeType===1) azaadTranslate(n);
  }));
});

document.addEventListener("DOMContentLoaded",()=>{
  azaadInstallLanguageSwitch();
  azaadLanguageObserver.observe(document.body,{childList:true,subtree:true});
});
'''.strip()


def finalize_admin_html():
    path = Path("admin.html")
    text = path.read_text(encoding="utf-8")

    text = text.replace("auth:{\n        persistSession:true,", "auth:{\n        storageKey:\"azaad-clinic-admin-auth\",\n        persistSession:true,", 1)
    text = text.replace("auth: {\n        persistSession: true,", "auth: {\n        storageKey: \"azaad-clinic-admin-auth\",\n        persistSession: true,", 1)
    text = text.replace("detectSessionInUrl:true", "detectSessionInUrl:false")
    text = text.replace("detectSessionInUrl: true", "detectSessionInUrl: false")
    text = re.sub(r'\n?\s*<script\s+src=["\']\./patient-session-bridge-v3\.js[^>]*></script>\s*', "\n", text, count=1, flags=re.I)

    text, count = re.subn(r'\nasync function restoreStaff\(\{', "\n" + AUTH_REFRESH_COORDINATOR + "\n\nasync function restoreStaff{", text, count=1)
    if count != 1:
        text, count = re.subn(r'\nasync function restoreStaff\(\)', "\n" + AUTH_REFRESH_COORDINATOR + "\n\nasync function restoreStaff()", text, count=1)
    if count != 1: raise RuntimeError("Could not locate restoreStaff()")

    text, count = re.subn(r'async function restoreStaff\(\)\{.*?\n\}\n\nasync function logout\(\)', ADMIN_AUTH + "\n\nasync function logout()", text, count=1, flags=re.S)
    if count != 1: raise RuntimeError("Could not replace restoreStaff()")

    listener = '''supabase.auth.onAuthStateChange((event, session) => {
  if(event === "SIGNED_OUT"){
    state.session = null; state.user = null; state.staff = null; state.initialized = false;
    try { sessionStorage.removeItem("azaad_admin_token"); } catch (_) {}
  }
  if(event === "TOKEN_REFRESHED" && session){
    state.session = session; state.user = session.user;
    try { sessionStorage.setItem("azaad_admin_token", session.access_token); } catch (_) {}
  }
});'''
    text, count = re.subn(r'supabase\.auth\.onAuthStateChange\(.*?\n\s*\}\s*\);', listener, text, count=1, flags=re.S)
    if count != 1: raise RuntimeError("Could not normalize onAuthStateChange()")

    text, count = re.subn(r'async function restore\(\)\{.*?\n\}\n\nasync function admin\(', '''let azaadStartupPromise = null;

async function restore(){
  if(azaadStartupPromise) return azaadStartupPromise;
  azaadStartupPromise = (async () => {
    const { data } = await supabase.auth.getSession();
    if(!data?.session?.access_token) return false;
    state.session = data.session; state.user = data.session.user;
    const valid = await restoreStaff();
    if(!valid) return false;
    state.initialized = true;
    $("loginPage").classList.add("hidden");
    $("adminPage").classList.remove("hidden");
    await load();
    return true;
  })();
  try { return await azaadStartupPromise; }
  catch(error){ console.error("Azaad admin restore failed:", error); return false; }
}

async function admin(''', text, count=1, flags=re.S)
    if count != 1: raise RuntimeError("Could not replace restore()")

    admin_block = '''async function admin(
  query,
  options = {}
){
  async function request(){
    const session = state.session || (await supabase.auth.getSession()).data.session;
    if(!session?.access_token) throw new Error("جلسة الإدارة غير موجودة.");
    const response = await fetch(`${SUPABASE_URL}/functions/v1/azaad-admin${query}`, {
      ...options,
      headers:{
        Accept:"application/json",
        ...(options.body ? {"Content-Type":"application/json"} : {}),
        Authorization:`Bearer ${session.access_token}`,
        ...(options.headers || {})
      },
      cache:"no-store"
    });
    let body = {};
    try { body = await response.json(); } catch(_) {}
    return { response, body };
  }

  let result = await request();
  if(result.response.status === 401){
    try { await azaadEnsureFreshSession(); }
    catch (_) { throw new Error("جلسة الإدارة منتهية."); }
    result = await request();
  }
  if(!result.response.ok){
    throw new Error(result.body?.error || result.body?.message || `HTTP ${result.response.status}`);
  }
  return result.body;
}

async function staffApi'''
    text, count = re.subn(r'async function admin\(\n  query,\n  options = \{\}\n\)\{.*?\n\}\n\nasync function staffApi', admin_block, text, count=1, flags=re.S)
    if count != 1: raise RuntimeError("Could not replace admin()")

    text, count = re.subn(r'async function staffApi\(\n  action,\n  payload = \{\}\n\)\{.*?\n\}\n\nlet data =', STAFF_API + "\n\nlet data =", text, count=1, flags=re.S)
    if count != 1: raise RuntimeError("Could not replace staffApi()")

    text = re.sub(r'\n?window\.AZAAD_REFRESH\s*=\s*azaadEnsureFreshSession;\s*', '\n', text)
    text = re.sub(r'\nwindow\.AZAAD_READY\s*=\s*\(async\s*\(\)\s*=>\s*\{.*?\n\}\)\(\);', '', text, count=1, flags=re.S)

    marker = '''window.AZAAD = {
  supabase,
  state,
  hasPermission,
  refresh:load,
  logout
};'''
    if marker not in text: raise RuntimeError("Could not find window.AZAAD marker")
    tail = "window.AZAAD_REFRESH = azaadEnsureFreshSession;\n\n" + marker + '''

if(!window.AZAAD_READY){
  window.AZAAD_READY = restore().then((ok) => !!ok);
}
window.AZAAD_AUTH_READY = window.AZAAD_READY;
'''
    text = re.sub(re.escape(marker) + r'.*?(?=</script>)', tail, text, count=1, flags=re.S)

    # Persistent Arabic/English UI. Inject once into the generated admin page so
    # the source admin.html remains the stable application and the build applies
    # the language layer consistently on every deployment.
    if "const AZAAD_I18N =" not in text:
        injection = "\n\n<script>\n" + ADMIN_I18N + "\n</script>\n"
        text = re.sub(r'</body>', injection + '</body>', text, count=1, flags=re.I)

    path.write_text(text, encoding="utf-8")
    print("Finalized admin auth, routed staff management through staff-admin, and enabled persistent Arabic/English UI")


finalize_admin_html()
