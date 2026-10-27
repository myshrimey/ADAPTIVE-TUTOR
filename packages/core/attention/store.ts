import type { SupabaseClient } from '@supabase/supabase-js';
import { attentionFor, rankAttention, summariseBatch, interventionResult, type StudentSignals, type Attention, type BatchSummary } from './rules';

const UUID = /^[0-9a-f-]{36}$/i;
const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

/** Students this adult may see: only ACTIVE links of the matching kind. Every other function here starts from this list. */
export async function linkedStudents(service: SupabaseClient, ownerUserId: string): Promise<string[]> {
  const { data } = await service.from('student_links').select('student_id').eq('adult_user_id', ownerUserId).eq('status', 'active').limit(2000);
  return ((data ?? []) as any[]).map((r) => r.student_id);
}

export async function loadSignals(service: SupabaseClient, ids: string[], now = Date.now()): Promise<StudentSignals[]> {
  if (!ids.length) return [];
  const since = new Date(now - 14 * 86400000).toISOString();
  const today = new Date(now + 5.5 * 3600000).toISOString().slice(0, 10);
  const [st, ms, ss, rv] = await Promise.all([
    service.from('students').select('id, display_name').in('id', ids),
    service.from('mastery_states').select('student_id, skill_id, score, skills(name)').in('student_id', ids).limit(20000),
    service.from('learning_sessions').select('student_id, started_at').in('student_id', ids).order('started_at', { ascending: false }).limit(10000),
    service.from('review_schedule').select('student_id, due_on, lapses').in('student_id', ids).limit(20000),
  ]);
  return ((st.data ?? []) as any[]).map((s) => {
    const m = ((ms.data ?? []) as any[]).filter((r) => r.student_id === s.id);
    const sess = ((ss.data ?? []) as any[]).filter((r) => r.student_id === s.id);
    const rev = ((rv.data ?? []) as any[]).filter((r) => r.student_id === s.id);
    const last = sess.length ? Date.parse(sess[0].started_at) : null;
    return {
      studentId: s.id, name: s.display_name, skillsWithEvidence: m.length,
      averageMastery: m.length ? Math.round(m.reduce((a, r) => a + Number(r.score), 0) / m.length) : null,
      daysSinceActive: last === null ? null : Math.max(0, Math.floor((now - last) / 86400000)),
      sessions14d: sess.filter((r) => r.started_at >= since).length,
      weakSkills: m.filter((r) => Number(r.score) < 40).map((r) => ({ skillId: r.skill_id, name: r.skills?.name ?? 'a skill', score: Math.round(Number(r.score)) })),
      strongSkills: m.filter((r) => Number(r.score) >= 75).length,
      overdueReviews: rev.filter((r) => r.due_on < today).length, lapses: rev.reduce((a, r) => a + (r.lapses ?? 0), 0),
    };
  });
}

export async function attentionBoard(service: SupabaseClient, ownerUserId: string): Promise<{ attention: Attention[]; summary: BatchSummary; signals: StudentSignals[] }> {
  const signals = await loadSignals(service, await linkedStudents(service, ownerUserId));
  const attention = rankAttention(signals.map(attentionFor));
  return { attention, summary: summariseBatch(signals, attention), signals };
}

