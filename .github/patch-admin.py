from pathlib import Path

# Idempotent build-time compatibility patch.
# The current main branch already contains the admin/session and Patient Center
# synchronization changes. Older regex-based patching was failing the Vercel
# build when the expected source marker had already changed.
#
# Keep this script intentionally safe: it only patches the legacy Patient Center
# init marker when that exact marker still exists; otherwise it is a successful
# no-op. This prevents stale build scripts from breaking production builds.

def patch_patient_center():
    path = Path("patients-center.js")
    if not path.exists():
        print("Patient Center source not found; skipping compatibility patch")
        return

    text = path.read_text(encoding="utf-8")
    marker = "  async function init() {\n    if (state.initialized) {"
    if "Patient Center waiting for admin restore:" in text:
        print("Patient Center startup synchronization already present")
        return
    if marker not in text:
        print("Patient Center init marker not found; source is already patched or structurally changed")
        return

    replacement = """  async function init() {
    // Wait for the admin controller to finish restoring the persisted Supabase session.
    // This prevents Patient Center from racing the admin authentication restore.
    try {
      if (window.AZAAD_READY) await window.AZAAD_READY;
    } catch (error) {
      console.warn('Patient Center waiting for admin restore:', error);
    }

    if (state.initialized) {"""

    path.write_text(text.replace(marker, replacement, 1), encoding="utf-8")
    print("Patched Patient Center startup synchronization")


patch_patient_center()
print("patch-admin.py completed successfully")
