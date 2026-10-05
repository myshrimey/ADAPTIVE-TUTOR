-- A stable, unguessable token per student so a parent can view read-only
-- progress without needing their own login. Deliberately NOT the student's
-- own auth/user id (that would leak into a URL) — a separate random value,
-- so if a link ever needs to be invalidated later, that's a single
-- `update students set parent_token = gen_random_uuid() where id = ...`
-- with no code change required.
alter table students add column if not exists parent_token uuid not null default gen_random_uuid();
create unique index if not exists idx_students_parent_token on students(parent_token);

-- No RLS policy is added for parent_token lookups: the /parent/[token] page
-- reads through the service-role client intentionally (see
-- apps/web/app/parent/[token]/page.tsx) because the whole point is that the
-- request carries no session at all. RLS still fully applies to every other
-- access path into `students`.
