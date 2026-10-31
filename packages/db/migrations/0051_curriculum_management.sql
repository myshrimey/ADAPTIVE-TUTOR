-- v81: syllabus upload, structured curriculum, review/approve/publish with versions and rollback. Additive and re-runnable.
-- Server-only tables (RLS on, no policies). Uploaded files go to a PRIVATE bucket; nothing here is public.
-- Extends the v61 `curriculum_versions` register; nothing is deleted and no published version is overwritten.

-- 1. More states for a version (the v61 five stay valid).
alter table curriculum_versions drop constraint if exists curriculum_versions_status_check;
alter table curriculum_versions add constraint curriculum_versions_status_check
  check (status in ('draft','uploaded','processing','needs_review','approved','published','superseded','failed','retired'));
alter table curriculum_versions add column if not exists published_at timestamptz;
alter table curriculum_versions add column if not exists published_by text;
alter table curriculum_versions add column if not exists status_note text;

-- 2. The uploaded source document (kept as the record of where the outline came from).
create table if not exists curriculum_documents (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references curriculum_versions(id) on delete cascade,
  file_name text not null,
  mime text,
  size_bytes integer,
  sha256 text,
  storage_path text,
  doc_type text not null default 'syllabus' check (doc_type in ('syllabus','curriculum_framework','exam_blueprint','textbook_index','other')),
  source_url text,
  source_note text,
  source_date date,
  uploaded_by text,
  uploaded_at timestamptz not null default now(),
  process_method text,
  process_note text,
  error text
);
create index if not exists idx_curr_docs_version on curriculum_documents (version_id);
alter table curriculum_documents enable row level security;

-- 3. The structured outline: unit > chapter > topic > learning outcome (+ assessment objectives), with the source page.
create table if not exists curriculum_nodes (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references curriculum_versions(id) on delete cascade,
  parent_id uuid references curriculum_nodes(id) on delete cascade,
  kind text not null check (kind in ('unit','chapter','topic','learning_outcome','assessment_objective')),
  name text not null,
  sequence integer not null default 0,
  source_page integer,
  confidence numeric(3,2),
  flagged boolean not null default false,
  flag_note text,
  stable_key text not null,                     -- same wording in a later version = same key, so versions can be compared
  linked_table text check (linked_table in ('chapters','topics','skills')),
  linked_id uuid,                               -- optional link to the existing learning content (chapter/topic/skill)
  created_at timestamptz not null default now()
);
create unique index if not exists uq_curr_nodes_key on curriculum_nodes (version_id, stable_key);
create index if not exists idx_curr_nodes_version on curriculum_nodes (version_id, kind, sequence);
create index if not exists idx_curr_nodes_parent on curriculum_nodes (parent_id);
alter table curriculum_nodes enable row level security;

-- 4. Audit trail: uploads, edits, approvals, publication, rollback. No file contents, no secrets.
create table if not exists curriculum_events (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references curriculum_versions(id) on delete cascade,
  at timestamptz not null default now(),
  event text not null,
  actor text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists idx_curr_events_version on curriculum_events (version_id, at);
alter table curriculum_events enable row level security;

-- 5. Private bucket for the source files (skipped where Supabase Storage does not exist, e.g. a scratch database).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('curriculum-docs', 'curriculum-docs', false) on conflict (id) do nothing;
  end if;
end $$;

notify pgrst, 'reload schema';

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-30', 'v81', 'Curriculum management: syllabus upload, review, publish, versions; branded exports', 'Founder request', '0051 curriculum_documents, curriculum_nodes, curriculum_events; curriculum_versions extra states; private bucket curriculum-docs', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v81');
