import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { answerBaseline, qualifyReferralsForStudent } from '@adaptive-tutor/core';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    if (typeof body.sessionId !== 'string' || body.answer === undefined) return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });
    const service = createServiceClient();
    const r = await answerBaseline(service, studentId, body.sessionId, body.answer, { hintUsed: body.hintUsed === true });
    if (r.finished) { try { await qualifyReferralsForStudent(service, studentId, r.finished.baseline.questionsAsked); } catch { /* referral never blocks a result */ } }
    return NextResponse.json({ data: r, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
