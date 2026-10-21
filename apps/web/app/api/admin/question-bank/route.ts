import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { createAIProvider, recordAIAttempt, requestBankGrowth, runBankGrowth } from '@adaptive-tutor/core';

export const maxDuration = 60;

// Admin-only: owe a subject N more questions (default 0 = just continue what is owed) and write as many as fit in ~45 s.
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const subjectId = String(body.subjectId ?? '');
    const add = Math.min(200, Math.max(0, Number(body.add) || 0));
    const service = createServiceClient();
    const { data: subj } = await service.from('subjects').select('id').eq('id', subjectId).maybeSingle();
    if (!subj) return NextResponse.json({ data: null, error: 'subject_not_found' }, { status: 400 });
    if (add > 0) await requestBankGrowth(service, subjectId, add);
    const r = await runBankGrowth(service, createAIProvider({ tier: 'free', service, onAttempt: recordAIAttempt(service, null, 'free') }), subjectId, 45_000);
    return NextResponse.json({ data: r, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
