# Azaad Clinical Evidence Library — Roadmap

## Goal
Create a clinician-controlled evidence and question library that powers the Doctor/Therapist session cockpit without turning AI into an autonomous clinical decision-maker.

## Library layers

1. **Approved questions** — clinician-approved prompts used in sessions.
2. **Validated instruments** — instruments with official scoring rules and provenance.
3. **AI candidates** — generated suggestions that remain unusable clinically until an authorized clinician approves them.
4. **Evidence updates** — source metadata, update date, evidence type, license/reuse status, and clinician review state.
5. **Templates** — reusable session sets by specialty/domain.

## Domains

Psychiatry, depression, anxiety, addiction/substance-use disorders, CBT, psychotherapy, relapse prevention, sleep and mental health, psychosis/bipolar disorders, self-harm/suicide safety, recovery, measurement-based care, and other clinic-approved domains.

## Required metadata

- source_name
- organization
- title
- topic/domain
- publication_date
- updated_at
- source_url
- evidence_type
- license_status
- version
- last_verified_at
- language
- processing_status
- content_hash/version identifier when appropriate

## Clinical governance

- Never invent validated scoring formulas.
- Never present an AI-generated question as a validated instrument.
- Every AI candidate requires clinician approval before clinical use.
- Clinical changes are audited.
- Restricted/copyrighted content is not ingested without permission.
- Metadata/link may be stored when full text reuse is not permitted.
- AI suggestions remain advisory and require human review.

## UX

The library should support:

- Search.
- Domain filter.
- Favorites.
- Reviewed state.
- Discuss with team.
- Source link.
- Version visibility.
- Add/edit/archive for authorized users.
- Question approval/rejection.
- Template assignment.
- Arabic/English.

## Daily Evidence Center

A future updater should periodically check approved public/open sources, deduplicate updates, and create a concise clinician briefing. The last verified feed remains visible when fresh AI generation is unavailable.

## Integration

The library feeds:

`Patient 360 → Session Cockpit → Answers → Official score → Longitudinal trend → Clinical review → Follow-up`

It also feeds the clinician education center and management-level, permission-safe aggregate reporting.

## Definition of Done

UI + database persistence + role permissions + provenance + audit + bilingual UX + licensing checks + AI-off fallback + regression tests + production verification.
