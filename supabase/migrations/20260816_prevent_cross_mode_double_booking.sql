-- Azaad Clinic scheduling integrity
-- Prevent the same doctor/time slot from being occupied by both clinic and online bookings.
-- Cancellation/no-show remain reusable because only pending/confirmed rows participate.

drop index if exists public.clinic_bookings_active_slot_uniq;

create unique index clinic_bookings_active_slot_uniq
on public.clinic_bookings (doctor_id, appointment_date, appointment_time)
where status in ('pending','confirmed');
