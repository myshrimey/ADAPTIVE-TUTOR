-- v90: Development Control Centre records (prompts, objectives, requirements, tasks, decisions, executions). Additive and re-runnable.
-- SERVER-ONLY: RLS is on and there are NO policies, so only the server (service key) can read or write. Nothing here holds student data.
-- Columns that belong to the FOUNDER (founder_priority, founder_acceptance, founder_next, founder_rank) are never overwritten by the importer.
create table if not exists control_prompts (
  id text primary key,
  title text not null,
  received_on date,
  original_kept boolean not null default false,
  original_text text,
  objective text not null default '',
  status text not null default 'REGISTERED',
  category text not null default '',
  related_to text,
  requirement_level boolean not null default false,
  note text not null default '',
  founder_priority text,
  updated_at timestamptz not null default now(),
  constraint control_prompts_status_chk check (status in ('RECEIVED','REGISTERED','ANALYSED','NOT STARTED','IN PROGRESS','PARTIALLY COMPLETED','BLOCKED','READY FOR TESTING','TESTING','COMPLETED','ACCEPTED BY FOUNDER','DEFERRED','CANCELLED')),
  constraint control_prompts_priority_chk check (founder_priority is null or founder_priority in ('now','next','later','hold'))
);

create table if not exists control_objectives (
  id text primary key,
  prompt_id text not null references control_prompts(id) on delete cascade,
  code text not null,
  title text not null,
  updated_at timestamptz not null default now(),
  unique (prompt_id, code)
);

create table if not exists control_requirements (
  id text primary key,
  prompt_id text not null references control_prompts(id) on delete cascade,
  objective_code text not null,
  code text not null,
  text text not null,
  status text not null default 'NOT STARTED',
  note text not null default '',
  founder_acceptance text not null default 'pending',
  updated_at timestamptz not null default now(),
  unique (prompt_id, code),
  constraint control_requirements_status_chk check (status in ('RECEIVED','REGISTERED','ANALYSED','NOT STARTED','IN PROGRESS','PARTIALLY COMPLETED','BLOCKED','READY FOR TESTING','TESTING','COMPLETED','ACCEPTED BY FOUNDER','DEFERRED','CANCELLED')),
  constraint control_requirements_accept_chk check (founder_acceptance in ('pending','accepted','rejected'))
);
create index if not exists idx_control_requirements_prompt on control_requirements (prompt_id, status);

create table if not exists control_tasks (
  id text primary key,
  prompt_id text not null references control_prompts(id) on delete cascade,
  phase text not null default '',
  title text not null,
  objective_code text not null default '',
  requirements text not null default '',
  depends_on text not null default '',
  size text not null default '',
  status text not null default 'NOT STARTED',
  verification text not null default '',
  note text not null default '',
  founder_next boolean not null default false,
  founder_rank integer,
  updated_at timestamptz not null default now(),
  constraint control_tasks_status_chk check (status in ('RECEIVED','REGISTERED','ANALYSED','NOT STARTED','IN PROGRESS','PARTIALLY COMPLETED','BLOCKED','READY FOR TESTING','TESTING','COMPLETED','ACCEPTED BY FOUNDER','DEFERRED','CANCELLED'))
);
create index if not exists idx_control_tasks_status on control_tasks (status, phase);
-- Only one task can be the founder's chosen next task.
create unique index if not exists uq_control_tasks_one_next on control_tasks (founder_next) where founder_next;

create table if not exists control_decisions (
  id text primary key,
  kind text not null default 'made',
  decided_on date,
  decision text not null,
  source text not null default '',
  affects text not null default '',
  status text not null default 'Active',
  recommendation text,
  updated_at timestamptz not null default now(),
  constraint control_decisions_kind_chk check (kind in ('made','waiting'))
);

create table if not exists control_executions (
  id text primary key,
  executed_on date not null,
  prompt_id text,
  summary text not null,
  files text not null default '',
  db_changes text not null default '',
  tests text not null default '',
  open_problems text not null default '',
  updated_at timestamptz not null default now()
);

alter table control_prompts enable row level security;
alter table control_objectives enable row level security;
alter table control_requirements enable row level security;
alter table control_tasks enable row level security;
alter table control_decisions enable row level security;
alter table control_executions enable row level security;
-- No policies on purpose (server-only).

notify pgrst, 'reload schema';

insert into system_changelog (changed_on, version, change, reason, database_changes, pricing_changes, deployment)
select '2026-10-31', 'v90', 'Development Control Centre tables and screens', 'Founder master prompt SAH-PROMPT-0009 Phase 1', '0056 control_prompts, control_objectives, control_requirements, control_tasks, control_decisions, control_executions (server-only)', 'none', 'not deployed by Claude'
where not exists (select 1 from system_changelog where version = 'v90' and change like 'Development Control Centre%');
