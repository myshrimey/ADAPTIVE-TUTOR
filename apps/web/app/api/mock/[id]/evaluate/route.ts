import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { aiForStudent } from '@/lib/ai';
import { evaluateHandwrittenPaper, getHandwritingConsent, assertAccess, planAllows, checkHandwritten, chargeHandwritten, loadSettings, recordCommerceEvent } from '@adaptive-tutor/core';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Reads the uploaded pages and stores AI-suggested marks (some go to a teacher). Safe to press again.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    const access = await assertAccess(service, studentId);
    if (!planAllows(access.planCode, 'mock_exams')) throw new Error('plan_upgrade_required');
    const consent = await getHandwritingConsent(service, studentId);
    if (!consent.current) return NextResponse.json({ data: null, error: 'consent_required' }, { status: 403 });
    const ai = await aiForStudent(studentId);
    if (!ai.supportsImages) return NextResponse.json({ data: null, error: 'image_reading_unavailable' }, { status: 503 });
    // Credit check BEFORE any AI work; the credit is taken only AFTER a successful evaluation (and only once per paper).
    const gate = await checkHandwritten(service, studentId, id);
    if (!gate.ok) return NextResponse.json({ data: { balance: gate.balance }, error: 'no_credits' }, { status: 402 });
    // Retry control: a paper can be evaluated only a few times.
    const settings = await loadSettings(service);
    const { data: ex } = await service.from('mock_exams').select('eval_runs').eq('id', id).eq('student_id', studentId).single();
    if ((ex?.eval_runs ?? 0) >= settings.handwritten.max_runs) return NextResponse.json({ data: null, error: 'too_many_runs' }, { status: 429 });
    await service.from('mock_exams').update({ eval_runs: (ex?.eval_runs ?? 0) + 1 }).eq('id', id).eq('student_id', studentId);
    const out = await evaluateHandwrittenPaper(service, ai, studentId, id);
    await chargeHandwritten(service, studentId, id);
    await recordCommerceEvent(service, 'mock_completed', { studentId, meta: { examId: id, marked: out.marked, needsTeacher: out.needsTeacher, unreadable: out.unreadable } });
    return NextResponse.json({ data: out, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}
