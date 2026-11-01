// v90: pure rules for the Development Control Centre. No database. Everything the screens show is calculated here so it can be tested.
import { CONTROL_ACCEPTANCE, CONTROL_PRIORITIES, isControlStatus, type ControlAcceptance, type ControlPriority, type ControlRegistry, type ControlRequirement, type ControlStatus, type ControlTask } from './types';

/** "Done" for counting means technically COMPLETED or accepted by the founder. READY FOR TESTING is NOT done (completion needs verification evidence). */
export const isDone = (s: ControlStatus): boolean => s === 'COMPLETED' || s === 'ACCEPTED BY FOUNDER';
export const isPending = (s: ControlStatus): boolean => ['RECEIVED', 'REGISTERED', 'ANALYSED', 'NOT STARTED', 'DEFERRED'].includes(s);
export const isInProgress = (s: ControlStatus): boolean => ['IN PROGRESS', 'PARTIALLY COMPLETED', 'READY FOR TESTING', 'TESTING'].includes(s);

export function countByStatus(items: { status: ControlStatus }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) out[i.status] = (out[i.status] ?? 0) + 1;
  return out;
}

export interface Rollup { total: number; done: number; inProgress: number; pending: number; blocked: number; donePct: number | null; byStatus: Record<string, number> }
/** Requirement counts for a group. donePct is null when there is nothing to count (never 0% or 100% by default). */
export function rollup(reqs: { status: ControlStatus }[]): Rollup {
  const total = reqs.length;
  const done = reqs.filter((r) => isDone(r.status)).length;
  const inProgress = reqs.filter((r) => isInProgress(r.status)).length;
  const blocked = reqs.filter((r) => r.status === 'BLOCKED').length;
  const pending = reqs.filter((r) => isPending(r.status)).length;
  return { total, done, inProgress, pending, blocked, donePct: total ? Math.round((100 * done) / total) : null, byStatus: countByStatus(reqs) };
}

export interface ResumeReport {
  prompts: number; promptsTrackedByRequirement: number; objectives: number; requirements: number;
  completed: number; inProgress: number; pending: number; blocked: number; acceptedByFounder: number;
  tasks: number; tasksDone: number; founderNextTask: string | null; lastCompletedTask: string | null; nextUnfinishedTask: string | null; decisionsWaiting: number;
}
const numeric = (id: string) => parseInt(id.replace(/\D+/g, ''), 10) || 0;
export function resumeReport(reg: ControlRegistry): ResumeReport {
  const r = rollup(reg.requirements);
  const tasks = [...reg.tasks].sort((a, b) => numeric(a.id) - numeric(b.id));
  const done = tasks.filter((t) => isDone(t.status));
  const next = tasks.find((t) => t.founder_next) ?? null;
  // The next unfinished task is the lowest-numbered task that is not done, not blocked and whose dependencies that name other tasks are all done.
  const doneIds = new Set(done.map((t) => t.id));
  const open = tasks.find((t) => !isDone(t.status) && t.status !== 'BLOCKED' && t.status !== 'CANCELLED' && depTaskIds(t.depends_on).every((d) => doneIds.has(d)));
  return {
    prompts: reg.prompts.length, promptsTrackedByRequirement: reg.prompts.filter((p) => p.requirement_level).length, objectives: reg.objectives.length, requirements: r.total,
    completed: r.done - reg.requirements.filter((x) => x.status === 'ACCEPTED BY FOUNDER').length, inProgress: r.inProgress, pending: r.pending, blocked: r.blocked,
    acceptedByFounder: reg.requirements.filter((x) => x.status === 'ACCEPTED BY FOUNDER' || x.founder_acceptance === 'accepted').length,
    tasks: tasks.length, tasksDone: done.length, founderNextTask: next?.id ?? null, lastCompletedTask: done.length ? done[done.length - 1].id : null, nextUnfinishedTask: open?.id ?? null,
    decisionsWaiting: reg.decisions.filter((d) => d.kind === 'waiting').length,
  };
}
/** "TASK-010, TASK-011" -> ["TASK-010","TASK-011"]. Anything that is not a task id (for example "Decision D1" or "-") is ignored here. */
export function depTaskIds(dep: string): string[] { return (String(dep ?? '').match(/TASK-\d+/g) ?? []); }
/** Tasks that name a decision or outside item as a dependency (shown to the founder as "waiting on you"). */
export function depOutside(dep: string): string[] { return String(dep ?? '').split(',').map((s) => s.trim()).filter((s) => s && s !== '-' && !/^TASK-\d+$/.test(s)); }

