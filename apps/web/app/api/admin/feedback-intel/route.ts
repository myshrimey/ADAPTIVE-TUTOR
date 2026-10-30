import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { analyseNewFeedback, decideCluster, clusterMessages, writeAudit, FB_DECISIONS, FB_STATUSES, addManualFeedback, setMoat, overridePriority, createTask, validateCluster, setDeferUntil, aiAnalyseCluster, createAIProvider, recordAIAttempt } from '@adaptive-tutor/core';

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin('support');
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    if (b.action === 'analyse') return NextResponse.json({ data: await analyseNewFeedback(service), error: null });
    if (b.action === 'manual') { // feedback received outside the app, sent through the same pipeline
      const r = await addManualFeedback(service, admin.email, { source: String(b.source ?? ''), person: b.person, role: b.role, receivedOn: b.receivedOn, message: String(b.message ?? ''), context: b.context, impact: b.impact });
      await writeAudit(service, { actorEmail: admin.email, action: 'manual_entry', entity: 'feedback', entityId: r.id, detail: { source: b.source } });
      return NextResponse.json({ data: r, error: null });
    }
    if (typeof b.clusterId !== 'string' || !UUID.test(b.clusterId)) throw new Error('Choose a group.');
    if (b.action === 'messages') return NextResponse.json({ data: await clusterMessages(service, b.clusterId), error: null });
    if (b.action === 'moat') { await setMoat(service, admin.email, b.clusterId, String(b.moat)); return NextResponse.json({ data: true, error: null }); }
    if (b.action === 'priority') { await overridePriority(service, admin.email, b.clusterId, b.level ? String(b.level) : null, String(b.reason ?? '')); await writeAudit(service, { actorEmail: admin.email, action: 'priority_override', entity: 'feedback_cluster', entityId: b.clusterId, detail: { level: b.level ?? null } }); return NextResponse.json({ data: true, error: null }); }
    if (b.action === 'task') { const t = await createTask(service, admin.email, b.clusterId, { title: String(b.title ?? ''), problem: String(b.problem ?? ''), expected: String(b.expected ?? ''), acceptance: String(b.acceptance ?? ''), assignee: b.assignee, targetRelease: b.targetRelease }); await writeAudit(service, { actorEmail: admin.email, action: 'task', entity: 'feedback_cluster', entityId: b.clusterId, detail: { title: t.title } }); return NextResponse.json({ data: t, error: null }); }
    if (b.action === 'validate') { const r = await validateCluster(service, admin.email, b.clusterId, { outcome: String(b.outcome ?? ''), version: b.version, note: b.note }); await writeAudit(service, { actorEmail: admin.email, action: 'validate', entity: 'feedback_cluster', entityId: b.clusterId, detail: { outcome: b.outcome, version: b.version ?? null } }); return NextResponse.json({ data: r, error: null }); }
    if (b.action === 'ai') { // optional; a recommendation only. The AI gateway logs provider, model, tokens and cost under feature "feedback_analysis".
      const ai = createAIProvider({ tier: 'free', service, onAttempt: recordAIAttempt(service, null, 'free') });
      const meta = async (rid?: string) => { if (!rid) return {}; const { data } = await service.from('ai_usage').select('provider, model, ok, attempt_no').eq('request_id', rid).order('attempt_no', { ascending: false }).limit(5); const r = (data ?? []).find((x: any) => x.ok) ?? data?.[0]; return { provider: r?.provider, model: r?.model ?? undefined }; };
      const a = await aiAnalyseCluster(service, ai, admin.email, b.clusterId, meta);
      await writeAudit(service, { actorEmail: admin.email, action: 'ai_analysis', entity: 'feedback_cluster', entityId: b.clusterId, detail: { provider: a.provider } });
      return NextResponse.json({ data: a, error: null });
    }
    if (b.action === 'decide') {
      const decision = typeof b.decision === 'string' && b.decision in FB_DECISIONS ? b.decision : undefined;
      const moveTo = typeof b.moveTo === 'string' && (FB_STATUSES as readonly string[]).includes(b.moveTo) ? b.moveTo : undefined;
      const note = typeof b.note === 'string' ? b.note.slice(0, 2000) : undefined;
      const r = await decideCluster(service, { clusterId: b.clusterId, decision, moveTo, note, tested: b.tested === true, actor: admin.email });
      if (!r.ok) return NextResponse.json({ data: null, error: r.error }, { status: 400 });
      if (decision === 'defer') await setDeferUntil(service, b.clusterId, typeof b.deferUntil === 'string' ? b.deferUntil : undefined);
      await writeAudit(service, { actorEmail: admin.email, action: 'decide', entity: 'feedback_cluster', entityId: b.clusterId, detail: { to: r.status, tested: b.tested === true } });
      return NextResponse.json({ data: r, error: null });
    }
    return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
