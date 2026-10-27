import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getPortalUser } from '@/lib/portal';
import { createBatch, setBatchMember, archiveBatch, createIntervention, updateIntervention } from '@adaptive-tutor/core';

// Tutors and centres only, and only when the account is active. Every id is checked against the caller's own active student links on the server.
export async function POST(request: Request) {
  try {
    const me = await getPortalUser();
    if (!me || (me.role !== 'tutor' && me.role !== 'centre') || me.status !== 'active') return NextResponse.json({ data: null, error: 'not_authorized' }, { status: 403 });
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    switch (b.action) {
      case 'create_batch': return NextResponse.json({ data: await createBatch(service, me.userId, b.name), error: null });
      case 'add_member': await setBatchMember(service, me.userId, b.batchId, b.studentId, true); break;
      case 'remove_member': await setBatchMember(service, me.userId, b.batchId, b.studentId, false); break;
      case 'archive_batch': await archiveBatch(service, me.userId, b.batchId); break;
      case 'create_intervention': return NextResponse.json({ data: await createIntervention(service, me.userId, { studentId: b.studentId, skillId: b.skillId, problem: b.problem, evidence: b.evidence, action: b.plan }), error: null });
      case 'update_intervention': await updateIntervention(service, me.userId, b.id, b.status); break;
      default: return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
    }
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) { return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 }); }
}