export interface TaskFilter { status?: string; phase?: string; prompt?: string; q?: string; onlyNext?: boolean; sort?: 'id' | 'status' | 'phase' | 'size' }
const SIZE_RANK: Record<string, number> = { S: 1, M: 2, L: 3, XL: 4 };
export function filterTasks(tasks: ControlTask[], f: TaskFilter): ControlTask[] {
  const q = (f.q ?? '').trim().toLowerCase();
  let out = tasks.filter((t) =>
    (!f.status || t.status === f.status) && (!f.phase || t.phase === f.phase) && (!f.prompt || t.prompt_id === f.prompt) && (!f.onlyNext || t.founder_next) &&
    (!q || `${t.id} ${t.title} ${t.note} ${t.depends_on}`.toLowerCase().includes(q)));
  const key: Record<string, (t: ControlTask) => string | number> = { id: (t) => numeric(t.id), status: (t) => t.status, phase: (t) => t.phase, size: (t) => SIZE_RANK[t.size] ?? 9 };
  const k = key[f.sort ?? 'id'] ?? key.id;
  out = [...out].sort((a, b) => { const x = k(a), y = k(b); return x < y ? -1 : x > y ? 1 : numeric(a.id) - numeric(b.id); });
  return out;
}

export interface PromptFilter { status?: string; priority?: string; category?: string; q?: string; minPct?: number; maxPct?: number; from?: string; to?: string }
export function filterPrompts(reg: ControlRegistry, f: PromptFilter) {
  const q = (f.q ?? '').trim().toLowerCase();
  return reg.prompts.map((p) => ({ p, roll: p.requirement_level ? rollup(reg.requirements.filter((r) => r.prompt_id === p.id)) : null })).filter(({ p, roll }) =>
    (!f.status || p.status === f.status) && (!f.priority || (f.priority === 'unset' ? !p.founder_priority : p.founder_priority === f.priority)) && (!f.category || p.category === f.category) &&
    (!q || `${p.id} ${p.title} ${p.objective}`.toLowerCase().includes(q)) &&
    (f.minPct === undefined || (roll?.donePct ?? -1) >= f.minPct) && (f.maxPct === undefined || (roll?.donePct ?? 101) <= f.maxPct) &&
    (!f.from || (p.received_on ?? '') >= f.from) && (!f.to || (p.received_on ?? '9999') <= f.to));
}

/** Validates an action sent by the screens. Returns a clean action or an error word. Never trusts a status, priority or acceptance it does not recognise. */
export type ControlAction =
  | { action: 'import' }
  | { action: 'next'; taskId: string | null }
  | { action: 'priority'; promptId: string; priority: ControlPriority | null }
  | { action: 'accept'; promptId: string; code: string; value: ControlAcceptance };
export function parseControlAction(body: any): { ok: true; value: ControlAction } | { ok: false; error: string } {
  const a = body?.action; const idOk = (s: any) => typeof s === 'string' && /^[A-Za-z0-9._\-]{1,60}$/.test(s);
  if (a === 'import') return { ok: true, value: { action: 'import' } };
  if (a === 'next') { if (body.taskId === null || body.taskId === '') return { ok: true, value: { action: 'next', taskId: null } }; return idOk(body.taskId) ? { ok: true, value: { action: 'next', taskId: body.taskId } } : { ok: false, error: 'bad_task' }; }
  if (a === 'priority') { const p = body.priority === null || body.priority === '' ? null : body.priority; if (!idOk(body.promptId)) return { ok: false, error: 'bad_prompt' }; if (p !== null && !(CONTROL_PRIORITIES as readonly string[]).includes(p)) return { ok: false, error: 'bad_priority' }; return { ok: true, value: { action: 'priority', promptId: body.promptId, priority: p } }; }
  if (a === 'accept') { if (!idOk(body.promptId) || !idOk(body.code)) return { ok: false, error: 'bad_requirement' }; if (!(CONTROL_ACCEPTANCE as readonly string[]).includes(body.value)) return { ok: false, error: 'bad_value' }; return { ok: true, value: { action: 'accept', promptId: body.promptId, code: body.code, value: body.value } }; }
  return { ok: false, error: 'unknown_action' };
}

/** Rows read from the database may hold anything; keep only rows whose status is one we know (a bad row is skipped, never shown as if valid). */
export function cleanRequirements(rows: any[]): ControlRequirement[] { return (rows ?? []).filter((r) => isControlStatus(r?.status)) as ControlRequirement[]; }

