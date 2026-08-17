# AZAAD — Clinical Negative Authorization E2E Gate

## Purpose

Close the Clinical Security/UAT evidence gap without weakening RLS or RPC authorization.

## Required cases

1. Unauthenticated caller → check-in/start-visit denied.
2. Authenticated non-staff → denied.
3. Staff without the required permission → denied.
4. Doctor A attempting a visit assigned to Doctor B → denied.
5. Invalid appointment/workflow state → denied.
6. Correctly scoped active staff/doctor → allowed.

## Acceptance evidence

- Tests execute in CI against a controlled test environment.
- Each negative case proves denial at the authorization boundary, not merely a hidden UI control.
- The authorized case proves the expected clinical workflow still succeeds.
- No test changes production authorization, RLS, SECURITY DEFINER, or role mappings.
- Evidence records exact commit, test job, and artifacts.

## Certification rule

This gate remains **OPEN** until executable CI evidence exists for all cases above. Documentation alone does not certify Clinical E2E.

## Downstream sequence

Clinical Negative Authorization E2E → Clinical Full E2E → Financial E2E → Human-Approved AI → Security/UAT → Go-Live → Continuous Operations.

Arabic/English localization remains centralized only in the Patient and Administration dashboards.
