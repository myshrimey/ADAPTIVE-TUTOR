-- 0061 (v106): screenshots and pictures attached to feedback. Re-runnable.
-- The picture files live in a PRIVATE storage bucket "feedback-screenshots" (nobody can open them by address).
-- This table holds only where each file is, its size, and a one-way hash of the sender's address for an upload limit.
-- Server-only: row level security is on and there is deliberately NO policy. Only admins with the "support" permission see a picture, through the server.
-- Deleting a feedback row deletes these rows (cascade); the app removes the files first.

create table if not exists public.feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  storage_path text not null,
  mime text not null default 'image/jpeg' check (mime = 'image/jpeg'),
  bytes integer not null check (bytes > 0 and bytes <= 3000000),
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists idx_feedback_attachments_feedback on public.feedback_attachments (feedback_id);
create index if not exists idx_feedback_attachments_ip on public.feedback_attachments (ip_hash, created_at);
alter table public.feedback_attachments enable row level security;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('feedback-screenshots', 'feedback-screenshots', false) on conflict (id) do nothing;
  end if;
end $$;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-05', 'v106', 'Pictures and screenshots can be attached to feedback', 'Founder request: users should be able to share screenshots with feedback', '0061 feedback_attachments (file location, size, address hash; server-only) + private bucket feedback-screenshots', 'none', 'not deployed by Claude'
where not exists (select 1 from system_changelog where version = 'v106' and change like 'Pictures and screenshots%');
