from pathlib import Path


def replace_once(path_name, marker, replacement):
    path = Path(path_name)
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    if marker in text:
        path.write_text(text.replace(marker, replacement, 1), encoding="utf-8")


def patch_admin_html():
    path = Path("admin.html")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    marker = "<script src=\"admin.js\""
    if marker in text and "patient-center-runtime.js" not in text:
        text = text.replace("</body>", '<script src="patient-center-runtime.js" defer></script>\n</body>', 1)
        path.write_text(text, encoding="utf-8")


def patch_admin_js():
    return


def patch_startup_restore():
    return


def patch_patient_center():
    path = Path("patients-center.js")
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    # Keep Patient Center's existing implementation intact; runtime widgets are injected separately.
    path.write_text(text, encoding="utf-8")


def inject_script(path_name, script_name):
    path = Path(path_name)
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    tag = f'<script src="{script_name}" defer></script>'
    if tag in text:
        return
    if '</body>' in text:
        path.write_text(text.replace('</body>', tag + '\n</body>', 1), encoding="utf-8")


patch_admin_html()
patch_admin_js()
patch_startup_restore()
patch_patient_center()
inject_script("admin.html", "frontdesk-workflow.js")
inject_script("admin.html", "patient-merge-tool.js")
inject_script("admin.html", "patient-clinical-history.js")
inject_script("clinical-assessment.html", "clinical-followup-widget.js")
inject_script("clinical-assessment.html", "clinician-transfer-widget.js")
print("patch-admin.py completed successfully")
