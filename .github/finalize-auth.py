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
    try {
      sessionStorage.setItem("azaad_admin_token", refreshed.data.session.access_token);
    } catch (_) {}
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

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/azaad-admin-auth`,
      {
        method:"GET",
        cache:"no-store",
        headers:{
          Accept:"application/json",
          Authorization:`Bearer ${current.access_token}`,
          apikey:SUPABASE_PUBLISHABLE_KEY
        }
      }
    );

    let body = {};
    try { body = await response.json(); } catch(_) {}
    return { response, body, session:current };
  }

  let result = await requestAccount();

  if(result.response?.status === 401){
    try { await azaadEnsureFreshSession(); }
    catch (_) { return false; }
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


def finalize_admin_html():
    path = Path("admin.html")
    text = path.read_text(encoding="utf-8")

    text = text.replace(
        "auth:{\n        persistSession:true,",
        "auth:{\n        storageKey:\"azaad-clinic-admin-auth\",\n        persistSession:true,",
        1,
    )
    text = text.replace(
        "auth: {\n        persistSession: true,",
        "auth: {\n        storageKey: \"azaad-clinic-admin-auth\",\n        persistSession: true,",
        1,
    )
    text = text.replace("detectSessionInUrl:true", "detectSessionInUrl:false")
    text = text.replace("detectSessionInUrl: true", "detectSessionInUrl: false")

    text = re.sub(
        r'\n?\s*<script\s+src=["\']\./patient-session-bridge-v3\.js[^>]*></script>\s*',
        "\n", text, count=1, flags=re.I
    )

    text, count = re.subn(
        r'\nasync function restoreStaff\(\)\{',
        "\n" + AUTH_REFRESH_COORDINATOR + "\n\nasync function restoreStaff(){",
        text, count=1
    )
    if count != 1:
        raise RuntimeError("Could not locate restoreStaff() for refresh coordinator")

    text, count = re.subn(
        r'async function restoreStaff\(\)\{.*?\n\}\n\nasync function logout\(\)',
        ADMIN_AUTH + "\n\nasync function logout()", text, count=1, flags=re.S
    )
    if count != 1:
        raise RuntimeError("Could not replace restoreStaff()")

    text = re.sub(
        r'supabase\.auth\.onAuthStateChange\(\s*async\s*\(\s*event,\s*session\s*\)\s*=>\s*\{.*?\n\s*\}\s*\);',
        '''supabase.auth.onAuthStateChange((event, session) => {
  if(event === "SIGNED_OUT"){
    state.session = null;
    state.user = null;
    state.staff = null;
    state.initialized = false;
    try { sessionStorage.removeItem("azaad_admin_token"); } catch (_) {}
  }
  if(event === "TOKEN_REFRESHED" && session){
    state.session = session;
    state.user = session.user;
    try { sessionStorage.setItem("azaad_admin_token", session.access_token); } catch (_) {}
  }
});''', text, count=1, flags=re.S
    )

    text, count = re.subn(
        r'async function restore\(\)\{.*?\n\}\n\nasync function admin\(',
        '''async function restore(){
  try{
    const { data } = await supabase.auth.getSession();
    if(!data?.session?.access_token) return false;
    state.session = data.session;
    state.user = data.session.user;
    const valid = await restoreStaff();
    if(!valid) return false;
    state.initialized = true;
    $("loginPage").classList.add("hidden");
    $("adminPage").classList.remove("hidden");
    await load();
    return true;
  }catch(error){
    console.error("Azaad admin restore failed:", error);
    return false;
  }
}

async function admin(''', text, count=1, flags=re.S
    )
    if count != 1:
        raise RuntimeError("Could not replace restore()")

    text = text.replace(
        '''    await restoreStaff();

    await load();

    toast(''',
        '''    const restored = await restoreStaff();
    if(!restored){
      throw new Error("تعذر استعادة جلسة الإدارة.");
    }
    state.initialized = true;
    await load();

    toast(''', 1
    )

    marker = '''window.AZAAD = {
  supabase,
  state,
  hasPermission,
  refresh:load,
  logout
};'''
    if marker not in text:
        raise RuntimeError("Could not find window.AZAAD marker")

    tail = marker + '''

window.AZAAD_READY = false;
window.AZAAD_AUTH_READY = restore().then((ok) => {
  window.AZAAD_READY = ok;
  return ok;
});
'''
    text = re.sub(re.escape(marker) + r'.*?(?=</script>)', tail, text, count=1, flags=re.S)

    path.write_text(text, encoding="utf-8")
    print("Finalized single-owner admin auth with serialized refresh coordinator")


finalize_admin_html()