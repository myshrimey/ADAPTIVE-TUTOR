-- 0059 (v100): results of the founder's manual test checklists (/admin/control/testing). Additive and re-runnable.
-- SERVER-ONLY: RLS on, NO policy. History only grows (each try is a new row; the newest row per item is "the result").
-- Holds no student data: a checklist item id, pass / fail / blocked, a short note, the app version tested and the day.
-- Recording a result NEVER changes a requirement's status or a prompt's acceptance; only the founder accepts, on the prompt page.
create table if not exists public.qa_results (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  result text not null check (result in ('pass', 'fail', 'blocked')),
  note text,
  app_version text,
  tested_by text,
  tested_at timestamptz not null default now()
);
create index if not exists idx_qa_results_item on public.qa_results (item_id, tested_at desc);
alter table public.qa_results enable row level security;

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-11-02', 'v100', 'Test results can be recorded', 'Founder needs to record his checks after deploying v90 onward', '0059 qa_results (checklist item, pass/fail/blocked, short note; server-only)', 'none', 'not deployed by Claude'
where not exists (select 1 from system_changelog where version = 'v100' and change like 'Test results can%');
