# Azaad Clinic — Production Frontend

Production frontend for Azaad Clinic.

## Deployment

- Primary production deployment: Vercel
- Repository branch: `main`
- Static frontend: this repository
- Backend: Supabase Edge Function `azaad-clinic`

## Routes

- Patient site: `/`
- Admin control center: `/admin/`
- Booking status: `/booking-status.html`

## Security

- The frontend must never contain a Supabase Service Role key.
- Administrative operations are protected by Supabase Auth, RLS, and secured Edge Functions.
- Sensitive clinic settings are not publicly readable from the `clinic_settings` table.
