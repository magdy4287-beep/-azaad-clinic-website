# AZAAD Emergency DR Restore Execution Marker

This marker belongs to the emergency DR execution branch only.

- Canonical production SHA remains `d2a6cbbf0d9b440f5c730bda976ee9bcd754deb0`.
- Emergency restore candidate is the current head of `codex/azaad-emergency-dr-execution`.
- PostgreSQL restore uses the filtered `pg_restore --use-list` path.
- Production cutover remains blocked until identity, authorization, storage, function equivalence, and E2E gates are proven.
