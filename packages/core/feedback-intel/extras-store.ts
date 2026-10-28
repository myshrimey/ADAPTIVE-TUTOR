import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from '../ai-provider/ai-provider.interface';
import { analyseNewFeedback } from './store';
import { isPositive, feedbackPriority, buildFeedbackAnalytics, filterClusters, suggestMoat, MOAT_LEVELS, IMPACT_POINTS, VALIDATION, FB_SOURCES, FB_ROLES, FB_IMPACTS, type ClusterLite, type MsgLite, type Moat, type QueueFilter, type Priority, type FbAnalytics } from './extras';
import { FB_CATEGORY_LABEL, type FbStatus } from './rules';

const cap = (s: unknown, n: number) => String(s ?? '').trim().slice(0, n);
const event = (service: SupabaseClient, clusterId: string, actor: string, status: string, note: string) => service.from('feedback_cluster_events').insert({ cluster_id: clusterId, actor, from_status: status, to_status: status, note });

/** Feedback received outside the app (call, meeting, WhatsApp...). It goes through exactly the same sorting and grouping as in-app messages. */
export async function addManualFeedback(service: SupabaseClient, actor: string, f: { source: string; person?: string; role?: string; receivedOn?: string; message: string; context?: string; impact?: string }) {
  const message = cap(f.message, 2000); if (message.length < 5) throw new Error('Write what was said (at least a few words).');
  if (!(f.source in FB_SOURCES) || f.source === 'in_app') throw new Error('Choose where the feedback came from.');
  const role = f.role && f.role in FB_ROLES ? f.role : 'other';
  const impact = f.impact && f.impact in FB_IMPACTS ? f.impact : null;
  const received = /^\d{4}-\d{2}-\d{2}$/.test(String(f.receivedOn ?? '')) ? f.receivedOn : null;
  const { data, error } = await service.from('feedback').insert({ message, page: null, source: f.source, role, person: cap(f.person, 120) || null, received_on: received, impact, context: f.context ? { note: cap(f.context, 400), enteredBy: actor } : { enteredBy: actor }, positive: isPositive(message, null, null) }).select('id').single();
  if (error || !data) throw new Error('Could not save the feedback. Run the latest database update (0047) and try again.');
  const r = await analyseNewFeedback(service); return { id: (data as any).id as string, analysed: r.analysed };
}

