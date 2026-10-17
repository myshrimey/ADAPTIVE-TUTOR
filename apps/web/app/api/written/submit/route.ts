import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { assertAccess, planAllows, markWrittenAnswer } from '@adaptive-tutor/core';
import { aiForStudent } from '@/lib/ai';

// Marks one written answer with AI and saves it. Student id comes from the session only.
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    if (!body.questionId || typeof body.questionId !== 'string') return NextResponse.json({ data: null, error: 'missing_question' }, { status: 400 });
    const service = createServiceClient();
    const access = await assertAccess(service, studentId);
    if (!planAllows(access.planCode, 'mock_exams')) throw new Error('plan_upgrade_required');
    const result = await markWrittenAnswer(service, await aiForStudent(studentId), studentId, body.questionId, body.answer);
    return NextResponse.json({ data: result, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
