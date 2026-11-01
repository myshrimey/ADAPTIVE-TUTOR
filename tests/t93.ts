// t93: Control Centre screens 2 (v93): current execution, dependency register, resume text, QA checklists.
import { readFileSync, existsSync } from 'fs';
import { currentExecution, dependencyReport, resumeText, QA_CHECKLISTS, QA_KINDS, qaText, resumeReport, isDone, depTaskIds, type ControlRegistry, type ControlTask } from '../packages/core';
import { REGISTRY } from '../packages/core/control-centre/registry-data';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const T = (id: string, status: any, dep = '-', extra: Partial<ControlTask> = {}): ControlTask => ({ id, prompt_id: 'SAH-PROMPT-0009', phase: 'P1', title: 'Task ' + id, objective_code: 'O1', requirements: 'R01', depends_on: dep, size: 'S', status, verification: '', note: '', founder_next: false, founder_rank: null, ...extra } as any);
const reg = (tasks: ControlTask[], more: Partial<ControlRegistry> = {}): ControlRegistry => ({ prompts: [{ id: 'SAH-PROMPT-0009', title: 'P9', requirement_level: true, founder_priority: null } as any], objectives: [], requirements: [], tasks, decisions: [], executions: [], ...more });

// ---- shipped data
const c = currentExecution(REGISTRY);
ok(c.activePrompt?.id === 'SAH-PROMPT-0009', 'active prompt is the one with open tasks');
ok(c.waitingForFounderCheck.length === REGISTRY.tasks.filter((t) => t.status === 'READY FOR TESTING').length && c.waitingForFounderCheck.length >= 8, 'waiting-for-check list matches the tasks');
ok(c.decisionsWaiting.length === REGISTRY.decisions.filter((d) => d.kind === 'waiting').length && c.decisionsWaiting.length >= 1, 'waiting decisions listed');
ok(!!c.recommendedNext && !isDone(c.recommendedNext.status) && c.recommendedNext.status !== 'BLOCKED', 'a recommendation exists and is open');
const doneIds = new Set(REGISTRY.tasks.filter((t) => isDone(t.status)).map((t) => t.id));
ok(depTaskIds(c.recommendedNext!.depends_on).every((d) => doneIds.has(d)), 'recommendation has all earlier tasks done');
ok(/^-?$/.test(c.recommendedNext!.depends_on.replace(/TASK-\d+|,|\s/g, '')), 'recommendation needs nothing from the founder');
const newest = [...REGISTRY.executions].sort((a, b) => parseInt(b.id.replace(/\D/g, '')) - parseInt(a.id.replace(/\D/g, '')))[0];
ok(c.lastExecution?.id === newest.id && /^EX-\d{4}$/.test(newest.id), 'last delivery is the newest execution');
const d = dependencyReport(REGISTRY.tasks);
ok(d.rows.length === REGISTRY.tasks.length, 'every task has a row');
ok(d.problems.length === 0, 'shipped dependency list has no broken links or loops: ' + d.problems.join('; '));
ok(d.readyCount >= 1, 'some task is ready');
ok(d.rows.filter((r) => r.state === 'done').length === REGISTRY.tasks.filter((t) => isDone(t.status)).length, 'done rows match');
ok(d.rows.every((r) => r.state !== 'ready' || (r.unfinished.length === 0 && r.outside.length === 0)), 'a ready row never has unfinished needs');
const rt = resumeText(REGISTRY, '2026-11-01');
ok(rt.includes('SAHAYAK SESSION RESUME (2026-11-01)') && rt.includes('SAH-PROMPT-0009') && rt.includes('Waiting for the founder to check') && !/undefined|NaN|\[object/.test(rt), 'resume text is complete and clean');
ok(rt.includes(`Tasks: ${resumeReport(REGISTRY).tasksDone} of ${resumeReport(REGISTRY).tasks} done`), 'resume numbers match the report');
ok(/COMPLETED needs evidence/.test(rt), 'resume repeats the rules');

// ---- edge cases
const e1 = currentExecution(reg([]));
ok(e1.recommendedNext === null && e1.inFlight.length === 0 && e1.activePrompt === null && e1.lastExecution === null, 'empty registry does not crash');
const e2 = currentExecution(reg([T('TASK-001', 'COMPLETED'), T('TASK-002', 'NOT STARTED', 'TASK-001'), T('TASK-003', 'NOT STARTED', 'TASK-002'), T('TASK-004', 'NOT STARTED', 'Decision D1')]));
ok(e2.recommendedNext?.id === 'TASK-002', 'recommends the lowest ready task');
ok(e2.blockedByFounder.length === 1 && e2.blockedByFounder[0].task.id === 'TASK-004' && e2.blockedByFounder[0].waitingOn[0] === 'Decision D1', 'a task held only by a decision is listed as waiting for the founder');
const e3 = currentExecution(reg([T('TASK-001', 'IN PROGRESS'), T('TASK-002', 'NOT STARTED')], { prompts: [{ id: 'A', title: 'a', requirement_level: true, founder_priority: null } as any, { id: 'SAH-PROMPT-0009', title: 'P9', requirement_level: true, founder_priority: 'now' } as any] }));
ok(e3.activePrompt?.id === 'SAH-PROMPT-0009' && /now/.test(e3.activePrompt!.why) && e3.inFlight.length === 1, 'a "now" priority chooses the active prompt');
ok(currentExecution(reg([T('TASK-001', 'NOT STARTED', 'TASK-009')])).recommendedNext === null, 'a task that needs an unknown task is never recommended');
const e4 = currentExecution(reg([T('TASK-001', 'READY FOR TESTING'), T('TASK-002', 'NOT STARTED')]));
ok(e4.recommendedNext?.id === 'TASK-002', 'a task waiting for the founder\'s check is not recommended again');
const e5 = currentExecution(reg([T('TASK-001', 'NOT STARTED', '-', { founder_next: true })]));
ok(e5.founderNext?.id === 'TASK-001', 'founder next is shown');
const bad = dependencyReport([T('TASK-001', 'NOT STARTED', 'TASK-001'), T('TASK-002', 'NOT STARTED', 'TASK-003'), T('TASK-003', 'NOT STARTED', 'TASK-002'), T('TASK-004', 'NOT STARTED', 'TASK-099'), T('TASK-005', 'BLOCKED'), T('TASK-006', 'NOT STARTED', 'TASK-005')]);
ok(bad.problems.some((p) => /TASK-001 depends on itself/.test(p)), 'self-dependency found');
ok(bad.problems.some((p) => /loop: .*TASK-002.*TASK-003/.test(p)), 'loop found');
ok(bad.problems.some((p) => /TASK-099/.test(p)), 'unknown task found');
ok(bad.rows.find((r) => r.id === 'TASK-005')?.state === 'blocked' && bad.rows.find((r) => r.id === 'TASK-006')?.state === 'waiting_on_tasks', 'blocked and waiting states');
ok(bad.rows.find((r) => r.id === 'TASK-005')?.unlocks.join() === 'TASK-006', 'unlocks list');

// ---- QA checklists describe features that exist
const pageFor = (route: string) => `apps/web/app${route}/page.tsx`;
let items = 0; const ids = new Set<string>();
for (const k of QA_KINDS) {
  const list = QA_CHECKLISTS[k]; ok(list.length >= 4, `${k}: at least 4 checks`);
  for (const i of list) { items++; ids.add(i.id); ok(existsSync(pageFor(i.route)), `${k} ${i.id}: page exists ${i.route}`); ok(i.check.length > 20 && !/\b(passed|verified|works)\b/i.test(i.id), `${i.id}: has a real instruction`); ok(i.id.startsWith('QA-'), `${i.id} id format`); }
  ok(qaText(k).includes(list[0].id) && qaText(k).includes('[ ]'), `${k}: text export`);
}
ok(ids.size === items, 'QA ids are unique');
ok(QA_KINDS.length === 6, 'six account types covered');
ok(!/passed|✔|✓/.test(JSON.stringify(QA_CHECKLISTS)), 'checklists never claim a result');

// ---- static rules for the new screens
const pages = ['current', 'dependencies', 'testing', 'history'].map((p) => `apps/web/app/admin/control/${p}/page.tsx`);
for (const p of pages) { const s = R(p); ok(/adminPageGate\(\)/.test(s), `Super Admin only: ${p}`); ok(!/^['"]use client['"]/.test(s.trim()) && !/fetch\(|method=["']post/i.test(s), `no write path: ${p}`); ok(R('apps/web/lib/admin-menu.ts').includes(p.replace('apps/web/app', '').replace('/page.tsx', '')), `in the menu: ${p}`); ok(R('apps/web/components/ControlNav.tsx').includes(p.replace('apps/web/app', '').replace('/page.tsx', '')), `in the control nav: ${p}`); }
const rr = R('apps/web/app/api/admin/control/resume/route.ts');
ok(/requireAdmin\(\)/.test(rr) && /export async function GET/.test(rr) && !/POST|PATCH|DELETE/.test(rr), 'resume route is a gated GET only');
ok(!/control/.test(R('packages/core/admin-team/permissions.ts')), 'no team permission opens the control centre');
const lg = R('packages/core/control-centre/logic.ts').slice(R('packages/core/control-centre/logic.ts').indexOf('v93:'));
ok(!/\.(insert|update|delete|upsert)\(|from\(['"]/.test(lg), 'new rules never touch the database');

console.log(`t93: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