export interface QueueRow { c: ClusterLite & Record<string, any>; p: Priority }
export interface Queue { rows: QueueRow[]; analytics: FbAnalytics; total: number; sources: string[]; areas: string[]; error?: string }
/** Loads the groups with their computed priority. Search matches the group's words AND the message text. */
export async function loadQueue(service: SupabaseClient, f: QueueFilter & { done?: boolean; all?: boolean }, now = new Date()): Promise<Queue> {
  const { data: cl, error } = await service.from('feedback_clusters').select('*').limit(1000);
  const { data: ms } = await service.from('feedback').select('id, created_at, role, source, feature_area, category, cluster_id, positive, duplicate_of, impact, student_id, message, contact_email').order('created_at', { ascending: false }).limit(5000);
  const msgs = (ms ?? []) as any[]; const weekAgo = now.getTime() - 7 * 86400000;
  const byC = new Map<string, any[]>(); for (const m of msgs) if (m.cluster_id) { const a = byC.get(m.cluster_id) ?? []; a.push(m); byC.set(m.cluster_id, a); }
  const srcOf = new Map<string, Set<string>>(), roleOf = new Map<string, Set<string>>(); const textOf = new Map<string, string>();
  const clusters: (ClusterLite & Record<string, any>)[] = ((cl ?? []) as any[]).map((c) => {
    const list = byC.get(c.id) ?? []; const people = new Set<string>(); let anon = 0;
    for (const m of list) { if (m.duplicate_of) continue; if (m.student_id) people.add(m.student_id); else if (m.contact_email) people.add(m.contact_email); else anon++; }
    srcOf.set(c.id, new Set(list.map((m) => m.source ?? 'in_app'))); roleOf.set(c.id, new Set(list.map((m) => m.role).filter(Boolean)));
    textOf.set(c.id, list.map((m) => m.message).join(' \n ').toLowerCase());
    return { ...c, users: people.size + anon, reports7d: list.filter((m) => new Date(m.created_at).getTime() >= weekAgo).length, roles: [...(roleOf.get(c.id) ?? [])], impactMax: Math.max(0, ...list.map((m) => IMPACT_POINTS[m.impact ?? ''] ?? 0)) };
  });
  const analytics = buildFeedbackAnalytics(msgs as MsgLite[], clusters, now);
  let ids: Set<string> | null = null;
  const q = cap(f.q, 80).toLowerCase();
  if (q) { ids = new Set(clusters.filter((c) => [c.title, c.feature_area, FB_CATEGORY_LABEL[c.category], c.proposed_action, c.reviewer_note, c.task ? JSON.stringify(c.task) : '', c.deployment_version].join(' ').toLowerCase().includes(q) || (textOf.get(c.id) ?? '').includes(q)).map((c) => c.id)); }
  let rows: QueueRow[] = clusters.map((c) => ({ c, p: feedbackPriority({ category: c.category, area: c.feature_area, severity: c.severity, risk: c.risk, reports: c.report_count, uniqueReports: c.report_count, reports7d: c.reports7d ?? 0, users: c.users ?? 0, roles: c.roles ?? [], impactMax: c.impactMax ?? 0, moat: (c.moat as Moat) ?? 'none', status: c.status, text: textOf.get(c.id) }, { level: c.priority_override }) }));
  const waiting = ['new', 'analysed', 'proposed', 'under_review', 'deferred']; const done = ['approved', 'rejected', 'modified', 'implemented', 'verified', 'rolled_back'];
  if (!f.all) rows = rows.filter((x) => (f.done ? done : waiting).includes(x.c.status));
  rows = filterClusters(rows, f, ids, srcOf, roleOf);
  return { rows, analytics, total: msgs.length, sources: [...new Set(msgs.map((m) => m.source ?? 'in_app'))], areas: [...new Set(clusters.map((c) => c.feature_area))].sort(), error: error?.message };
}

export async function setMoat(service: SupabaseClient, actor: string, clusterId: string, moat: string) {
  if (!(MOAT_LEVELS as readonly string[]).includes(moat)) throw new Error('Choose none, low, medium, high or core.');
  const { data: c } = await service.from('feedback_clusters').select('status').eq('id', clusterId).maybeSingle(); if (!c) throw new Error('Group not found.');
  await service.from('feedback_clusters').update({ moat, updated_at: new Date().toISOString() }).eq('id', clusterId); await event(service, clusterId, actor, (c as any).status, `Moat value set to "${moat}"`);
}
export async function overridePriority(service: SupabaseClient, actor: string, clusterId: string, level: string | null, reason: string) {
  if (level !== null && !/^P[0-3]$/.test(level)) throw new Error('Choose P0, P1, P2 or P3.');
  if (cap(reason, 500).length < 5) throw new Error('Write the reason for changing the priority.');
  const { data: c } = await service.from('feedback_clusters').select('status').eq('id', clusterId).maybeSingle(); if (!c) throw new Error('Group not found.');
  await service.from('feedback_clusters').update({ priority_override: level, priority_reason: cap(reason, 500), updated_at: new Date().toISOString() }).eq('id', clusterId);
  await event(service, clusterId, actor, (c as any).status, level ? `Priority set by hand to ${level}: ${cap(reason, 300)}` : `Priority override removed: ${cap(reason, 300)}`);
}
export async function setDeferUntil(service: SupabaseClient, clusterId: string, date: string | undefined) { if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) await service.from('feedback_clusters').update({ defer_until: date }).eq('id', clusterId); }

