# AZAAD — Portable Data Export Contract

**AI-First • Free-Only • Safety-Gated • Fail-Closed**

## Purpose

Define a provider-neutral export contract so AZAAD data can be restored to a qualified backend without depending on Supabase-specific storage formats or APIs.

## Required export bundle

```text
azaad-export/
├── manifest.json
├── schema.sql
├── migrations/
├── data/
│   ├── patients.jsonl
│   ├── staff.jsonl
│   ├── roles.jsonl
│   ├── bookings.jsonl
│   ├── visits.jsonl
│   ├── clinical-records.jsonl
│   ├── invoices.jsonl
│   ├── payments.jsonl
│   └── audit-events.jsonl
├── storage-manifest.jsonl
└── checksums.sha256
```

The exact entity list may evolve with the AZAAD schema; the manifest must declare the schema version and every exported dataset.

## Manifest requirements

`manifest.json` must contain, at minimum:

- export format version
- AZAAD schema/migration version
- source environment identifier
- candidate Git SHA
- export creation timestamp
- dataset names
- record counts
- object counts
- checksum algorithm
- backup encryption status

Do not put credentials, service-role keys, access tokens, plaintext passwords, or unnecessary PII into the manifest.

## Data rules

### Relational data

Exports must preserve logical IDs and relationships. Foreign keys must be reconstructable from the exported data and schema.

### Identity

Never export plaintext passwords.

Password hashes may only be exported when the source and destination security contracts explicitly support secure hash portability and the migration has been independently verified. Otherwise preserve identity mapping and require secure password reset/reauthentication at the destination.

### Storage

Every object must have a portable logical identity and checksum. Provider-specific object keys are metadata, not the authoritative identity.

### Audit

Audit events must retain their actor, action, target entity, timestamp, outcome, and correlation metadata required by the AZAAD audit contract.

## Integrity gate

Before import:

1. verify `checksums.sha256`;
2. verify the manifest counts against the actual files;
3. verify the schema/migration version is supported;
4. verify the export is encrypted when it contains sensitive data;
5. reject the bundle if any integrity check fails.

After import:

- compare record counts;
- validate foreign keys;
- detect orphan records;
- detect duplicate logical IDs;
- compare storage-object counts and checksums;
- verify audit/event counts;
- run authorization-negative tests;
- run applicable clinical/financial E2E tests.

Any unexplained mismatch is `NOT PROVEN` and blocks failover.

## Encryption

Sensitive exports must be encrypted before leaving the trusted runtime. Encryption keys must be stored separately from encrypted artifacts.

The repository must contain only the export contract, tooling, and non-sensitive fixtures—not production exports.

## Restore order

```text
VERIFY ARTIFACT
    ↓
RESTORE SCHEMA
    ↓
RESTORE IDENTITY MAPPINGS
    ↓
RESTORE CORE DOMAIN DATA
    ↓
RESTORE CLINICAL/FINANCIAL DATA
    ↓
RESTORE STORAGE METADATA/OBJECTS
    ↓
RESTORE AUDIT/EVENT DATA
    ↓
REBUILD AUTHORIZATION
    ↓
RECONCILE
    ↓
SECURITY + E2E
    ↓
CERTIFY OR FAIL-CLOSED
```

Never expose a partially restored database to production traffic.

## Versioning

Changes to this contract require a version bump and a fresh DR qualification cycle. Existing exports must remain readable for at least the supported recovery window.

## Free-Only constraint

No paid migration service, managed export service, paid backup provider, paid monitoring system, or paid recovery feature may be required to satisfy this contract.

If a capability cannot be demonstrated with the approved Free-Only stack, record:

`NOT PROVEN ON FREE-ONLY STACK`

and stop before production cutover.
