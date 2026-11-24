-- v143: marks a student account as a TEST account (first half of TASK-037). Server-only; the mark is set by the Super Admin with a written reason.
-- A mark changes nothing about what the account can do; it only labels it and keeps it out of the activity numbers.
create table if not exists test_accounts (
  user_id uuid primary key references users(id) on delete cascade,
  marked_by text not null,
  marked_at timestamptz not null default now(),
  reason text not null
);
-- Row rules on, no policies: only the server key can read or write.
alter table test_accounts enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-23', 'v143', 'Student accounts can be marked as test accounts (with a reason); test accounts are left out of the activity numbers', 'Test and demo logins were mixed into the real activity counts (first half of TASK-037)', '0069 test_accounts (new server-only table; deleting an account deletes its mark)', 'none', 'Deploy the v143 website, then run 0069. Mark a test account on /admin/accounts, open the account.'
where not exists (select 1 from system_changelog where version = 'v143' and change like 'Student accounts can be marked%');
