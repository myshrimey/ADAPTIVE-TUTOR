-- v56: Two-board architecture (settings only, no dates), independent languages, validated translation versions, bilingual handwriting fields, subject requests. Re-runnable.

-- 1. Languages the product knows about. A new Indian language = one row here (no schema change). Only enabled ones are offered.
create table if not exists supported_languages (
  code text primary key,
  label text not null,
  native_label text not null,
  enabled boolean not null default false,
  script text,
  sort integer not null default 100
);
alter table supported_languages enable row level security;
drop policy if exists supported_languages_read on supported_languages;
create policy supported_languages_read on supported_languages for select using (true);
insert into supported_languages (code, label, native_label, enabled, script, sort) values
 ('en','English','English',true,'Latin',1),
 ('hi','Hindi','हिंदी',true,'Devanagari',2)
on conflict (code) do nothing;

-- 2. Four INDEPENDENT language choices per student. NULL = "follow the default" (the app-language cookie).
--    app_language: menus, buttons, notifications. question_language: language of the academic question.
--    learning_language: tutor explanations and feedback. report_language: progress, readiness and parent reports.
alter table learning_profiles add column if not exists app_language text;
alter table learning_profiles add column if not exists question_language text;
alter table learning_profiles add column if not exists learning_language text;
alter table learning_profiles add column if not exists report_language text;
-- The old single choice (onboarding) was stored but never read. Carry it over once, only where nothing is set yet.
update learning_profiles set question_language = preferred_language where question_language is null and preferred_language is not null;
update learning_profiles set learning_language = preferred_language where learning_language is null and preferred_language is not null;
update learning_profiles set report_language = preferred_language where report_language is null and preferred_language is not null;

-- 3. Language columns that were hard-limited to en/hi now point at the table, so adding a language needs no migration.
alter table mock_exams drop constraint if exists mock_exams_language_check;
alter table mock_exams drop constraint if exists mock_exams_language_fk;
alter table mock_exams add constraint mock_exams_language_fk foreign key (language) references supported_languages(code);
alter table question_translations drop constraint if exists question_translations_lang_check;
alter table question_translations drop constraint if exists question_translations_lang_fk;
alter table question_translations add constraint question_translations_lang_fk foreign key (lang) references supported_languages(code);

-- 4. Validated question versions: automatic checks are stored with the translation; only a person can mark it teacher_checked.
alter table question_translations add column if not exists validation jsonb;        -- {passed:boolean, checks:{...}, at:'...'}
alter table question_translations add column if not exists checked_by text;
alter table question_translations add column if not exists checked_at timestamptz;
alter table question_translations add column if not exists reviewer_note text;

-- 5. Handwritten answers in more than one language.
alter table handwritten_evaluations add column if not exists answer_language text;  -- what the AI saw: en / hi / mixed / other / unknown
alter table handwritten_evaluations add column if not exists feedback_language text;

-- 6. Subject requests (what families ask for that is not offered yet). Server writes with ids from the session.
create table if not exists subject_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  board text not null default 'CBSE',
  class_level text,
  subject_text text not null,
  language text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_subject_requests_created on subject_requests(created_at desc);
alter table subject_requests enable row level security;

-- 7. Two-board settings: new keys are merged UNDER whatever the founder already saved (existing values win). Dates stay empty.
insert into commerce_settings (key, value, note) values ('boards', '{}', 'Exam dates. Left empty on purpose until the founder enters them.') on conflict (key) do nothing;
update commerce_settings set value = '{"programme_name":"Class X 2027 Two-Board Preparation Programme","board1_enabled":true,"board2_enabled":true,"board1_subjects":null,"board2_subjects":null}'::jsonb || value where key = 'boards';

-- 8. Change log
insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-21', 'v55b', 'AI Gateway: provider registry, routing, free-quota and budget protection, cost log, benchmark', 'Founder request (AI orchestration spec)', '0032 ai gateway tables', 'none', 'Delta zip + INSTRUCTIONS.txt'
where not exists (select 1 from system_changelog where version = 'v55b');
insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-21', 'v56', 'Two-board (Board 1 / Board 2) readiness and programme, independent app/question/learning/report languages, validated translations, bilingual handwriting, subject requests', 'Founder request (two-board and bilingual spec)', '0033 boards and languages', 'none', 'Delta zip + INSTRUCTIONS.txt'
where not exists (select 1 from system_changelog where version = 'v56');