/** A decision that is still waiting is "in conflict" with a made decision only when both name the same area and the made one is Active. This is a hint for the founder, never an automatic reversal. */
export function decisionConflicts(waiting: { affects: string }, made: { affects: string; status: string }[]): string[] {
  const words = (s: string) => new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  const w = words(waiting.affects);
  return made.filter((m) => /^active/i.test(m.status) && [...words(m.affects)].some((x) => w.has(x))).map((m) => m.affects);
}

// ---------------------------------------------------------------------------------------------------------------------
// v93: Current execution, dependency register, resume text. Still pure: no database, no clock except the one passed in.
// ---------------------------------------------------------------------------------------------------------------------
export interface CurrentExecution {
  activePrompt: { id: string; title: string; why: string } | null;
  inFlight: ControlTask[];          // IN PROGRESS or TESTING
  waitingForFounderCheck: ControlTask[]; // READY FOR TESTING
  partly: ControlTask[];            // PARTIALLY COMPLETED
  founderNext: ControlTask | null;
  recommendedNext: ControlTask | null; // lowest-numbered open task whose task dependencies are done and that names no founder item
  blockedByFounder: { task: ControlTask; waitingOn: string[] }[];
  decisionsWaiting: { id: string; decision: string; affects: string }[];
  lastExecution: { id: string; executed_on: string; summary: string } | null;
}
const isOpenTask = (t: ControlTask) => !isDone(t.status) && t.status !== 'CANCELLED' && t.status !== 'DEFERRED';
/** What is running now, what waits for the founder, and what Claude would recommend. It never starts anything: the founder chooses. */
export function currentExecution(reg: ControlRegistry): CurrentExecution {
  const tasks = [...reg.tasks].sort((a, b) => numeric(a.id) - numeric(b.id));
  const doneIds = new Set(tasks.filter((t) => isDone(t.status)).map((t) => t.id));
  const nowPrompt = reg.prompts.find((p) => p.founder_priority === 'now') ?? null;
  const withTasks = nowPrompt ?? reg.prompts.find((p) => p.requirement_level && tasks.some((t) => t.prompt_id === p.id && isOpenTask(t))) ?? null;
  const activePrompt = withTasks ? { id: withTasks.id, title: withTasks.title, why: nowPrompt ? 'You set this prompt to "now".' : 'The newest prompt with open tasks (you have not set a priority).' } : null;
  const gatedByFounder = (t: ControlTask) => depOutside(t.depends_on);
  const recommendedNext = tasks.find((t) => isOpenTask(t) && t.status !== 'BLOCKED' && t.status !== 'READY FOR TESTING' && depTaskIds(t.depends_on).every((d) => doneIds.has(d)) && gatedByFounder(t).length === 0) ?? null;
  const exec = [...reg.executions].sort((a, b) => (a.executed_on === b.executed_on ? numeric(b.id) - numeric(a.id) : a.executed_on < b.executed_on ? 1 : -1))[0] ?? null;
  return {
    activePrompt,
    inFlight: tasks.filter((t) => t.status === 'IN PROGRESS' || t.status === 'TESTING'),
    waitingForFounderCheck: tasks.filter((t) => t.status === 'READY FOR TESTING'),
    partly: tasks.filter((t) => t.status === 'PARTIALLY COMPLETED'),
    founderNext: tasks.find((t) => t.founder_next) ?? null,
    recommendedNext,
    blockedByFounder: tasks.filter((t) => isOpenTask(t) && gatedByFounder(t).length > 0 && depTaskIds(t.depends_on).every((d) => doneIds.has(d))).map((t) => ({ task: t, waitingOn: gatedByFounder(t) })),
    decisionsWaiting: reg.decisions.filter((d) => d.kind === 'waiting').map((d) => ({ id: d.id, decision: d.decision, affects: d.affects })),
    lastExecution: exec ? { id: exec.id, executed_on: exec.executed_on, summary: exec.summary } : null,
  };
}

