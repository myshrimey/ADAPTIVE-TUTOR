-- v45: self sign-up with username. Username is stored lower-case and unique; email is optional.
alter table users add column if not exists username text;
alter table users add column if not exists contact_email text;      -- real email the family chose to give (may be empty)
alter table users add column if not exists consent_at timestamptz;   -- parent/guardian agreement at sign-up
alter table users add column if not exists consent_version text;
create unique index if not exists idx_users_username_unique on users (lower(username)) where username is not null;

-- Sign-up attempts for abuse limits. Server-only (no policy). Holds a one-way hash of the internet address, nothing else.
create table if not exists signup_log (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_signup_log_time on signup_log (created_at);
alter table signup_log enable row level security;
