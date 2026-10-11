-- A shared library of previous-year CBSE question papers (and, optionally, a
-- separate solutions file alongside each one) that any signed-in student can
-- contribute to and everyone can browse — not per-student private storage.
-- The files themselves live in Supabase Storage (bucket 'papers'); this
-- table just holds the metadata row pointing at them.
--
-- Deliberately NOT auto-populated with real past papers here: those are
-- copyrighted CBSE documents, and nothing in this migration (or the app)
-- fabricates their content. This table starts empty — students upload what
-- they already have, which is also more likely to be accurate than anything
-- generated from memory.

create table if not exists previous_papers (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id),
  uploaded_by uuid references students(id) on delete set null,
  title text not null,
  year smallint,
  file_path text not null,          -- object path inside the 'papers' storage bucket
  solution_file_path text,          -- optional second file, same bucket — the worked solutions
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_previous_papers_subject on previous_papers(subject_id);
create index if not exists idx_previous_papers_created_at on previous_papers(created_at desc);

alter table previous_papers enable row level security;

-- Readable by anyone (even signed out) — it's reference material, same
-- spirit as the footer's CBSE info, not a student's private data.
drop policy if exists previous_papers_select_anyone on previous_papers;
create policy previous_papers_select_anyone on previous_papers
  for select
  to anon, authenticated
  using (true);

-- Any signed-in student can add a paper to the shared library.
drop policy if exists previous_papers_insert_authenticated on previous_papers;
create policy previous_papers_insert_authenticated on previous_papers
  for insert
  to authenticated
  with check (true);

-- Only the student who uploaded a paper can remove it (e.g. wrong file,
-- duplicate, mis-tagged subject).
drop policy if exists previous_papers_delete_owner on previous_papers;
create policy previous_papers_delete_owner on previous_papers
  for delete
  to authenticated
  using (
    uploaded_by in (
      select s.id from students s
      join users u on u.id = s.user_id
      where u.auth_user_id = auth.uid()
    )
  );

-- ---- Storage bucket for the actual PDF files ----
-- Public read (these are shared reference documents, same as the DB rows
-- above), insert restricted to signed-in users, delete restricted to
-- whoever uploaded the specific file (Supabase Storage sets `owner` to
-- auth.uid() automatically on upload via an authenticated client).

insert into storage.buckets (id, name, public)
values ('papers', 'papers', true)
on conflict (id) do nothing;

drop policy if exists papers_bucket_read on storage.objects;
create policy papers_bucket_read on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'papers');

drop policy if exists papers_bucket_insert on storage.objects;
create policy papers_bucket_insert on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'papers');

drop policy if exists papers_bucket_delete on storage.objects;
create policy papers_bucket_delete on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'papers' and owner = auth.uid());
