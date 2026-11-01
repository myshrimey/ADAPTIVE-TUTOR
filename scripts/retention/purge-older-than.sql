-- SAHAYAK retention purge TEMPLATE (v94). NOT RUN BY ANYONE AUTOMATICALLY. NOT LEGAL ADVICE.
-- The periods in this file are interim proposals (Decision D3). Get professional advice (TASK-040) before using it on real data.
--
-- HOW TO USE (founder, in the Supabase SQL editor, which runs as the database owner):
--   1. Open /admin/retention and read the "would be removed" counts (dry run).
--   2. Take a backup (Supabase > Database > Backups).
--   3. Change the dates below ONLY if the professional advised different periods.
--   4. Run the whole file once. It is one transaction: if anything looks wrong, change "commit" to "rollback".
-- It never touches: learning data, reports, handwritten answers, payments, commerce events, consent records.

begin;

-- Audit trail: append-only for everyone except this deliberate, owner-only switch (same session only).
set local sahayak.audit_purge = 'on';
delete from public.audit_logs where at < now() - interval '1095 days';

delete from public.page_views          where at         < now() - interval '395 days';
delete from public.ai_usage            where created_at < now() - interval '395 days';
delete from public.signup_log          where created_at < now() - interval '395 days';
delete from public.engagement_events   where created_at < now() - interval '395 days';
delete from public.account_devices     where last_seen  < now() - interval '395 days';
delete from public.acquisition_touches where at         < now() - interval '395 days';

commit;  -- change to: rollback;   if you only wanted to see that it runs
