import { NextResponse } from 'next/server';
import { createServiceClient, createServerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { getContributor } from '@/lib/contributor';
import { reviewQuestion, setRequestStatus, contributeQuestion, fulfilRequestWithAI, createAIProvider, recordAIAttempt, writeAudit } from '@adaptive-tutor/core';

export const maxDuration = 60;

// Admin only: review a question, upload one, handle a request. Every change is written to the audit log.
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    if (b.action === 'review') {
      await reviewQuestion(service, admin.email, String(b.table), String(b.id), b.decision, b.note);
      await writeAudit(service, { actorEmail: admin.email, action: 'review_' + b.decision, entity: String(b.table), entityId: String(b.id) });
      return NextResponse.json({ data: { ok: true }, error: null });
    }
    if (b.action === 'upload') {
      const who = await getContributor();
      const r = await contributeQuestion(service, { userId: who?.userId ?? null, role: 'admin', email: admin.email }, b.question);
      await writeAudit(service, { actorEmail: admin.email, action: 'upload', entity: r.table, entityId: r.id });
      return NextResponse.json({ data: r, error: null });
    }
    if (b.action === 'request_status') {
      await setRequestStatus(service, admin.email, String(b.id), b.status);
      await writeAudit(service, { actorEmail: admin.email, action: 'request_' + b.status, entity: 'question_requests', entityId: String(b.id) });
      return NextResponse.json({ data: { ok: true }, error: null });
    }
    if (b.action === 'request_ai') {
      const ai = createAIProvider({ tier: 'free', service, onAttempt: recordAIAttempt(service, null, 'free') });
      const r = await fulfilRequestWithAI(service, ai, String(b.id), 45_000);
      await writeAudit(service, { actorEmail: admin.email, action: 'request_ai', entity: 'question_requests', entityId: String(b.id), detail: { made: r.made } });
      return NextResponse.json({ data: r, error: null });
    }
    return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