export interface TaskInput { title: string; problem: string; expected: string; acceptance: string; assignee?: string; targetRelease?: string }
/** A product task is written down only for a group a person has approved. It is a record, not an automatic change. */
export async function createTask(service: SupabaseClient, actor: string, clusterId: string, t: TaskInput) {
  const { data: c } = await service.from('feedback_clusters').select('status, task, title, feature_area, report_count').eq('id', clusterId).maybeSingle(); if (!c) throw new Error('Group not found.');
  const st = (c as any).status as FbStatus; if (!['approved', 'modified', 'implemented'].includes(st)) throw new Error('Approve the group first; a task is made only for approved feedback.');
  const title = cap(t.title, 140), acceptance = cap(t.acceptance, 1000); if (title.length < 5) throw new Error('Give the task a title.'); if (acceptance.length < 5) throw new Error('Write how you will know it is fixed (acceptance check).');
  const { data: msgs } = await service.from('feedback').select('id').eq('cluster_id', clusterId).limit(200);
  const task = { title, problem: cap(t.problem, 1000), expected: cap(t.expected, 600), acceptance, assignee: cap(t.assignee, 80) || null, targetRelease: cap(t.targetRelease, 40) || null, area: (c as any).feature_area, reports: (c as any).report_count, feedbackIds: ((msgs ?? []) as any[]).map((m) => m.id), createdBy: actor, createdAt: new Date().toISOString() };
  await service.from('feedback_clusters').update({ task, updated_at: new Date().toISOString() }).eq('id', clusterId); await event(service, clusterId, actor, st, `Task written: ${title}`);
  return task;
}
/** After a fix, a person records whether it worked. "Fixed and validated" needs the version it went out in; a bad outcome reopens the group. */
export async function validateCluster(service: SupabaseClient, actor: string, clusterId: string, v: { outcome: string; version?: string; note?: string }) {
  if (!(v.outcome in VALIDATION)) throw new Error('Choose an outcome.');
  const { data: c } = await service.from('feedback_clusters').select('status').eq('id', clusterId).maybeSingle(); if (!c) throw new Error('Group not found.');
  const from = (c as any).status as FbStatus; if (!['implemented', 'verified', 'rolled_back'].includes(from)) throw new Error('Mark the group "implemented" first; validation comes after the fix is live.');
  const note = cap(v.note, 800), version = cap(v.version, 60);
  if (v.outcome === 'fixed_validated' && !version) throw new Error('Write the version or date it was deployed (for example v73).');
  if (['not_fixed', 'regression', 'reopened', 'partial'].includes(v.outcome) && note.length < 5) throw new Error('Write a short note saying what you saw.');
  const now = new Date().toISOString(); const reopen = ['not_fixed', 'regression', 'reopened'].includes(v.outcome);
  const to: FbStatus = v.outcome === 'fixed_validated' ? 'verified' : reopen ? 'under_review' : from;
  await service.from('feedback_clusters').update({ status: to, validation_status: v.outcome, validation_note: note || null, deployment_version: version || null, validated_by: actor, validated_at: now, updated_at: now }).eq('id', clusterId);
  await service.from('feedback_cluster_events').insert({ cluster_id: clusterId, actor, from_status: from, to_status: to, note: `Validation: ${VALIDATION[v.outcome]}${version ? ` (deployed ${version})` : ''}${note ? ` - ${note}` : ''}` });
  return { status: to };
}

