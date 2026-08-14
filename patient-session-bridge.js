/* ============================================================
   AZAAD CLINIC — PATIENT SESSION BRIDGE
   v1.0.0

   Purpose:
   - Expose the SAME Supabase Auth session used by admin.html
     to the Patient Center module.
   - Fix module-order/session timing on GitHub Pages + Safari.
   - Never contains a Service Role Key.
   ============================================================ */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://derofsthjivlkcdnojww.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GC253fvQebNBsDOaKjWGRw_tPYJrgLa";
const SESSION_KEY = "azaad_admin_token";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

const publishSession = (session) => {
  window.AZAAD = window.AZAAD || {};
  window.AZAAD.supabase = supabase;
  window.AZAAD.state = window.AZAAD.state || {};
  window.AZAAD.state.session = session || null;

  if (session?.access_token) {
    try {
      sessionStorage.setItem(SESSION_KEY, session.access_token);
    } catch (_) {}
  }
};

// Resolve the persisted Supabase session BEFORE the Patient Center module
// continues, preventing the Safari/GitHub-Pages race condition.
const { data, error } = await supabase.auth.getSession();
if (error) {
  console.warn("Azaad patient session bridge:", error);
}
publishSession(data?.session || null);

window.AZAAD_PATIENT_SESSION = {
  supabase,
  getAccessToken: async () => {
    const result = await supabase.auth.getSession();
    const session = result.data?.session || null;
    publishSession(session);
    return session?.access_token || "";
  }
};

supabase.auth.onAuthStateChange((_event, session) => {
  publishSession(session || null);
});
