from pathlib import Path

path = Path("admin.html")
if not path.exists():
    raise SystemExit("admin.html missing")
text = path.read_text(encoding="utf-8")
marker = "AZAAD_ADMIN_LOGIN_ISOLATION_V1"
if marker in text:
    print("admin login isolation already installed")
    raise SystemExit(0)

script = r'''<script id="AZAAD_ADMIN_LOGIN_ISOLATION_V1">
/* AZAAD_ADMIN_LOGIN_ISOLATION_V1
 * Keep the login surface completely independent from the heavy Admin runtime.
 * Existing Supabase sessions are preserved; no credentials are read or stored.
 */
(function(){
  "use strict";
  function hasSession(){
    try{
      if(sessionStorage.getItem("azaad_admin_token")) return true;
    }catch(_){ }
    try{
      for(var i=0;i<localStorage.length;i+=1){
        var key=localStorage.key(i)||"";
        if(!key.includes("-auth-token")) continue;
        var raw=localStorage.getItem(key);
        if(!raw) continue;
        var parsed=JSON.parse(raw);
        if(parsed && (parsed.access_token || parsed.currentSession?.access_token)) return true;
      }
    }catch(_){ }
    return false;
  }
  if(!hasSession() && location.pathname !== "/admin-login.html"){
    location.replace("/admin-login.html");
  }
})();
</script>'''

if "</head>" not in text:
    raise SystemExit("admin.html has no </head>")
text = text.replace("</head>", script + "\n</head>", 1)
path.write_text(text, encoding="utf-8")
print("admin login isolation installed")
