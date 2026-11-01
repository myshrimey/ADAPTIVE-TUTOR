-- 0057 (v91): tamper-resistant audit trail.
-- Adds who/what was touched, why and the outcome to audit_logs, and blocks edits, deletes and truncation
-- by anyone except the database owner running a deliberate purge. Re-runnable.
-- Honest limit: this stops the app, the service key and ordinary SQL users from changing history;
-- the database OWNER can still switch the guard off on purpose. It is tamper-RESISTANT, not unbreakable.

alter table public.audit_logs add column if not exists target_account text;
alter table public.audit_logs add column if not exists reason text;
alter table public.audit_logs add column if not exists outcome text;
alter table public.audit_logs add column if not exists request_id text;
alter table public.audit_logs add column if not exists actor_role text;

create index if not exists idx_audit_logs_target on public.audit_logs (target_account, at desc) where target_account is not null;
create index if not exists idx_audit_logs_action on public.audit_logs (action, at desc);

create or replace function public.audit_logs_guard() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('sahayak.audit_purge', true), '') = 'on' then
    return old; -- deliberate purge by the database owner only (set in the same SQL session)
  end if;
  raise exception 'audit_logs is append-only (% blocked)', tg_op using errcode = '42501';
end $$;

drop trigger if exists trg_audit_logs_no_update_delete on public.audit_logs;
create trigger trg_audit_logs_no_update_delete before update or delete on public.audit_logs
  for each row execute function public.audit_logs_guard();

create or replace function public.audit_logs_guard_truncate() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('sahayak.audit_purge', true), '') = 'on' then return null; end if;
  raise exception 'audit_logs is append-only (TRUNCATE blocked)' using errcode = '42501';
end $$;

drop trigger if exists trg_audit_logs_no_truncate on public.audit_logs;
create trigger trg_audit_logs_no_truncate before truncate on public.audit_logs
  for each statement execute function public.audit_logs_guard_truncate();

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-31', 'v91', 'Audit trail made append-only', 'Founder master prompt SAH-PROMPT-0009 part 6.5', '0057 audit_logs: target_account, reason, outcome, request_id, actor_role; blocks update, delete, truncate', 'none', 'not deployed by Claude'
where not exists (select 1 from system_changelog where version = 'v91' and change like 'Audit trail made%');
