// v90: database side of the Development Control Centre. SERVER ONLY (service client). Every function is safe to call when migration 0056 has not been run:
// reads return null, writes return { ok: false, error: 'tables_missing' }.
import type { SupabaseClient } from '@supabase/supabase-js';
import { writeAudit } from '../config-engine/config-engine';
import { cleanRequirements } from './logic';
import { isControlStatus, type ControlAcceptance, type ControlPriority, type ControlRegistry } from './types';

const T = ['control_prompts', 'control_objectives', 'control_requirements', 'control_tasks', 'control_decisions', 'control_executions'] as const;
const missing = (err: any) => !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(String(err.message ?? '')));

/** Reads the whole registry. Returns null when the tables do not exist or hold nothing yet (the screens then show the bundled copy and say so). */
export async function loadRegistry(service: SupabaseClient): Promise<ControlRegistry | null> {
  try {
    const r = await Promise.all(T.map((t) => service.from(t).select('*').limit(5000)));
    if (r.some((x) => x.error)) return null;
    const [prompts, objectives, requirements, tasks, decisions, executions] = r.map((x) => (x.data ?? []) as any[]);
    if (!prompts.length) return null;
    return {
      prompts: prompts.filter((p) => isControlStatus(p.status)),
      objectives, requirements: cleanRequirements(requirements), tasks: tasks.filter((t) => isControlStatus(t.status)), decisions, executions,
    } as ControlRegistry;
  } catch { return null; }
}

const chunk = <X,>(a: X[], n = 200): X[][] => { const o: X[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

/**
 * Loads the documents' copy of the registry into the tables. Safe to run again. It updates what Claude maintains (text, status, notes) and
 * NEVER writes the founder's own columns (founder_priority, founder_acceptance, founder_next, founder_rank): those columns are not in the payload,
 * so an existing value is left exactly as the founder set it.
 */
export async function importRegistry(service: SupabaseClient, reg: ControlRegistry, actorEmail: string | null): Promise<{ ok: boolean; error?: string; counts?: Record<string, number> }> {
  const now = new Date().toISOString();
  const up = async (table: string, rows: any[], conflict = 'id') => {
    for (const part of chunk(rows)) { const { error } = await service.from(table).upsert(part, { onConflict: conflict }); if (error) return error; }
    return null;
  };
  const steps: [string, any[]][] = [
    ['control_prompts', reg.prompts.map((p) => ({ id: p.id, title: p.title, received_on: p.received_on, original_kept: p.original_kept, original_text: p.original_text ?? null, objective: p.objective, status: p.status, category: p.category, related_to: p.related_to, requirement_level: p.requirement_level, note: p.note, updated_at: now }))],
    ['control_objectives', reg.objectives.map((o) => ({ id: o.id, prompt_id: o.prompt_id, code: o.code, title: o.title, updated_at: now }))],
    ['control_requirements', reg.requirements.map((r) => ({ id: r.id, prompt_id: r.prompt_id, objective_code: r.objective_code, code: r.code, text: r.text, status: r.status, note: r.note, updated_at: now }))],
    ['control_tasks', reg.tasks.map((t) => ({ id: t.id, prompt_id: t.prompt_id, phase: t.phase, title: t.title, objective_code: t.objective_code, requirements: t.requirements, depends_on: t.depends_on, size: t.size, status: t.status, verification: t.verification, note: t.note, updated_at: now }))],
    ['control_decisions', reg.decisions.map((d) => ({ id: d.id, kind: d.kind, decided_on: d.decided_on, decision: d.decision, source: d.source, affects: d.affects, status: d.status, recommendation: d.recommendation, updated_at: now }))],
    ['control_executions', reg.executions.map((e) => ({ id: e.id, executed_on: e.executed_on, prompt_id: e.prompt_id, summary: e.summary, files: e.files, db_changes: e.db_changes, tests: e.tests, open_problems: e.open_problems, updated_at: now }))],
  ];
  const counts: Record<string, number> = {};
  for (const [table, rows] of steps) {
    const err = await up(table, rows);
    if (err) return { ok: false, error: missing(err) ? 'tables_missing' : 'failed' };
    counts[table] = rows.length;
  }
  await writeAudit(service, { actorEmail, action: 'control.import', entity: 'control_registry', detail: counts });
  return { ok: true, counts };
}

/** The founder picks the ONE task Claude should do next. This only records the choice; nothing is executed. Passing null clears it. */
export async function setNextTask(service: SupabaseClient, taskId: string | null, actorEmail: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    if (taskId) { const { data, error } = await service.from('control_tasks').select('id,status').eq('id', taskId).maybeSingle(); if (error) return { ok: false, error: missing(error) ? 'tables_missing' : 'failed' }; if (!data) return { ok: false, error: 'not_found' }; if (['COMPLETED', 'ACCEPTED BY FOUNDER', 'CANCELLED'].includes((data as any).status)) return { ok: false, error: 'task_already_finished' }; }
    const c = await service.from('control_tasks').update({ founder_next: false }).eq('founder_next', true); if (c.error) return { ok: false, error: missing(c.error) ? 'tables_missing' : 'failed' };
    if (taskId) { const s = await service.from('control_tasks').update({ founder_next: true }).eq('id', taskId); if (s.error) return { ok: false, error: 'failed' }; }
    await writeAudit(service, { actorEmail, action: 'control.next_task', entity: 'control_tasks', entityId: taskId, detail: { taskId } });
    return { ok: true };
  } catch { return { ok: false, error: 'failed' }; }
}

export async function setPromptPriority(service: SupabaseClient, promptId: string, priority: ControlPriority | null, actorEmail: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await service.from('control_prompts').update({ founder_priority: priority }).eq('id', promptId).select('id');
    if (error) return { ok: false, error: missing(error) ? 'tables_missing' : 'failed' };
    if (!data || !data.length) return { ok: false, error: 'not_found' };
    await writeAudit(service, { actorEmail, action: 'control.prompt_priority', entity: 'control_prompts', entityId: promptId, detail: { priority } });
    return { ok: true };
  } catch { return { ok: false, error: 'failed' }; }
}

/** Founder acceptance is separate from technical status: this never changes the requirement's status. */
export async function setAcceptance(service: SupabaseClient, promptId: string, code: string, value: ControlAcceptance, actorEmail: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await service.from('control_requirements').update({ founder_acceptance: value }).eq('prompt_id', promptId).eq('code', code).select('id');
    if (error) return { ok: false, error: missing(error) ? 'tables_missing' : 'failed' };
    if (!data || !data.length) return { ok: false, error: 'not_found' };
    await writeAudit(service, { actorEmail, action: 'control.acceptance', entity: 'control_requirements', entityId: `${promptId}/${code}`, detail: { value } });
    return { ok: true };
  } catch { return { ok: false, error: 'failed' }; }
}
