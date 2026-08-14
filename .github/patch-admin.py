from pathlib import Path
import re

path = Path("admin.html")
text = path.read_text(encoding="utf-8")

pattern = re.compile(
    r'async function restoreStaff\(\)\{.*?\n\}\n\nasync function logout\(\)',
    re.S,
)

replacement = '''async function restoreStaff(){

  if(!state.user?.id){
    return false;
  }

  const accessToken = state.session?.access_token;
  if(!accessToken){
    return false;
  }

  try{
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/azaad-admin?api=account`,
      {
        method:"GET",
        headers:{
          Accept:"application/json",
          Authorization:`Bearer ${accessToken}`,
          apikey:SUPABASE_PUBLISHABLE_KEY
        },
        cache:"no-store"
      }
    );

    let body = {};
    try { body = await response.json(); } catch(_) {}

    if(!response.ok || !body?.admin){
      console.warn("Admin restore failed; keeping authenticated session.", body?.error || `HTTP ${response.status}`);
      return false;
    }

    return applyStaff(body.admin);
  }catch(error){
    console.error("Admin restore request failed:", error);
    return false;
  }
}

async function logout()'''

patched, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit("Expected legacy restoreStaff block was not found")

# Force a fresh browser resource for the current bridge implementation.
patched = patched.replace(
    'patient-session-bridge-v3.js?v=4.1.0',
    'patient-session-bridge-v3.js?v=4.3.0',
)

path.write_text(patched, encoding="utf-8")
print("Legacy restore logout path removed and session bridge cache-busted")
