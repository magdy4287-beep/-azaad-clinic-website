# Azaad Full-Page Locale Contract

## Rule
The selected UI locale is authoritative for the entire rendered experience. English must not contain Arabic UI/data labels, and Arabic must not contain English UI/data labels.

## Scope
Admin, Patient, Front Desk, Doctor, Scheduling, Waiting List, Billing, Payments, Notifications and AI-generated presentation text are all in scope.

## Dynamic data
- Store canonical values in the database.
- Localized entities use explicit localized fields (for example `name_en` / `name_ar`) when both forms are supported.
- Never machine-translate a person's name and overwrite the source value.
- If an entity has no localized representation, the UI must use the approved display-name policy rather than silently mixing locales.

## Dates and times
All rendered dates/times must be formatted from the active locale and clinic timezone. Do not manually concatenate translated month/day strings.

## Statuses
Appointment and billing statuses are canonical keys. Presentation labels come from Central I18N.

## AI
AI presentation text must follow the active locale. AI must not invent translated status labels; it receives/returns canonical system values where possible.

## Release gate
A locale is not release-ready if any visible UI label, status, validation message, placeholder, tooltip, notification, date/time representation, or localized entity display violates the active locale contract.
