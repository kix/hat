-- =====================================================================
-- FIX: public.user_states is missing the `updated_at` column that
-- trigger_update_user_states_time (handle_updated_at()) writes to.
-- This caused Telegram login to fail with:
--   record "new" has no field "updated_at"
-- whenever link_telegram_user() updated a row in user_states.
-- Schema drift vs. supabase_setup.md, which always declared this column.
-- =====================================================================
alter table public.user_states
  add column if not exists updated_at timestamp with time zone
    default timezone('utc'::text, now()) not null;
