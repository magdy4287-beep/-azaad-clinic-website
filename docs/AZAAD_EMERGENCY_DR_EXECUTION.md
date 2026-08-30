# AZAAD Emergency DR Execution

Canonical evacuation order:

1. Restore the database from the validated emergency archive.
2. Start Storage migration only after database success.
3. Migrate every discovered Supabase Storage object to Appwrite.
4. Reconcile every migrated object before declaring Storage PASS.
5. Keep Supabase intact until all downstream gates are proven.

Canonical candidate branch: `emergency/supabase-evacuation`.

This document is part of the emergency execution baseline and is intentionally limited to evacuation evidence and ordering. Application repairs remain blocked until the evacuation gates complete.