-- v82: remember which published curriculum version each adaptive check and each baseline used. Additive, re-runnable, nullable.
-- Old rows stay empty (we never guess). Deleting a curriculum version never deletes a result: the link just becomes empty.
do $$ begin
  if to_regclass('public.baseline_sessions') is not null then
    alter table baseline_sessions add column if not exists curriculum_version_id uuid references curriculum_versions(id) on delete set null;
    create index if not exists idx_baseline_sessions_cv on baseline_sessions (curriculum_version_id) where curriculum_version_id is not null;
  end if;
  if to_regclass('public.student_baselines') is not null then
    alter table student_baselines add column if not exists curriculum_version_id uuid references curriculum_versions(id) on delete set null;
    create index if not exists idx_student_baselines_cv on student_baselines (curriculum_version_id) where curriculum_version_id is not null;
  end if;
end $$;
notify pgrst, 'reload schema';
insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-30', 'v82', 'Adaptive checks and baselines remember the curriculum version used', 'Founder master prompt (curriculum management)', '0052 baseline_sessions.curriculum_version_id, student_baselines.curriculum_version_id', 'none', 'npm run db:migrate'
where not exists (select 1 from system_changelog where version = 'v82');
