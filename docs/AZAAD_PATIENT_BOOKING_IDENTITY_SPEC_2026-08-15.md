# Azaad Patient-First Booking Identity Contract

## Goal

A patient must be identified by mobile number before the public booking workflow can continue.

## Required flow

1. Patient enters mobile number.
2. System normalizes the number using the clinic's canonical phone normalizer.
3. System searches `clinic_patients` for an active matching file.
4. If a file exists:
   - Show the existing patient name and canonical MRN.
   - Let the patient explicitly choose **Continue with this patient file**.
   - Reuse the same patient identity for the booking.
   - Do not create another patient file.
5. If no file exists:
   - Show **Create new patient file**.
   - Only after that explicit action is the new-patient booking form unlocked.
   - The booking database trigger remains the final duplicate-prevention authority.

## Duplicate protection

- `clinic_patients.active` has a unique partial index on `patient_phone_normalized`.
- The existing booking trigger resolves a missing `patient_id` from the normalized phone and creates a patient only when no active match exists.
- Existing MRNs remain immutable.

## Current production verification

- Patient rows: 1.
- Active patient rows: 1.
- Canonical patient: `AZA-000001`.
- Phone: `01067346050` / normalized `201067346050`.
- Current booking: `AZD-A009BCCDC`.
- Current booking `patient_id` matches `AZA-000001`.
- Current booking date/time: `2026-08-16 17:00`.

## Security

The public lookup returns only identity/booking context needed to continue booking. It does not return clinical history, invoices, notes, assessments, or other medical records.

The service-role key exists only inside the Edge Function and never in browser code.
