# AZAAD — Canonical Engineering Tree

This is a compact ownership map for agents and engineers. It is a governance map, not a second implementation plan.

```text
AZAAD
├── Runtime
│   └── Vercel
├── Identity / Session
│   └── Appwrite
├── Production Data
│   └── Neon
├── Protected APIs / Domains
│   └── Explicit runtime owner + data owner + backend boundary + permission boundary + E2E contract
├── Verification
│   ├── GitHub Actions gates
│   ├── Exact-SHA artifact checks
│   └── Browser / production evidence where required
├── Historical Evidence
│   └── supabase/ and frozen certification snapshots
└── Documentation Governance
    └── Current architecture/go-live documents + root-scan policy
```

## Ownership rule

If two files, services, workflows, or providers appear to own the same production responsibility, the root scan must stop and classify the overlap before new implementation is added.

## Legacy rule

The presence of historical Supabase code or documentation is not itself a production defect. It becomes a defect when a current production path, current baseline, or new engineering instruction treats it as an active runtime/data owner.

## Change rule

Prefer modifying the canonical owner over creating another parallel owner. Preserve historical evidence when it is useful for rollback/DR/auditability, but make its non-production status explicit.
