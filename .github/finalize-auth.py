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
    path.write_text(text, encoding="utf-8")
    print("Finalized admin auth and routed staff management through staff-admin")


finalize_admin_html()
