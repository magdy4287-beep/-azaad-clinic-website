from pathlib import Path
import re

ADMIN_AUTH = '''
async function restoreStaff(){

  if(!state.user?.id){
    return false;
  }

  async function requestAccount(){
    const current = state.session || (await supabase.auth.getSession()).data.session;
    if(!current?.access_token){
      return { response:null, body:null, session:null };
    }

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
    const refreshed = await supabase.auth.refreshSession();
    if(refreshed.error || !refreshed.data?.session){
      return false;
    }

    state.session = refreshed.data.session;
    state.user = refreshed.data.session.user;
    result = await requestAccount();
  }

  if(!result.response?.ok || !result.body?.admin){
    return false;
  }

  if(!applyStaff(result.body.admin)){
    return false;
  }

  state.session = result.session || state.session;
  state.user = result.body.user || state.user;
  try {
    sessionStorage.setItem('azaad_admin_token', state.session.access_token);
  } catch (_) {}

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
        "\n",
        text,
        count=1,
        flags=re.I,
    )

    # Replace the legacy client-side clinic_staff lookup with the single
    # server-side auth controller. This avoids RLS/session races on reload.
    text, count = re.subn(
        r'async function restoreStaff\(\)\{.*?\n\}\n\nasync function logout\(\)',
        ADMIN_AUTH + "\n\nasync function logout()",
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("Could not replace restoreStaff()")

    # A SIGNED_IN event is handled by login()/restore(); keeping another
    # async restore path here creates a race around refresh-token rotation.
    text = re.sub(
        r'supabase\.auth\.onAuthStateChange\(\s*async\s*\(\s*event,\s*session\s*\)\s*=>\s*\{.*?\n\s*\}\s*\);',
        '''supabase.auth.onAuthStateChange((event) => {

  if(event === "SIGNED_OUT"){
    state.session = null;
    state.user = null;
    state.staff = null;
    state.initialized = false;
    try { sessionStorage.removeItem("azaad_admin_token"); } catch (_) {}
  }

  if(event === "TOKEN_REFRESHED"){
    const session = supabase.auth.getSession();
    session.then(({data}) => {
      if(data?.session){
        state.session = data.session;
        state.user = data.session.user;
        try { sessionStorage.setItem("azaad_admin_token", data.session.access_token); } catch (_) {}
      }
    }).catch(() => {});
  }
});''',
        text,
        count=1,
        flags=re.S,
    )

    # Replace restore() so it explicitly owns the reload path and publishes a
    # single readiness event for Patient Center.
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

    window.dispatchEvent(new CustomEvent("azaad:auth-ready"));
    await load();
    return true;
  }catch(error){
    console.error("Azaad admin restore failed:", error);
    return false;
  }
}

async function admin(''',
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise RuntimeError("Could not replace restore()")

    # Login must not continue into load() if server-side account restoration fails.
    text = text.replace(
        '''    await restoreStaff();

    await load();

    toast(''',
        '''    const restored = await restoreStaff();
    if(!restored){
      throw new Error("تعذر استعادة جلسة الإدارة.");
    }

    state.initialized = true;
    window.dispatchEvent(new CustomEvent("azaad:auth-ready"));
    await load();

    toast(''',
        1,
    )

    # Make restoreStaff's server response the canonical staff source on login.
    # The existing setSession() remains responsible for Supabase persistence.

    # Explicitly invoke restore after the module defines window.AZAAD. This was
    # the missing call that made a reload stay on Login even with a valid session.
    marker = '''window.AZAAD = {
  supabase,
  state,
  hasPermission,
  refresh:load,
  logout
};'''
    replacement = marker + '''

window.AZAAD_READY = false;
window.AZAAD_AUTH_READY = restore().then((ok) => {
  window.AZAAD_READY = ok;
  return ok;
});'''
    if marker not in text:
        raise RuntimeError("Could not find window.AZAAD marker")
    text = text.replace(marker, replacement, 1)

    path.write_text(text, encoding="utf-8")
    print("Finalized single-owner admin auth with explicit reload restore")

finalize_admin_html()
