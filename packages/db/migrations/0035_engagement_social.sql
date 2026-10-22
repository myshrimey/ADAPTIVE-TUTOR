-- v58: friend challenge, referral loop. Both features are OFF by default (setting engagement.features). Re-runnable.

-- Friend challenge: one friend, one code, the same 5 questions. Needs a "friend" round type.
alter table challenge_attempts drop constraint if exists challenge_attempts_mode_check;
alter table challenge_attempts add constraint challenge_attempts_mode_check
  check (mode in ('practice','challenge','mixed','boss','weakness','mistake_review','comeback','daily','session_quiz','org','friend'));
alter table friend_challenges add column if not exists subject_id uuid references subjects(id) on delete set null;
create index if not exists idx_friend_creator on friend_challenges (created_by_student);
create index if not exists idx_friend_joiner on friend_challenges (joined_by_student);

-- Referral: a student's own invite code, and who used it. No automatic reward: reward_status is set only by an admin.
create table if not exists referral_codes (
  student_id uuid primary key references students(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  code text not null references referral_codes(code) on delete cascade,
  referrer_student uuid not null references students(id) on delete cascade,
  referred_student uuid not null unique references students(id) on delete cascade,
  created_at timestamptz not null default now(),
  reward_status text not null default 'none' check (reward_status in ('none','under_review','approved','declined')),
  reward_note text,
  reviewed_at timestamptz
);
create index if not exists idx_referrals_referrer on referrals (referrer_student);

alter table referral_codes enable row level security;
drop policy if exists referral_codes_own_read on referral_codes;
create policy referral_codes_own_read on referral_codes for select using (student_id in (select s.id from students s join users u on u.id = s.user_id where u.auth_user_id = auth.uid()));
alter table referrals enable row level security; -- server only: a student never reads another student's row

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-22', 'v58', 'Hindi engagement screens, friend challenge, referral loop, A/B result screens', 'Leftover items from v57', 'Migration 0035: friend round type, friend_challenges.subject_id, referral_codes, referrals', 'None', 'Run npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v58');
