# AZAAD Facility Operating Modes

## Purpose
AZAAD supports one canonical platform with two owner-selectable operating modes:

- `CLINIC_ONLY`: expose and enable clinic workflows only.
- `HOSPITAL_ONLY`: expose and enable hospital workflows only.

This is a presentation/workflow policy, not a second application and not a second runtime/data stack.

## Canonical architecture

Admin/Owner setting
-> facility mode policy
-> navigation/module registry
-> role/permission evaluation
-> existing domain boundaries
-> Appwrite session -> Vercel APIs -> Neon

No mode may create a second auth provider, database, API runtime, or duplicated domain implementation.

## Module registry

Modules are capability descriptors with stable IDs and dependencies. Examples include:

- Core / Patient / Scheduling / Clinical / RCM / Finance / Staff
- Emergency Department / Admission & Discharge / Wards / ICU / Nursing
- Pharmacy Internal / Pharmacy External / Laboratory / Radiology
- Operating Room / Anesthesia / PACU
- Physiotherapy / Dermatology / Dental / Orthopedics / Obstetrics & Gynecology / Internal Medicine / Neurology / Pediatrics
- Future modules registered without changing the core mode engine.

A specialty module is not assumed to be active merely because its code exists. Activation is explicit, dependency-checked, audited, and role-governed.

## Safety

Changing facility mode must be owner/admin authorized, server validated, audited, and versioned. It must not delete clinical or financial data. Existing records remain accessible according to their domain and role policy.

Mode switching must not silently revoke active clinical sessions or alter clinical authorization. A deployment/version change must be used for structural migrations; configuration changes only select already-certified modules.

## Internationalization

The mode registry is jurisdiction-neutral. Country-specific billing, payer, coding, consent, privacy, prescribing, and emergency policies belong to configurable policy modules rather than hard-coded country assumptions.

## AI

AI capabilities are cross-cutting services with explicit fail-closed policy. AI may assist documentation, summarization, coding suggestions, payer authorization preparation, workflow routing, anomaly detection, and diagnostics support where approved. It must not autonomously prescribe, diagnose, approve insurance, discharge, change permissions, or modify production data.

AI provider selection is an implementation detail behind one canonical AI boundary; free/open-source/local capabilities should be preferred where clinically and operationally safe. No paid provider is a mandatory runtime dependency.
