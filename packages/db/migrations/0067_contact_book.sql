-- v136: Contact book. A WhatsApp number for the family, and a server-only place for phone/WhatsApp of any account.
alter table student_profile_details add column if not exists parent_whatsapp text;

create table if not exists user_contacts (
  user_id uuid primary key references users(id) on delete cascade,
  phone text,
  whatsapp text,
  note text,
  updated_by text,
  updated_at timestamptz not null default now()
);
-- Row rules on, no policies: only the server key (the Contact book page) can read or write this table.
alter table user_contacts enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-21', 'v136', 'Contact book for the founder (full email, phone, WhatsApp, editable) and a WhatsApp field on the family Profile page', 'The founder needs to see and correct how to reach every account', '0067 contact_book (new column student_profile_details.parent_whatsapp; new server-only table user_contacts)', 'none', 'Deploy the v136 website, then run 0067. The Contact book opens at /admin/contacts (Super Admin only).'
where not exists (select 1 from system_changelog where version = 'v136' and change like 'Contact book for the founder%');
