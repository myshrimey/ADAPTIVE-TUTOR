-- v79: shareable invitations, admin team, centre membership, role-change log. Additive and re-runnable.
-- Server-only tables (RLS on, no policies): the browser never reads or writes them.
-- Invitations extend the existing sign-up rules; nothing here grants a plan, a payment or access to a student's data.

-- 1. Invitations. The link token is NOT stored: only its sha256 (token_hash, used to look it up) and a random nonce.
--    The founder can re-show the link because the token is HMAC(secret, nonce); the nonce alone is useless without the server secret.
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  nonce text not null,
  role text not null check (role in ('student','parent','teacher','tutor','centre')),
  status text not null default 'pending' check (status in ('pending','opened','accepted','expired','revoked','cancelled')),
  invitee_name text,
  invitee_email text,
  invitee_phone text,
  fields jsonb not null default '{}'::jsonb,       -- role-specific details the inviter filled in (class, subjects, city ...)
  note text,
  department text,
  expires_at timestamptz not null,
  created_by text,                                  -- admin email, or 'centre:<user id>'
  created_at timestamptz not null default now(),
  inviter_user uuid references users(id) on delete set null,
  org_user uuid references users(id) on delete set null,   -- coaching centre that issued it (its own users only)
  source text, campaign text, referral_code text,
  open_count integer not null default 0,
  opened_at timestamptz, started_at timestamptz, accepted_at timestamptz, completed_at timestamptz,
  first_login_at timestamptz, activated_at timestamptz, paid_at timestamptz,
  revoked_at timestamptz, revoked_reason text,
  accepted_user uuid references users(id) on delete set null,
  conflict_user uuid references users(id) on delete set null,   -- an account with this email already exists: flagged, never merged
  conflict_note text
);
create index if not exists idx_invitations_status on invitations (status, created_at desc);
create index if not exists idx_invitations_role on invitations (role);
create index if not exists idx_invitations_email on invitations (lower(invitee_email)) where invitee_email is not null;
create index if not exists idx_invitations_org on invitations (org_user) where org_user is not null;
alter table invitations enable row level security;

-- 2. Every step of an invitation (no tokens, no passwords).
create table if not exists invitation_events (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  at timestamptz not null default now(),
  event text not null,
  actor text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists idx_invitation_events_inv on invitation_events (invitation_id, at);
alter table invitation_events enable row level security;

-- 3. The founder's team (people who may use parts of /admin). The founder's own login stays ADMIN_EMAILS (Super Admin).
create table if not exists admin_team (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  title text,
  department text,
  responsibilities text,
  custom_responsibilities text,
  permissions text[] not null default '{}',
  status text not null default 'active' check (status in ('active','suspended')),
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_admin_team_email on admin_team (lower(email));
alter table admin_team enable row level security;

-- 4. Explicit organisation membership: a centre's teachers / tutors / students. A row gives NO access to any student's data.
create table if not exists org_members (
  id uuid primary key default gen_random_uuid(),
  org_user uuid not null references users(id) on delete cascade,
  member_user uuid not null references users(id) on delete cascade,
  member_role text not null check (member_role in ('student','teacher','tutor')),
  status text not null default 'active' check (status in ('active','removed')),
  added_by text,
  invitation_id uuid references invitations(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_user, member_user)
);
create index if not exists idx_org_members_member on org_members (member_user);
alter table org_members enable row level security;

-- 5. Role changes are requests the founder approves; this table is the history. Nothing converts a role silently.
create table if not exists role_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  previous_role text not null,
  requested_role text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason text,
  requested_by text,
  invitation_id uuid references invitations(id) on delete set null,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_role_changes_user on role_changes (user_id, created_at desc);
alter table role_changes enable row level security;

-- 6. Close a privilege-escalation path: the older "users_update_own" rule let a signed-in person edit their own row, role included.
--    Only server code (service key, no auth.uid()) may change a role or the link to a login. Re-runnable.
create or replace function guard_user_role() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (new.role is distinct from old.role or new.auth_user_id is distinct from old.auth_user_id) then
    raise exception 'role_change_not_allowed' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_user_role on users;
create trigger trg_guard_user_role before update on users for each row execute function guard_user_role();

notify pgrst, 'reload schema';

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-28', 'v79', 'Role-based account creation, admin team, shareable invitations, Help', 'Founder request', '0049 invitations, invitation_events, admin_team, org_members, role_changes; trigger guard_user_role (blocks self role change)', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v79');
