import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { analyseNewFeedback, decideCluster, clusterMessages, writeAudit, FB_DECISIONS, FB_STATUSES } from '@adaptive-tutor/core';

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    if (b.action === 'analyse') return NextResponse.json({ data: await analyseNewFeedback(service), error: null });
    if (typeof b.clusterId !== 'string' || !UUID.test(b.clusterId)) throw new Error('Choose a group.');
    if (b.action === 'messages') return NextResponse.json({ data: await clusterMessages(service, b.clusterId), error: null });
    if (b.action === 'decide') {
      const decision = typeof b.decision === 'string' && b.decision in FB_DECISIONS ? b.decision : undefined;
      const moveTo = typeof b.moveTo === 'string' && (FB_STATUSES as readonly string[]).includes(b.moveTo) ? b.moveTo : undefined;
      const note = typeof b.note === 'string' ? b.note.slice(0, 2000) : undefined;
      const r = await decideCluster(service, { clusterId: b.clusterId, decision, moveTo, note, tested: b.tested === true, actor: admin.email });
      if (!r.ok) return NextResponse.json({ data: null, error: r.error }, { status: 400 });
      await writeAudit(service, { actorEmail: admin.email, action: 'decide', entity: 'feedback_cluster', entityId: b.clusterId, detail: { to: r.status, tested: b.tested === true } });
      return NextResponse.json({ data: r, error: null });
    }
    return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
