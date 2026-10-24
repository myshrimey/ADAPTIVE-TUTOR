import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { saveStretchSettings, fillStretchForSubject, createAIProvider, recordAIAttempt, writeAudit } from '@adaptive-tutor/core';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    if (b.action === 'save') {
      const v = await saveStretchSettings(service, b.settings);
      await writeAudit(service, { actorEmail: admin.email, action: 'save', entity: 'stretch', detail: { enabled: v.enabled, allowUnreviewed: v.allowUnreviewed, unlockScore: v.unlockScore, dailyLimit: v.dailyLimit } });
      return NextResponse.json({ data: v, error: null });
    }
    if (b.action === 'fill') {
      if (typeof b.subjectId !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.subjectId)) throw new Error('Choose a subject.');
      const ai = createAIProvider({ tier: 'free', service, onAttempt: recordAIAttempt(service, null, 'free') });
      const r = await fillStretchForSubject(service, ai, b.subjectId, Number(b.count) || 5, typeof b.style === 'string' ? b.style : undefined, 50_000);
      await writeAudit(service, { actorEmail: admin.email, action: 'fill', entity: 'stretch', detail: { made: r.made, failed: r.failed } });
      return NextResponse.json({ data: r, error: null });
    }
    return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
