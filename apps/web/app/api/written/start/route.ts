import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { assertAccess, planAllows, pickWrittenQuestions } from '@adaptive-tutor/core';

// Picks written-answer questions. The answer key is never returned. Paid plans only (each answer is marked by AI).
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    if (!body.subjectId || typeof body.subjectId !== 'string') return NextResponse.json({ data: null, error: 'missing_subject' }, { status: 400 });
    const service = createServiceClient();
    const access = await assertAccess(service, studentId);
    if (!planAllows(access.planCode, 'mock_exams')) throw new Error('plan_upgrade_required');
    const questions = await pickWrittenQuestions(service, studentId, body.subjectId);
    return NextResponse.json({ data: { questions }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
