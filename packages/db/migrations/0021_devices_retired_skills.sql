-- v43: (1) which devices each family login has used, for the 2-device limit;
--      (2) skills.retired: lessons CBSE removed from the 2026-27 exam stay in the database
--          (students' history is kept) but are no longer taught, assessed or counted.
-- Re-runnable.

create table if not exists account_devices (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  device_id text not null,
  label text,
  user_agent text,
  ip text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (auth_user_id, device_id)
);
create index if not exists idx_account_devices_user on account_devices(auth_user_id);
-- Server-only table (service role). No policy on purpose: no student or parent can read or change it.
alter table account_devices enable row level security;

alter table skills add column if not exists retired boolean not null default false;

-- Lessons CBSE removed from the 2026-27 Class 10 Hindi A exam (syllabus note "प्रश्न नहीं पूछे जाएँगे"):
-- Kshitij Part 2: Dev (Savaiya, Kavitt), Chhaya Mat Chhoona, Kanyadan, Stri-Shiksha ke Virodhi Kutarkon ka Khandan,
-- Manviya Karuna ki Divya Chamak; Kritika Part 2: Ehi Thaiya Jhulni Herani Ho Rama, George Pancham ki Naak.
-- Skills stay (history is kept) but are retired; their questions are marked rejected so they are never served.
update skills set retired = true
 where slug in ('explain-stri-shiksha-argument','explain-kanyadaan-message','explain-george-pancham-satire');
update diagnostic_questions set content_status = 'rejected'
 where skill_id in (select id from skills where retired) and content_status <> 'rejected';
update questions set content_status = 'rejected'
 where skill_id in (select id from skills where retired) and content_status <> 'rejected';
