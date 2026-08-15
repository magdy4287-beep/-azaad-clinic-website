# Azaad Clinical AI — Implementation Status

## Implemented in the AI branch

- Clinician AI Session Cockpit is connected to the existing clinical assessment data model.
- Active mental-health assessment template is loaded from Supabase.
- Approved clinical questions are loaded from `clinical_assessment_questions`.
- Session records are persisted in `clinical_assessment_sessions`.
- Boolean answers are persisted in `clinical_assessment_answers`.
- Current score, baseline and previous-visit score are displayed.
- Trend state is persisted as improving/stable/worsening/insufficient.
- Clinician notes are persisted with the session.
- Follow-up and transfer workspaces remain linked from the same clinician screen.
- Question favorites are supported for stored questions.
- AI candidate questions have an explicit approval state.
- Therapist access is included in the clinical assessment RLS policies.
- A clinical AI CI gate validates the safety boundary, persistence integration, bilingual UX and follow-up/transfer integration.

## Safety boundary

The Cockpit does not autonomously diagnose, prescribe, change medication, change treatment plans, or make emergency disposition decisions. AI-generated candidates are clearly marked and require clinician approval.

Validated instruments must be connected only with their official scoring rules and permitted/licensed source material. The existing clinic-authored starter template is explicitly treated as a structured interview, not a diagnostic scale.

## Next vertical slice

1. Add longitudinal chart visualization from `clinical_assessment_patient_history`.
2. Add explicit safety-flag workflow and acknowledgement UI.
3. Add approved instrument registry with provenance/licensing metadata.
4. Add clinician template/question management UI with audit history.
5. Add automated follow-up reminders from assessment results.
6. Add management-level aggregate reporting without exposing unnecessary clinical details.