// ---- batches
export async function listBatches(service: SupabaseClient, ownerUserId: string) {
  const { data: b } = await service.from('batches').select('id, name, subject_id, created_at').eq('owner_user_id', ownerUserId).eq('archived', false).order('created_at', { ascending: true }).limit(100);
  const batches = (b ?? []) as any[];
  if (!batches.length) return [];
  const { data: bs } = await service.from('batch_students').select('batch_id, student_id').in('batch_id', batches.map((x) => x.id)).limit(10000);
  const allowed = new Set(await linkedStudents(service, ownerUserId));
  const out = [];
  for (const x of batches) {
    const ids = ((bs ?? []) as any[]).filter((r) => r.batch_id === x.id && allowed.has(r.student_id)).map((r) => r.student_id as string);
    const signals = await loadSignals(service, ids);
    const att = signals.map(attentionFor);
    out.push({ id: x.id as string, name: x.name as string, studentIds: ids, summary: summariseBatch(signals, att) });
  }
  return out;
}
export async function createBatch(service: SupabaseClient, ownerUserId: string, name: unknown): Promise<{ id: string }> {
  const n = clean(name, 80); if (n.length < 2) throw new Error('Give the batch a name.');
  const { count } = await service.from('batches').select('id', { count: 'exact', head: true }).eq('owner_user_id', ownerUserId).eq('archived', false);
  if ((count ?? 0) >= 50) throw new Error('You have 50 batches. Archive one first.');
  const { data, error } = await service.from('batches').insert({ owner_user_id: ownerUserId, name: n }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create the batch.');
  return { id: (data as any).id };
}
async function ownBatch(service: SupabaseClient, ownerUserId: string, batchId: unknown) {
  if (typeof batchId !== 'string' || !UUID.test(batchId)) throw new Error('Choose a batch.');
  const { data } = await service.from('batches').select('id').eq('id', batchId).eq('owner_user_id', ownerUserId).maybeSingle();
  if (!data) throw new Error('That batch was not found.');
  return batchId;
}
async function ownStudent(service: SupabaseClient, ownerUserId: string, studentId: unknown) {
  if (typeof studentId !== 'string' || !UUID.test(studentId)) throw new Error('Choose a student.');
  if (!(await linkedStudents(service, ownerUserId)).includes(studentId)) throw new Error('That student is not linked to you.');
  return studentId;
}
export async function setBatchMember(service: SupabaseClient, ownerUserId: string, batchId: unknown, studentId: unknown, member: boolean) {
  const b = await ownBatch(service, ownerUserId, batchId); const s = await ownStudent(service, ownerUserId, studentId);
  if (member) await service.from('batch_students').upsert({ batch_id: b, student_id: s }, { onConflict: 'batch_id,student_id' });
  else await service.from('batch_students').delete().eq('batch_id', b).eq('student_id', s);
}
export async function archiveBatch(service: SupabaseClient, ownerUserId: string, batchId: unknown) {
  const b = await ownBatch(service, ownerUserId, batchId);
  await service.from('batches').update({ archived: true }).eq('id', b);
}

// ---- interventions: problem -> evidence -> action -> result
export async function createIntervention(service: SupabaseClient, ownerUserId: string, o: { studentId: unknown; skillId?: unknown; problem: unknown; evidence?: unknown; action: unknown }) {
  const studentId = await ownStudent(service, ownerUserId, o.studentId);
  const problem = clean(o.problem, 300); const action = clean(o.action, 500);
  if (!problem || !action) throw new Error('Write the problem and what you will do.');
  let skillId: string | null = null; let baseline: number | null = null;
  if (typeof o.skillId === 'string' && UUID.test(o.skillId)) {
    skillId = o.skillId;
    const { data } = await service.from('mastery_states').select('score').eq('student_id', studentId).eq('skill_id', skillId).maybeSingle();
    baseline = data ? Number((data as any).score) : null;
  }
  const { data, error } = await service.from('interventions').insert({ owner_user_id: ownerUserId, student_id: studentId, skill_id: skillId, problem, evidence: clean(o.evidence, 500) || null, action, baseline_score: baseline }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not save.');
  return { id: (data as any).id as string, baseline };
}
export async function updateIntervention(service: SupabaseClient, ownerUserId: string, id: unknown, status: unknown, now = Date.now()) {
  if (typeof id !== 'string' || !UUID.test(id)) throw new Error('Choose an intervention.');
  if (status !== 'done' && status !== 'dropped') throw new Error('Unknown status.');
  const { data } = await service.from('interventions').select('id, status').eq('id', id).eq('owner_user_id', ownerUserId).maybeSingle();
  if (!data) throw new Error('That was not found.');
  await service.from('interventions').update({ status, done_at: new Date(now).toISOString() }).eq('id', id);
}
/** Looks at the skill score again and records whether it moved. Safe to run any time; only "done" ones with a skill are measured. */
export async function measureInterventions(service: SupabaseClient, ownerUserId: string, now = Date.now()) {
  const { data } = await service.from('interventions').select('*').eq('owner_user_id', ownerUserId).order('created_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as any[];
  const allowed = new Set(await linkedStudents(service, ownerUserId));
  for (const r of rows) {
    if (r.status === 'done' && r.skill_id && allowed.has(r.student_id)) {
      const { data: m } = await service.from('mastery_states').select('score').eq('student_id', r.student_id).eq('skill_id', r.skill_id).maybeSingle();
      const f = m ? Number((m as any).score) : null;
      const days = Math.floor((now - Date.parse(r.done_at ?? r.created_at)) / 86400000);
      const result = interventionResult(r.baseline_score === null ? null : Number(r.baseline_score), f, days);
      if (result !== r.result || f !== (r.followup_score === null ? null : Number(r.followup_score))) {
        await service.from('interventions').update({ followup_score: f, result, measured_at: new Date(now).toISOString() }).eq('id', r.id);
        r.followup_score = f; r.result = result;
      }
    }
  }
  const names = new Map<string, string>();
  const ids = [...new Set(rows.map((r) => r.student_id))];
  if (ids.length) { const { data: st } = await service.from('students').select('id, display_name').in('id', ids); for (const s of (st ?? []) as any[]) names.set(s.id, s.display_name); }
  return rows.filter((r) => allowed.has(r.student_id)).map((r) => ({ ...r, studentName: names.get(r.student_id) ?? 'Student' }));
}
