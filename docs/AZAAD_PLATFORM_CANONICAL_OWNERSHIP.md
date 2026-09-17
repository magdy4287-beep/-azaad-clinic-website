# AZAAD Platform Canonical Ownership

## Purpose

AZAAD is one extensible platform, not a collection of independent applications. Domain modules must consume canonical platform capabilities instead of creating local replacements.

## Canonical capability owners

| Capability | Canonical owner | Rule |
|---|---|---|
| Identity/Auth/Session | Appwrite + canonical Vercel auth boundary | No module-owned auth provider or session store |
| Database | Neon | No module-owned production database |
| Runtime/API | Vercel | No alternate production runtime |
| Source/CI | GitHub + GitHub Actions | CI must not mutate source or weaken gates |
| Language | `central-i18n.js` | Arabic/English are first-class; no module-local translation runtime |
| Date/Time | canonical platform date/time context | Store authoritative timestamps; display user-facing time in AZAAD 12-hour format |
| Scheduling/Appointments | canonical scheduling boundary | No specialty-specific appointment controller |
| Calendar | canonical calendar owner | Modules consume shared events/availability |
| AI | central AI capability | Modules provide context/policy adapters, not independent AI runtimes |
| Patient identity | canonical patient/MRN boundary | No module-specific patient identity |
| RCM/Finance | canonical financial boundaries | Clinical domains emit canonical financial events; they do not create shadow ledgers |
| Audit | canonical audit boundary | No local audit implementation that bypasses the platform audit contract |
| i18n direction | platform locale state | UI follows centralized RTL/LTR state |

## Time display contract

AZAAD stores and exchanges authoritative timezone-aware timestamps. User-facing operational time uses the existing AZAAD 12-hour convention (1–12 with AM/PM). A new module must not introduce a second clock format or local timezone conversion policy.

## Module contract

Every new module must declare:

- stable module key and version;
- owner domain and API boundary;
- dependencies on canonical capabilities;
- required roles/permissions;
- i18n keys, not hard-coded parallel translation dictionaries;
- scheduling/event requirements, using the canonical scheduling boundary;
- AI use cases and human-approval requirements, using the central AI capability;
- audit events;
- data ownership and retention requirements;
- certification status before activation.

## No-duplication rules

A module must not add another:

- authentication provider;
- session mechanism;
- patient identity/MRN generator;
- translation engine;
- appointment controller;
- calendar/time engine;
- AI gateway/provider abstraction;
- RCM ledger;
- audit ledger;
- production database connection strategy;
- runtime/deployment target.

A helper is permitted only when it is a pure adapter around the canonical owner and does not create a competing source of truth.

## Extensibility

New specialties (for example Dermatology, Dental, Orthopedics, Obstetrics & Gynecology, Internal Medicine, Neurology, Pediatrics, Physiotherapy) are registered as domain modules and consume these same capabilities. Future technologies may replace an implementation behind the canonical boundary without requiring every domain to be rewritten.

## AI self-healing boundary

AI may detect, classify, reproduce, explain, propose and verify deterministic defects. Automated repair must be bounded and reviewable. It must never silently mutate production data, expand permissions, disable security gates, replace canonical owners, or deploy a high-risk clinical/financial/auth change without the required human approval.

## Free-first architecture

Core operation must remain functional without a paid AI or infrastructure dependency. Prefer GitHub, Vercel free capabilities, Neon free capabilities, Appwrite free capabilities, browser-native APIs and open-source/local components when they meet reliability and security requirements. Paid services are optional adapters, never hidden hard dependencies.
