from pathlib import Path
import re

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
    path.write_text(text, encoding="utf-8")
    print("Finalized admin auth topology")

finalize_admin_html()
