# AZAAD Emergency DR Execution Trigger — 2026-08-29

This file is an audit-only trigger for the emergency DR workflow on the dedicated execution branch.

It does not modify production, Supabase schema, application runtime, or the canonical `main` SHA.

The workflow must verify the exact branch commit before exporting the Supabase public schema to the Neon DR candidate.
