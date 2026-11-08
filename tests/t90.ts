// t90: Development Control Centre (v90): registry data, pure rules, importer, founder-owned columns, access rules, migration safety.
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fakeDb } from './fakedb2';
import { CONTROL_STATUSES, isControlStatus, rollup, resumeReport, filterTasks, filterPrompts, parseControlAction, decisionConflicts, depTaskIds, depOutside, isDone, importRegistry, setNextTask, setPromptPriority, setAcceptance, loadRegistry } from '../packages/core';
import { REGISTRY } from '../packages/core/control-centre/registry-data';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');

(async () => {
  // ---- bundled data is consistent
  const reg = REGISTRY;
  ok(reg.prompts.length === 9, '9 prompts'); ok(new Set(reg.prompts.map((p) => p.id)).size === 9, 'prompt ids unique');
  ok(reg.requirements.length >= 52 && new Set(reg.requirements.map((r) => r.id)).size === reg.requirements.length, 'requirements are unique (at least the original 52)');
  ok(reg.tasks.length >= 37 && new Set(reg.tasks.map((t) => t.id)).size === reg.tasks.length, 'task ids are unique');
  ok([...reg.prompts, ...reg.requirements, ...reg.tasks].every((x) => isControlStatus(x.status)), 'every status is one of the allowed words');
  ok(CONTROL_STATUSES.length === 13, '13 status words (the prompt lists 13)');
  const objCodes = new Set(reg.objectives.map((o) => o.code));
  ok(reg.requirements.every((r) => objCodes.has(r.objective_code)), 'every requirement belongs to an objective');
  const reqCodes = new Set(reg.requirements.map((r) => r.code));
  ok(reg.tasks.every((t) => t.requirements.split(',').every((c) => reqCodes.has(c.trim()))), 'every task names real requirements');
  const taskIds = new Set(reg.tasks.map((t) => t.id));
  ok(reg.tasks.every((t) => depTaskIds(t.depends_on).every((d) => taskIds.has(d))), 'every task dependency names a real task');
  ok(reg.requirements.every((r) => r.founder_acceptance === 'pending'), 'nothing is accepted by the founder in the shipped data');
  ok(reg.tasks.every((t) => !t.founder_next) && reg.prompts.every((p) => !p.founder_priority), 'shipped data holds none of the founder choices');
  const p9 = reg.prompts.find((p) => p.id === 'SAH-PROMPT-0009')!;
  ok(p9.original_kept && (p9.original_text ?? '').length > 20000 && /^MASTER PROMPT: SAHAYAK FOUNDER COMMAND/.test(p9.original_text!), 'original text of 0009 is included whole');
  ok(R('docs/sahayak-control-centre/MASTER_PROMPT_ARCHIVE/SAH-PROMPT-0009.md').includes(p9.original_text!), 'bundled original equals the archive file');
  const REBUILT = ['SAH-PROMPT-0001', 'SAH-PROMPT-0002', 'SAH-PROMPT-0003'];
  ok(reg.prompts.filter((p) => p.id !== 'SAH-PROMPT-0009').every((p) => !p.original_kept), 'older prompts never claim to keep the original text');
  ok(reg.prompts.filter((p) => p.id !== 'SAH-PROMPT-0009').every((p) => p.requirement_level === REBUILT.includes(p.id)), 'only 0001 to 0003 are tracked requirement by requirement (v109); 0004 to 0008 stay headline-only');
  ok(REBUILT.every((id) => { const rs = reg.requirements.filter((r) => r.prompt_id === id); return rs.length >= 20 && rs.every((r) => /^Source:/.test(r.note) && r.status !== 'COMPLETED' && r.status !== 'ACCEPTED BY FOUNDER'); }), 'rebuilt requirement rows cite their source document and are never COMPLETED or accepted without evidence');
  ok(!reg.requirements.some((r) => r.status === 'ACCEPTED BY FOUNDER') && !reg.tasks.some((t) => t.status === 'ACCEPTED BY FOUNDER'), 'nothing marked accepted by founder');
  ok(reg.decisions.filter((d) => d.kind === 'waiting').length === 1 && reg.decisions.some((d) => d.id === 'FD-10') && reg.decisions.some((d) => d.id === 'FD-15'), 'decisions: only D7 waiting, FD-10 to FD-15 recorded');
  // documents and data agree
  const tracker = R('docs/sahayak-control-centre/MASTER_OBJECTIVE_TRACKER.md');
  ok(tracker.split('\n').filter((l) => /^\| R\d\d /.test(l)).length === reg.requirements.filter((r) => r.prompt_id === 'SAH-PROMPT-0009').length, 'tracker document lists every requirement of prompt 0009');
  ok(R('docs/sahayak-control-centre/TASK_BACKLOG.md').split('\n').filter((l) => l.startsWith('| TASK-')).length === reg.tasks.length, 'backlog document lists every task');

  // ---- pure rules
  const r1 = rollup([{ status: 'COMPLETED' }, { status: 'READY FOR TESTING' }, { status: 'NOT STARTED' }, { status: 'BLOCKED' }] as any);
  ok(r1.total === 4 && r1.done === 1 && r1.inProgress === 1 && r1.pending === 1 && r1.blocked === 1 && r1.donePct === 25, 'rollup counts; ready for testing is not done');
  ok(rollup([]).donePct === null, 'empty rollup has no percentage');
  ok(isDone('ACCEPTED BY FOUNDER') && isDone('COMPLETED') && !isDone('READY FOR TESTING') && !isDone('PARTIALLY COMPLETED'), 'what counts as done');
  const rep = resumeReport(reg);
  ok(rep.prompts === 9 && rep.objectives === reg.objectives.length && rep.requirements === reg.requirements.length && rep.decisionsWaiting === reg.decisions.filter((d) => d.kind === 'waiting').length && rep.tasks === reg.tasks.length, 'resume report numbers');
  ok(rep.completed === reg.requirements.filter((r) => r.status === 'COMPLETED').length, 'resume completed matches data');
  ok(rep.founderNextTask === null, 'no next task chosen in shipped data');
  ok(rep.nextUnfinishedTask === 'TASK-021' || /^TASK-\d+$/.test(rep.nextUnfinishedTask ?? ''), 'next unfinished task is a real task');
  const t = reg.tasks;
  ok(filterTasks(t, { status: 'COMPLETED' }).every((x) => x.status === 'COMPLETED') && filterTasks(t, { status: 'COMPLETED' }).length === t.filter((x) => x.status === 'COMPLETED').length, 'task filter by status');
  ok(filterTasks(t, { phase: 'P1' }).every((x) => x.phase === 'P1'), 'task filter by phase');
  ok(filterTasks(t, { q: 'security' }).length >= 1 && filterTasks(t, { q: 'zzzzqqq' }).length === 0, 'task text search');
  ok(filterTasks(t, { sort: 'size' })[0].size === 'S' && filterTasks(t, { sort: 'size' }).slice(-1)[0].size === 'XL', 'sort by size');
  ok(filterTasks(t, {}).map((x) => x.id).join() === t.map((x) => x.id).sort().join() || filterTasks(t, {})[0].id === 'TASK-001', 'default sort by id');
  ok(filterPrompts(reg, { status: 'PARTIALLY COMPLETED' }).every(({ p }) => p.status === 'PARTIALLY COMPLETED'), 'prompt filter by status');
  ok(filterPrompts(reg, { priority: 'unset' }).length === 9, 'all prompts have no founder priority yet');
  ok(filterPrompts(reg, { minPct: 0 }).length === reg.prompts.filter((p) => p.requirement_level).length, 'percentage filter keeps only prompts that have a percentage');
  ok(filterPrompts(reg, { from: '2026-10-31' }).length === 1, 'date filter');
  ok(filterPrompts(reg, { category: 'growth' }).length === 2, 'category filter');
  ok(depTaskIds('TASK-010, Decision D1').join() === 'TASK-010' && depOutside('TASK-010, Decision D1').join() === 'Decision D1' && depOutside('-').length === 0, 'dependency parsing');
  const made = reg.decisions.filter((d) => d.kind === 'made');
  ok(decisionConflicts({ affects: 'Pricing for plans' }, made as any).length >= 1, 'conflict hint: pricing overlaps an active decision');
  ok(decisionConflicts({ affects: 'Quantum widgets' }, made as any).length === 0, 'no hint when nothing overlaps');

  // ---- action validation (the API never trusts the browser)
  ok(parseControlAction({ action: 'next', taskId: 'TASK-012' }).ok, 'next ok');
  ok(!parseControlAction({ action: 'next', taskId: 'x; drop table' }).ok, 'next rejects odd ids');
  ok((parseControlAction({ action: 'next', taskId: null }) as any).value.taskId === null, 'next can be cleared');
  ok(!parseControlAction({ action: 'priority', promptId: 'SAH-PROMPT-0009', priority: 'urgent!!' }).ok, 'priority rejects unknown word');
  ok(!parseControlAction({ action: 'accept', promptId: 'SAH-PROMPT-0009', code: 'R01', value: 'COMPLETED' }).ok, 'acceptance cannot be used to set a status');
  ok(!parseControlAction({ action: 'status', value: 'COMPLETED' }).ok && !parseControlAction({}).ok, 'there is no action that sets a technical status');

  // ---- importer and founder-owned columns
  const db: any = fakeDb({ control_prompts: [], control_objectives: [], control_requirements: [], control_tasks: [], control_decisions: [], control_executions: [], audit_logs: [] }, { defaults: { control_requirements: { founder_acceptance: 'pending' }, control_tasks: { founder_next: false }, control_prompts: { founder_priority: null } } });
  const a = await importRegistry(db, reg, 'founder@x.com');
  ok(a.ok && a.counts!.control_requirements === reg.requirements.length && a.counts!.control_tasks === reg.tasks.length && a.counts!.control_prompts === 9, 'import loads everything');
  const dump = () => JSON.stringify({ r: db.__tables?.control_requirements });
  // founder makes choices
  ok((await setNextTask(db, 'TASK-021', 'founder@x.com')).ok, 'mark next works');
  ok((await setPromptPriority(db, 'SAH-PROMPT-0009', 'now', 'founder@x.com')).ok, 'set priority works');
  ok((await setAcceptance(db, 'SAH-PROMPT-0009', 'R41', 'accepted', 'founder@x.com')).ok, 'accept works');
  // later a new version of the documents arrives with changed statuses and text
  const changed = JSON.parse(JSON.stringify(reg)); changed.requirements.find((r: any) => r.code === 'R41').status = 'ACCEPTED BY FOUNDER'; changed.requirements.find((r: any) => r.code === 'R42').text = 'changed text'; changed.tasks.find((x: any) => x.id === 'TASK-021').status = 'IN PROGRESS'; changed.prompts[8].status = 'COMPLETED';
  ok((await importRegistry(db, changed, 'founder@x.com')).ok, 're-import works');
  const loaded: any = await loadRegistry(db);
  ok(loaded && loaded.tasks.find((x: any) => x.id === 'TASK-021').founder_next === true, 're-import keeps the founder next-task choice');
  ok(loaded.prompts.find((x: any) => x.id === 'SAH-PROMPT-0009').founder_priority === 'now', 're-import keeps the founder priority');
  ok(loaded.requirements.find((x: any) => x.code === 'R41').founder_acceptance === 'accepted', 're-import keeps the founder acceptance');
  ok(loaded.requirements.find((x: any) => x.code === 'R42').text === 'changed text' && loaded.tasks.find((x: any) => x.id === 'TASK-021').status === 'IN PROGRESS', 're-import updates the text and status Claude maintains');
  ok(loaded.requirements.length === reg.requirements.length && loaded.tasks.length === reg.tasks.length, 're-import does not duplicate rows');
  // acceptance never changes the technical status
  const before = (await loadRegistry(db) as any).requirements.find((x: any) => x.code === 'R10').status;
  await setAcceptance(db, 'SAH-PROMPT-0009', 'R10', 'accepted', 'founder@x.com');
  ok((await loadRegistry(db) as any).requirements.find((x: any) => x.code === 'R10').status === before, 'accepting does not change the technical status');
  // only one next task
  await setNextTask(db, 'TASK-022', 'founder@x.com');
  const l2: any = await loadRegistry(db); ok(l2.tasks.filter((x: any) => x.founder_next).length === 1 && l2.tasks.find((x: any) => x.id === 'TASK-022').founder_next, 'only one task can be next');
  ok(!(await setNextTask(db, 'TASK-001', 'founder@x.com')).ok, 'a finished task cannot be marked next');
  ok(!(await setNextTask(db, 'TASK-999', 'founder@x.com')).ok, 'unknown task refused');
  ok((await setNextTask(db, null, 'founder@x.com')).ok && (await loadRegistry(db) as any).tasks.every((x: any) => !x.founder_next), 'next can be cleared');
  ok(!(await setPromptPriority(db, 'NOPE', 'now', null)).ok && !(await setAcceptance(db, 'SAH-PROMPT-0009', 'R99', 'accepted', null)).ok, 'unknown ids refused');
  ok(db.from('audit_logs') && true, 'audit table reachable');
  // the importer payload never carries founder columns
  const src = R('packages/core/control-centre/store.ts');
  const imp = src.slice(src.indexOf('export async function importRegistry'), src.indexOf('export async function setNextTask'));
  ok(!/founder_priority|founder_acceptance|founder_next|founder_rank/.test(imp.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'importer code never names a founder column');
  // empty / missing tables are handled
  const empty: any = fakeDb({ control_prompts: [], control_objectives: [], control_requirements: [], control_tasks: [], control_decisions: [], control_executions: [] });
  ok((await loadRegistry(empty)) === null, 'empty tables load as null (screens fall back to the shipped copy)');
  const broken: any = { from: () => { throw new Error('boom'); } };
  ok((await loadRegistry(broken)) === null, 'a broken database does not crash the screens');
  ok(!(await setNextTask(broken, 'TASK-021', null)).ok, 'a broken database refuses writes quietly');

  // ---- access rules in the files
  const pages = ['page.tsx', 'prompts/[id]/page.tsx', 'objectives/page.tsx', 'tasks/page.tsx', 'decisions/page.tsx'].map((p) => R('apps/web/app/admin/control/' + p));
  ok(pages.every((s) => /adminPageGate\(\)/.test(s) && !/adminPageGate\('/.test(s)), 'every control page is Super Admin only (no permission passed)');
  const api = R('apps/web/app/api/admin/control/route.ts');
  ok(/requireAdmin\(\)/.test(api) && !/requireAdmin\('/.test(api), 'API is Super Admin only');
  ok(!/from\('students'\)|from\('users'\)|from\('learning_|from\('mastery/.test(api + src), 'control centre code never reads student tables');
  ok(/PAGE_PERMISSION/.test(R('packages/core/admin-team/permissions.ts')) && !/admin\/control/.test(R('packages/core/admin-team/permissions.ts')), 'no team permission opens the control pages');

  // ---- migration safety (static)
  const m = R('packages/db/migrations/0056_control_centre.sql');
  const tables = ['control_prompts', 'control_objectives', 'control_requirements', 'control_tasks', 'control_decisions', 'control_executions'];
  ok(tables.every((x) => m.includes(`create table if not exists ${x}`) && m.includes(`alter table ${x} enable row level security`)), '0056: six tables, RLS on');
  ok(!/create policy/i.test(m) && !/drop table|truncate|delete from/i.test(m), '0056: no policies (server-only) and nothing destructive');
  const m55 = R('packages/db/migrations/0055_guard_user_role_search_path.sql');
  ok(/alter function public\.guard_user_role\(\) set search_path/.test(m55) && !/create or replace function/i.test(m55) && !/drop /i.test(m55), '0055: only fixes the search path');
  ok(readdirSync('packages/db/migrations').filter((x) => /^005[56]_/.test(x)).length === 2, 'migrations 0055 and 0056 present');
  ok(existsSync('tests/run-all.ts') && /"test": "tsx tests\/run-all.ts"/.test(R('package.json')), 'npm test is wired');

  console.log(`t90: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
