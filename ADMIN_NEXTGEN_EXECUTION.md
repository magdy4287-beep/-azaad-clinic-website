# Azaad Admin Next-Gen Execution Notes

## 2026-08-15 — latest requested fixes

### Added to the master plan
- Bookings: universal search by patient name, mobile, canonical MRN, and booking number.
- Bookings: date-driven search for today, yesterday, tomorrow, or any future/past date through the existing appointments-center Edge Function.
- Patient reception: universal search by name, mobile, MRN, and booking number plus selected-date results.
- Patient cards: visible per-phone Search action to reuse the phone number in patient/booking search.
- Language: one unified Arabic/English control; duplicate language controls are hidden; switching is performed in-place without reloading the admin session.
- Language: reversible text-source handling so switching back to Arabic does not leave stale English fragments.
- Patient icon: protected against legacy DOM replacement erasing headings/labels; friendly green patient indicator is preserved.

### Safety constraints
- Existing Supabase Auth/session restoration remains the source of admin authentication.
- No service-role key is added to frontend code.
- AI remains advisory; core booking, patient, finance, HR and security workflows do not depend on AI.
- Changes are additive and use the existing Edge Functions and RLS boundaries.
- Main is not merged until the browser E2E and the new admin-nextgen gate pass.

### Current validation
- PR #16 remains open and mergeable.
- The first admin-nextgen gate correctly caught a syntax error in the initial overlay before it could be accepted.
- A syntax-safe V2 overlay replaced that failed implementation, and the gate was updated to validate V2.
- Browser E2E for the current PR head is running.
