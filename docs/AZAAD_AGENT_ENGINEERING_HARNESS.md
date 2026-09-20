# AZAAD — Agent Engineering Harness Contract

This document adapts publicly documented agent-first engineering practices to AZAAD's existing architecture. It does not depend on any specific model, vendor, or paid AI service.

## 1. Repository is the system of record

Architecture, ownership, execution plans, decision records, verification contracts, and recovery rules must be discoverable inside the repository. External conversation is not a durable engineering dependency.

## 2. Map, not manual

`AGENTS.md` is the navigation entry point. Detailed rules belong in focused documents under `docs/` and in executable gates under `qa/`. Do not grow one instruction file into an encyclopedia.

## 3. Depth-first execution

For every non-trivial task:

```text
current SHA
  -> root scan
  -> ownership/dependency map
  -> smallest root cause
  -> minimal safe repair
  -> targeted verification
  -> broader verification when warranted
  -> exact-SHA evidence
  -> knowledge update
  -> next root scan
```

A previously proven gate is not repeated unless its inputs changed or a release gate explicitly requires it.

## 4. Mechanical enforcement

Human preference becomes a machine-checkable invariant whenever practical. Prefer a failing gate with a precise remediation message over a long prose rule.

Critical AZAAD invariants include:

- Vercel is the production runtime owner.
- Appwrite owns identity/session boundaries.
- Neon owns production data.
- Every protected domain has one runtime owner, data owner, backend boundary, permission boundary, and E2E contract.
- No retired-provider residue is allowed in active source.
- Production secrets never enter browser artifacts.
- Authentication and authorization tests cannot be bypassed by fixtures or mocks that replace the real boundary.
- Build steps must not silently convert non-canonical source into canonical production source.

## 5. Entropy / garbage collection

New code must not duplicate an existing owner merely because the existing owner is inconvenient. Before adding a controller, service, workflow, gate, helper, or migration:

1. locate the current owner;
2. inspect its callers and verification coverage;
3. decide whether it should be extended, replaced, or retired;
4. create exactly one resulting owner;
5. remove proven superseded paths;
6. re-scan for duplicate ownership.

Recurring cleanup should target drift, dead files, contradictory documentation, duplicate verification, and stale compatibility layers.

## 6. Bounded self-healing

Self-healing is a closed-loop engineering property, not uncontrolled production mutation:

```text
detect -> classify -> fail closed -> diagnose -> bounded repair -> verify -> record
```

Automatic systems may diagnose, produce evidence, and prepare a bounded repair. They must not silently expand permissions, disable security checks, mutate production data, or introduce a new runtime owner.

AI-assisted repair remains optional. Core operation and recovery must remain possible with repository-native/free tooling.

## 7. Parallel work without competing ownership

Independent investigations may run concurrently, but writes affecting the same file, branch, runtime boundary, schema, or release artifact are serialized. Parallelism is for discovery and verification—not for creating competing implementations.

## 8. Evidence discipline

No claim of `PASS`, `FIXED`, `READY`, or `COMPLETE` is valid without fresh evidence from the command or workflow that proves it. A missing workflow run means the result is **not proven**.

## 9. Production safety

The agent must prefer a narrow reversible change over a broad rewrite. If evidence conflicts, stop at the failing boundary and fix the owner instead of weakening the assertion.

## 10. Free-forever constraint

The canonical clinic path must not require paid AI APIs, paid automation, or a paid database/hosting dependency. Optional external tooling may assist engineering but cannot become a runtime prerequisite.

## 11. Public inspiration boundary

The principles here are adapted from publicly available OpenAI material on harness engineering, agent legibility, repository-as-system-of-record, mechanical enforcement, and bounded agent operation. They are engineering principles, not a claim of access to private model internals.