export type DepState = 'done' | 'ready' | 'waiting_on_tasks' | 'waiting_on_founder' | 'blocked';
export interface DepRow { id: string; title: string; status: ControlStatus; state: DepState; needs: string[]; unfinished: string[]; outside: string[]; unknown: string[]; unlocks: string[] }
export interface DepReport { rows: DepRow[]; problems: string[]; readyCount: number }
/** Dependency register from the tasks themselves: who waits for whom, what is ready, and any broken link (unknown id, self-dependency, loop). */
export function dependencyReport(tasks: ControlTask[]): DepReport {
  const byId = new Map(tasks.map((t) => [t.id, t] as const));
  const unlocks = new Map<string, string[]>();
  for (const t of tasks) for (const d of depTaskIds(t.depends_on)) unlocks.set(d, [...(unlocks.get(d) ?? []), t.id]);
  const problems: string[] = [];
  const rows: DepRow[] = [...tasks].sort((a, b) => numeric(a.id) - numeric(b.id)).map((t) => {
    const needs = depTaskIds(t.depends_on); const unknown = needs.filter((d) => !byId.has(d)); const outside = depOutside(t.depends_on);
    const unfinished = needs.filter((d) => byId.has(d) && !isDone(byId.get(d)!.status));
    if (needs.includes(t.id)) problems.push(`${t.id} depends on itself`);
    for (const u of unknown) problems.push(`${t.id} needs ${u}, which does not exist`);
    const state: DepState = isDone(t.status) ? 'done' : t.status === 'BLOCKED' ? 'blocked' : unfinished.length ? 'waiting_on_tasks' : outside.length ? 'waiting_on_founder' : 'ready';
    return { id: t.id, title: t.title, status: t.status, state, needs, unfinished, outside, unknown, unlocks: unlocks.get(t.id) ?? [] };
  });
  // loop check (depth-first)
  const colour = new Map<string, 1 | 2>();
  const visit = (id: string, path: string[]) => {
    if (colour.get(id) === 2) return; if (colour.get(id) === 1) { problems.push(`dependency loop: ${[...path.slice(path.indexOf(id)), id].join(' -> ')}`); return; }
    colour.set(id, 1); for (const d of depTaskIds(byId.get(id)?.depends_on ?? '')) if (byId.has(d) && d !== id) visit(d, [...path, id]); colour.set(id, 2);
  };
  for (const t of tasks) visit(t.id, []);
  return { rows, problems: Array.from(new Set(problems)), readyCount: rows.filter((r) => r.state === 'ready').length };
}

/** The session resume as plain text (what SESSION_RESUME.md says), built from the same numbers as the screens. */
export function resumeText(reg: ControlRegistry, today: string): string {
  const r = resumeReport(reg); const c = currentExecution(reg);
  const line = (t: ControlTask) => `  - ${t.id} ${t.title} [${t.status}]`;
  const out: string[] = [
    `SAHAYAK SESSION RESUME (${today})`, '',
    `Master prompts registered: ${r.prompts} (${r.promptsTrackedByRequirement} tracked requirement by requirement)`,
    `Objectives: ${r.objectives}. Requirements: ${r.requirements} -> completed ${r.completed}, accepted by founder ${r.acceptedByFounder}, in progress or ready for testing ${r.inProgress}, not started ${r.pending}, blocked ${r.blocked}.`,
    `Tasks: ${r.tasksDone} of ${r.tasks} done.`, '',
    `Active prompt: ${c.activePrompt ? `${c.activePrompt.id} (${c.activePrompt.why})` : 'none'}`,
    `Founder's chosen next task: ${c.founderNext ? `${c.founderNext.id} ${c.founderNext.title}` : 'none chosen'}`,
    `Claude's recommendation: ${c.recommendedNext ? `${c.recommendedNext.id} ${c.recommendedNext.title}` : 'none ready (see waiting list)'}`,
    `Last delivery: ${c.lastExecution ? `${c.lastExecution.id} on ${c.lastExecution.executed_on}: ${c.lastExecution.summary}` : 'none recorded'}`, '',
  ];
  if (c.inFlight.length) out.push('Running now:', ...c.inFlight.map(line), '');
  out.push(`Waiting for the founder to check (${c.waitingForFounderCheck.length}):`, ...(c.waitingForFounderCheck.length ? c.waitingForFounderCheck.map(line) : ['  (none)']), '');
  out.push(`Partly done (${c.partly.length}):`, ...(c.partly.length ? c.partly.map(line) : ['  (none)']), '');
  out.push(`Decisions waiting for the founder (${c.decisionsWaiting.length}):`, ...(c.decisionsWaiting.length ? c.decisionsWaiting.map((d) => `  - ${d.id}: ${d.decision} (affects ${d.affects || 'n/a'})`) : ['  (none)']), '');
  out.push('Rules: the founder chooses priorities; COMPLETED needs evidence; ACCEPTED BY FOUNDER is the founder\'s alone; nothing is deployed without the founder.');
  return out.join('\n');
}
