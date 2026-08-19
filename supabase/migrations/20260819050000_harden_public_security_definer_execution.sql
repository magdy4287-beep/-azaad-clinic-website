-- Harden direct RPC execution of SECURITY DEFINER helpers and reports.
-- Keep authenticated execution only where the function is an intentional application entrypoint
-- and the function itself performs role/scope authorization.

revoke all on function public.azaad_audit_event(text,text,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.azaad_daily_finance_report(date,date) from public, anon, authenticated;
revoke all on function public.azaad_expense_audit() from public, anon, authenticated;
revoke all on function public.azaad_guard_invoice_mutation() from public, anon, authenticated;
revoke all on function public.azaad_guard_paid_expense() from public, anon, authenticated;
revoke all on function public.azaad_invoice_audit() from public, anon, authenticated;
revoke all on function public.azaad_is_admin_or_owner() from public, anon, authenticated;

-- These are trigger/helper functions, not public RPC entrypoints. Their owning
-- database objects invoke them internally, while direct client invocation is blocked.
revoke all on function public.block_unapproved_refund_processing() from public, anon, authenticated;
revoke all on function public.enforce_bank_refund_admin_approval() from public, anon, authenticated;
revoke all on function public.enforce_refund_approval_rules() from public, anon, authenticated;
revoke all on function public.enforce_refund_rejection_update() from public, anon, authenticated;
revoke all on function public.clinic_enforce_bank_transfer_verification() from public, anon, authenticated;
revoke all on function public.clinic_payment_workflow_after_change() from public, anon, authenticated;
revoke all on function public.clinic_sync_payment_workflow() from public, anon, authenticated;
revoke all on function public.clinic_sync_verified_payment() from public, anon, authenticated;
revoke all on function public.clinic_validate_booking_status_transition() from public, anon, authenticated;
revoke all on function public.clinic_validate_payment() from public, anon, authenticated;
revoke all on function public.prevent_clinic_booking_overlap() from public, anon, authenticated;
revoke all on function public.clinic_waiting_list_audit() from public, anon, authenticated;

-- Public booking is intentionally anonymous and remains the sole anonymous
-- SECURITY DEFINER application entrypoint in this set.
revoke execute on function public.clinic_public_book_appointment_action(text,text,text,uuid,uuid,date,time,text,text,text) from authenticated;
grant execute on function public.clinic_public_book_appointment_action(text,text,text,uuid,uuid,date,time,text,text,text) to anon;

-- Explicitly preserve authenticated access to the application entrypoints whose
-- bodies enforce staff/role/scope authorization.
grant execute on function public.clinic_start_visit(uuid) to authenticated;
grant execute on function public.clinic_end_visit(uuid) to authenticated;
grant execute on function public.clinic_reschedule_booking_action(uuid,date,time,uuid,uuid,text) to authenticated;
grant execute on function public.owner_set_staff_account_status(uuid,text,text) to authenticated;