// ---- optional AI analysis: a recommendation, never a decision ----
export const FB_PROMPT_VERSION = 'fbk-v1';
export const FB_AI_DAILY_CAP = 30;
const RULES = `You help a founder of an education product (Sahayak, CBSE Class 10) understand a group of user feedback messages. You only RECOMMEND; a person decides. Never invent facts, numbers or user names. If the evidence is thin, say so and give a low confidence.
Return ONLY JSON: {"summary": string, "suspected_cause": string, "recommended_solution": string, "recommended_action": "investigate"|"bug_fix"|"product_improvement"|"request_more_information"|"defer"|"reject"|"urgent_review", "learning_impact": "none"|"low"|"medium"|"high", "moat_impact": "none"|"low"|"medium"|"high"|"core", "confidence": number (0-100), "reasoning": string}`;
const scrub = (s: string) => s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]').replace(/\+?\d[\d\s-]{8,}\d/g, '[number]').slice(0, 400);
export function parseFeedbackAnalysis(text: string) {
  const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error('The AI reply could not be used. Nothing was changed.');
  let j: any; try { j = JSON.parse(m[0]); } catch { throw new Error('The AI reply could not be read. Nothing was changed.'); }
  const one = (v: unknown, ok: string[], d: string) => (typeof v === 'string' && ok.includes(v) ? v : d); const conf = Math.round(Number(j.confidence)); const summary = cap(j.summary, 600);
  if (!summary) throw new Error('The AI gave an empty answer. Nothing was changed.');
  return { summary, suspected_cause: cap(j.suspected_cause, 500), recommended_solution: cap(j.recommended_solution, 600), recommended_action: one(j.recommended_action, ['investigate', 'bug_fix', 'product_improvement', 'request_more_information', 'defer', 'reject', 'urgent_review'], 'investigate'),
    learning_impact: one(j.learning_impact, ['none', 'low', 'medium', 'high'], 'low'), moat_impact: one(j.moat_impact, [...MOAT_LEVELS], 'none'), confidence: Number.isFinite(conf) ? Math.min(100, Math.max(0, conf)) : 0, reasoning: cap(j.reasoning, 800) };
}
export async function aiAnalyseCluster(service: SupabaseClient, ai: AIProvider, actor: string, clusterId: string, meta: (requestId?: string) => Promise<{ provider?: string; model?: string }>, now = new Date()) {
  const dayStart = new Date(`${new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)}T00:00:00+05:30`).toISOString();
  try { const { data } = await service.from('ai_usage').select('id').eq('feature', 'feedback_analysis').eq('ok', true).gte('created_at', dayStart).limit(FB_AI_DAILY_CAP + 1); if ((data ?? []).length >= FB_AI_DAILY_CAP) throw new Error(`Today's limit of ${FB_AI_DAILY_CAP} AI analyses is used. Try tomorrow; the rule-based review still works.`); } catch (e: any) { if (/limit of/.test(e.message)) throw e; }
  const { data: c } = await service.from('feedback_clusters').select('title, category, feature_area, risk, severity, status').eq('id', clusterId).maybeSingle(); if (!c) throw new Error('Group not found.');
  const { data: ms } = await service.from('feedback').select('message, rating, page, source').eq('cluster_id', clusterId).order('created_at', { ascending: false }).limit(10);
  if (!(ms ?? []).length) throw new Error('This group has no messages yet.');
  let r; try { r = await ai.complete({ systemPrompt: RULES, userMessage: `Group: ${(c as any).title}. Area: ${(c as any).feature_area}. Rule-based severity: ${(c as any).severity}.\nMessages (newest first, personal details removed):\n${(ms as any[]).map((m, i) => `${i + 1}. ${m.rating != null ? `[${m.rating}/5] ` : ''}${scrub(m.message)}`).join('\n')}`, responseFormat: 'json', feature: 'feedback_analysis', ref: clusterId }); }
  catch { throw new Error('The AI could not be reached. The feedback is safe; the rule-based review above still works. Try again later.'); }
  const a = parseFeedbackAnalysis(r.text); const pm = await meta(r.requestId).catch(() => ({} as any));
  const ai_analysis = { ...a, label: 'AI recommendation (not a decision)', provider: pm.provider ?? null, model: pm.model ?? null, promptVersion: FB_PROMPT_VERSION, requestId: r.requestId ?? null, at: new Date().toISOString(), messagesRead: (ms ?? []).length };
  await service.from('feedback_clusters').update({ ai_analysis, updated_at: new Date().toISOString() }).eq('id', clusterId);
  const { data: st } = await service.from('feedback_clusters').select('status').eq('id', clusterId).maybeSingle(); await event(service, clusterId, actor, (st as any)?.status ?? 'analysed', 'AI analysis requested (recommendation only)');
  return ai_analysis;
}
export { suggestMoat };
