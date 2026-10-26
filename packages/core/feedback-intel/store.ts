import type { SupabaseClient } from '@supabase/supabase-js';
import { analyse, pickCluster, clusterTitle, clusterSeverity, maxLevel, riskOf, causeAndAction, canMove, approvalProblem, FB_DECISIONS, type FbCategory, type FbDecision, type FbStatus, type Level, type OpenCluster } from './rules';

export interface ClusterRow {
  id: string; title: string; category: FbCategory; feature_area: string; keywords: string[]; severity: Level; risk: Level; status: FbStatus;
  report_count: number; duplicate_count: number; affected_pages: string[]; likely_cause: string | null; proposed_action: string | null;
  reviewer_note: string | null; decided_by: string | null; decided_at: string | null; tested: boolean; created_at: string; updated_at: string;
}

// Reads every message not yet sorted, groups it, and refreshes the group numbers. Safe to run again at any time.
export async function analyseNewFeedback(service: SupabaseClient, limit = 500): Promise<{ analysed: number; clustersTouched: number; error?: string }> {
  const { data: rows, error } = await service.from('feedback').select('id, message, page, rating, created_at').is('analysed_at', null).order('created_at', { ascending: true }).limit(limit);
  if (error) return { analysed: 0, clustersTouched: 0, error: error.message };
  if (!rows?.length) return { analysed: 0, clustersTouched: 0 };

  const { data: cl } = await service.from('feedback_clusters').select('id, category, feature_area, keywords, status').limit(2000);
  // Groups a person has closed (rejected, verified, rolled back) do not take new messages; a fresh group starts instead.
  const open: OpenCluster[] = (cl ?? []).filter((c: any) => !['rejected', 'verified', 'rolled_back'].includes(c.status)).map((c: any) => ({ id: c.id, category: c.category, area: c.feature_area, keywords: c.keywords ?? [] }));
  const touched = new Set<string>();
  const seenNorm = new Map<string, string>(); // normalised message -> first feedback id in this run

  for (const r of rows as any[]) {
    const a = analyse(r);
    let cid = pickCluster(a, open);
    if (!cid) {
      const { cause, action } = causeAndAction(a.category, a.area);
      const { data: ins, error: e2 } = await service.from('feedback_clusters').insert({
        title: clusterTitle(a.category, a.area), category: a.category, feature_area: a.area, keywords: a.keywords, severity: a.severity,
        risk: riskOf(a.category, a.area), status: 'analysed', likely_cause: cause, proposed_action: action,
      }).select('id').single();
      if (e2 || !ins) return { analysed: 0, clustersTouched: touched.size, error: e2?.message ?? 'could_not_create_group' };
      cid = ins.id as string;
      open.push({ id: cid, category: a.category, area: a.area, keywords: a.keywords });
    }
    const dupOf = a.norm.length > 8 ? seenNorm.get(a.norm) ?? null : null;
    if (a.norm.length > 8 && !dupOf) seenNorm.set(a.norm, r.id);
    await service.from('feedback').update({ category: a.category, feature_area: a.area, severity: a.severity, cluster_id: cid, duplicate_of: dupOf, analysed_at: new Date().toISOString() }).eq('id', r.id);
    touched.add(cid);
  }
  for (const cid of touched) await refreshCluster(service, cid);
  return { analysed: rows.length, clustersTouched: touched.size };
}

// Recounts a group from its messages: how many, how many repeats, which pages, how serious. A person's decision is never overwritten.
export async function refreshCluster(service: SupabaseClient, clusterId: string): Promise<void> {
  const { data: msgs } = await service.from('feedback').select('id, page, severity, duplicate_of, message').eq('cluster_id', clusterId).limit(5000);
  const list = (msgs ?? []) as any[];
  const worst = list.reduce<Level>((m, x) => maxLevel(m, (x.severity as Level) ?? 'low'), 'low');
  const unique = list.filter((x) => !x.duplicate_of).length;
  const pages = [...new Set(list.map((x) => x.page).filter(Boolean))].slice(0, 20) as string[];
  await service.from('feedback_clusters').update({
    report_count: list.length, duplicate_count: list.length - unique, affected_pages: pages,
    severity: clusterSeverity(worst, unique), updated_at: new Date().toISOString(),
  }).eq('id', clusterId);
}

const SEV_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
export async function listClusters(service: SupabaseClient, filter: 'waiting' | 'all' | 'done' = 'waiting'): Promise<{ clusters: ClusterRow[]; unanalysed: number; total: number; error?: string }> {
  let q = service.from('feedback_clusters').select('*').limit(500);
  if (filter === 'waiting') q = q.in('status', ['new', 'analysed', 'proposed', 'under_review', 'deferred']);
  if (filter === 'done') q = q.in('status', ['approved', 'rejected', 'modified', 'implemented', 'verified', 'rolled_back']);
  const { data, error } = await q;
  const { count: unanalysed } = await service.from('feedback').select('id', { count: 'exact', head: true }).is('analysed_at', null);
  const { count: total } = await service.from('feedback').select('id', { count: 'exact', head: true });
  const rows = ((data ?? []) as ClusterRow[]).sort((a, b) => (SEV_ORDER[a.severity] - SEV_ORDER[b.severity]) || (b.report_count - a.report_count));
  return { clusters: rows, unanalysed: unanalysed ?? 0, total: total ?? 0, error: error?.message };
}

export async function clusterMessages(service: SupabaseClient, clusterId: string, limit = 30) {
  const { data } = await service.from('feedback').select('id, created_at, rating, message, page, duplicate_of').eq('cluster_id', clusterId).order('created_at', { ascending: false }).limit(limit);
  const { data: ev } = await service.from('feedback_cluster_events').select('at, actor, from_status, to_status, note').eq('cluster_id', clusterId).order('at', { ascending: false }).limit(20);
  return { messages: data ?? [], events: ev ?? [] };
}

// A person's decision. The rules in rules.ts decide what is allowed; this only records it and the history line.
export async function decideCluster(service: SupabaseClient, p: { clusterId: string; decision?: FbDecision; moveTo?: FbStatus; note?: string; tested?: boolean; actor: string }): Promise<{ ok: boolean; status?: FbStatus; error?: string }> {
  const { data: c, error } = await service.from('feedback_clusters').select('id, status, risk').eq('id', p.clusterId).maybeSingle();
  if (error || !c) return { ok: false, error: error?.message ?? 'group_not_found' };
  const to: FbStatus | undefined = p.moveTo ?? (p.decision ? FB_DECISIONS[p.decision] : undefined);
  if (!to) return { ok: false, error: 'no_decision' };
  const from = c.status as FbStatus;
  if (!canMove(from, to)) return { ok: false, error: `Cannot move from "${from}" to "${to}".` };
  const problem = approvalProblem(c.risk as Level, to, p.note, p.tested);
  if (problem) return { ok: false, error: problem };
  const now = new Date().toISOString();
  const { error: e2 } = await service.from('feedback_clusters').update({ status: to, reviewer_note: p.note?.trim() || null, decided_by: p.actor, decided_at: now, tested: !!p.tested, updated_at: now }).eq('id', p.clusterId);
  if (e2) return { ok: false, error: e2.message };
  await service.from('feedback_cluster_events').insert({ cluster_id: p.clusterId, actor: p.actor, from_status: from, to_status: to, note: p.note?.trim() || null });
  return { ok: true, status: to };
}
