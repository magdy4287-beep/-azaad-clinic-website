from pathlib import Path

ADMIN = Path('admin.html')
HARDENING = Path('admin-english-hardening.js')
LEGACY_RUNTIME_FILES = (
    'admin-nextgen-fixes.js',
    'admin-nextgen-v2.js',
)


def main():
    if not ADMIN.exists():
        raise SystemExit('admin-i18n-single-owner-gate: admin.html missing')
    text = ADMIN.read_text(encoding='utf-8')

    for filename in LEGACY_RUNTIME_FILES:
        if filename in text:
            raise SystemExit(
                f'admin-i18n-single-owner-gate: legacy runtime still loaded: {filename}'
            )

    hardening = HARDENING.read_text(encoding='utf-8') if HARDENING.exists() else ''
    forbidden = (
        'translateNode:',
        'MutationObserver(queueRun)',
        'localStorage.getItem(\'azaad_admin_lang\')===\'en\'',
        'observeEnglishDom',
    )
    for marker in forbidden:
        if marker in hardening:
            raise SystemExit(
                f'admin-i18n-single-owner-gate: duplicate translation runtime marker: {marker}'
            )

    if 'central-i18n.js' not in text:
        raise SystemExit('admin-i18n-single-owner-gate: central i18n is not present in admin.html')

    print('admin-i18n-single-owner-gate: PASS — one canonical admin i18n runtime')


if __name__ == '__main__':
    main()
