# AZAAD CLINIC — Patient Number Display Contract

## Purpose

Make the Patient Center easier for staff without changing the canonical MRN stored in Supabase.

## Canonical value

The database remains the source of truth.

Example:

`AZA-000001`

## Admin display value

The administration UI displays:

`Patient 00001`

The `AZA-` prefix and the `360` wording are intentionally hidden from the everyday staff-facing Patient Center UI.

Examples:

| Canonical MRN | Admin display |
| --- | --- |
| `AZA-000001` | `Patient 00001` |
| `AZA-000002` | `Patient 00002` |
| `AZA-001234` | `Patient 01234` |

## Search contract

Staff may search using only the numeric patient number:

`00001`

The UI normalizes it internally to:

`AZA-000001`

The following remain accepted for compatibility where already supported:

- `00001`
- `1`
- `AZA-000001`
- `AZA000001`

The UI should never require staff to know or type the internal `AZA-` prefix.

## Data integrity

- No MRN database migration is required for this presentation change.
- Existing foreign-key relationships remain unchanged.
- Invoice, booking, clinical visit, payment, alert and follow-up records continue using the canonical patient identity.
- Patient names and clinical content must not be machine-translated as part of MRN formatting.

## Acceptance tests

1. `AZA-000001` renders as `Patient 00001` in Patient Center/admin patient surfaces.
2. Searching `00001` resolves the same patient as searching `AZA-000001`.
3. Searching `1` resolves `AZA-000001` when the existing search contract allows numeric shorthand.
4. Searching a six-digit number preserves leading zeroes in canonical normalization.
5. No database MRN values are rewritten by the presentation layer.
6. Patient 360 functionality remains available without exposing `360` in the everyday label.
7. Dynamic patient rows and modal content receive the same formatting.
8. English/Arabic switching does not change the canonical MRN or break numeric search.
9. Existing booking, invoice and clinical relationships continue to resolve the same patient.
