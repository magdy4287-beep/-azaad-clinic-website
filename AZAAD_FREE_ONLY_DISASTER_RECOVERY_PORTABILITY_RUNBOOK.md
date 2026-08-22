# AZAAD — Free-Only Disaster Recovery & Portability Runbook

**AI-First • Free-Only • Safety-Gated • Fail-Closed**

## Permanent contract

AZAAD must remain free-only now and in the future. No paid provider plan, paid API, paid recovery resource, paid monitoring service, paid AI credit, or paid add-on may be introduced to satisfy a recovery gate.

If a required recovery capability cannot be proven on the free-only stack, record `NOT PROVEN ON FREE-ONLY STACK`; do not weaken security controls and do not create a paid dependency.

## Objectives

1. Keep application behavior portable across providers.
2. Keep PostgreSQL schema and migrations provider-independent where practical.
3. Preserve patient, clinical, scheduling, financial, audit, and identity relationships during migration.
4. Never export plaintext passwords, secrets, service-role keys, or unnecessary PII into Git.
5. Require integrity verification before any restore or failover.
6. Require fresh security, authorization, UAT, and E2E evidence before declaring a DR environment production-ready.

## Provider model

Supabase is the current primary backend runtime. It is not the authoritative owner of AZAAD's data model.

The portable source of truth is:

- PostgreSQL schema and migrations
- application code
- authorization/RLS model
- Edge/API contracts
- audit/event contracts
- encrypted export artifacts
- identity mapping rules
- exact-SHA evidence

Preferred emergency targets, in order of architectural compatibility:

1. PostgreSQL-compatible self-controlled runtime using open-source components.
2. A free PostgreSQL provider qualified at incident time.
3. A free/open-source BaaS only when its Auth, storage, authorization, limits, and export behavior pass the qualification gate.

A provider is never approved merely because it advertises a free tier.

## Backup contract

### Database export

Export, at minimum:

- schema
- tables and data
- constraints and foreign keys
- indexes required by application correctness/performance
- functions and triggers required by application behavior
- RLS policies and grants
- migration history/metadata needed to rebuild the schema

Do not include secrets in repository artifacts.

### Object storage

For every stored object maintain portable metadata:

- logical object ID
- owning entity ID
- object type
- content type
- size
- checksum
- creation/update timestamps
- storage-provider key

The provider key is an implementation detail; the logical object ID remains stable.

### Identity

Never store plaintext passwords in exports.

If password-hash portability is not explicitly supported and verified by the destination provider, migrate identities and force a secure password reset/reauthentication flow instead of attempting to transform or recover passwords.

## Backup integrity

Every backup artifact must have a SHA-256 checksum generated outside the application database.

Restore is fail-closed:

`checksum(original) == checksum(received)`

If the checksum differs: stop the restore and preserve both artifacts for investigation.

Encrypted backups and their decryption keys must be stored separately.

## Incident levels

### Level 0 — Normal

Primary provider healthy. Maintain portable exports and periodically verify that exports can be parsed.

### Level 1 — Degraded provider

Reduce non-essential writes, monitor errors, and prepare a fresh export. Do not switch providers on a single transient error.

### Level 2 — Provider risk

Freeze non-essential writes, create an encrypted export, calculate checksum, verify the export, and prepare the DR runtime.

### Level 3 — Provider unavailable

1. Freeze writes on the primary when possible.
2. Capture the last trusted export.
3. Encrypt and checksum the export.
4. Restore schema and data to the qualified DR runtime.
5. Recreate authorization/RLS before exposing the runtime.
6. Reconcile record counts and relationships.
7. Run security and authorization regression tests.
8. Run clinical/financial/UAT tests applicable to the restored scope.
9. Run production/browser E2E against the DR candidate.
10. Switch the application endpoint only after fresh evidence passes.
11. Preserve the original primary snapshot and incident evidence.

### Level 4 — Suspected security incident

Do not perform a blind migration.

- isolate the affected provider/runtime
- revoke and rotate exposed credentials
- preserve evidence
- determine the trusted data snapshot
- restore only from a verified trusted artifact
- re-establish authorization boundaries first
- perform security validation before application traffic is restored

## Data reconciliation

After import compare at minimum:

- patient count
- appointment/booking count
- visit count
- invoice/payment/refund count
- audit/event count
- staff/role mapping count
- storage-object count
- foreign-key integrity
- orphan records
- duplicate logical IDs
- timestamp sanity

Any unexplained mismatch is `NOT PROVEN` and blocks failover.

## Authorization reconstruction

The destination must reproduce the effective security contract, not merely the table structure.

Verify:

- authenticated versus anonymous boundaries
- patient isolation
- staff/doctor/owner scopes
- privileged server-side operations
- SECURITY DEFINER protections where retained
- RLS policies and grants
- Edge/API authorization
- audit attribution
- fail-closed denial behavior

Never solve a migration problem by broadening grants or disabling RLS.

## Endpoint portability

Application code should use an AZAAD-owned configuration/adapter boundary for backend endpoints rather than scattering provider-specific URLs throughout business logic.

The adapter must expose stable logical operations such as:

- auth/session
- patient lookup
- scheduling
- clinical records
- financial operations
- audit/event recording
- storage object access

Provider-specific SDK calls remain behind that boundary where practical.

## Failover states

`PRIMARY → DEGRADED → FREEZE → EXPORT → VERIFY → RESTORE → SECURITY TEST → UAT/E2E → CUTOVER → MONITOR`

Never transition directly from `EXPORT` to `CUTOVER`.

## Rollback

Keep the last trusted primary snapshot and the destination snapshot until post-cutover verification completes.

If post-cutover integrity or authorization evidence fails:

`STOP WRITES → PRESERVE EVIDENCE → RETURN TO LAST TRUSTED STATE`

Do not delete the failed destination before forensic/evidence requirements are satisfied.

## Recovery certification

A DR environment may be called **CERTIFIED** only when the exact candidate SHA and destination data snapshot have fresh evidence for all applicable gates.

Otherwise use:

`NOT PROVEN ON FREE-ONLY STACK`

This runbook does not authorize production migration by itself. A real restore drill requires a qualified free-only environment and fresh evidence.
