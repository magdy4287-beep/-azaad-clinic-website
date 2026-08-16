# Public Scheduling Migration

The public slot-read path is being moved from the legacy `azaad-clinic?api=slots` endpoint to the read-only `azaad-public-scheduling` Edge Function.

Booking mutation remains on the existing `azaad-clinic?api=book` boundary until its replacement is separately verified.
