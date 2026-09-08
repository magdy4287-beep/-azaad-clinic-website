"""Retired legacy auth transform checkpoint.

Auth ownership is now canonicalized by qa/finalize-appwrite-admin-auth.py.
This step intentionally performs no runtime mutation so an older Supabase/session
implementation cannot be reintroduced into the production artifact by the build
pipeline. Keeping this bounded checkpoint preserves the existing build contract
while removing the duplicate auth owner from the engineering tree.
"""

from pathlib import Path


def main():
    required = Path("admin.html")
    if not required.exists():
        raise RuntimeError("admin.html is required before the retired auth checkpoint")
    text = required.read_text(encoding="utf-8")
    if not text.strip():
        raise RuntimeError("admin.html is empty")
    print("Retired legacy auth transform checkpoint: no runtime mutation")


if __name__ == "__main__":
    main()
