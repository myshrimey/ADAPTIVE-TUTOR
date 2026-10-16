import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { startMockExam, assertAccess, planAllows } from '@adaptive-tutor/core';

// Starts (or resumes) a timed mock. The student id comes from the session; the
// service client is used only so the student cannot write their own deadline/score.
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    if (!body.subjectId || typeof body.subjectId !== 'string') {
      return NextResponse.json({ data: null, error: 'missing_subject' }, { status: 400 });
    }
    const service = createServiceClient();
    const access = await assertAccess(service, studentId);
    // Timed mock exams are part of the paid plans.
    if (!planAllows(access.planCode, 'mock_exams')) throw new Error('plan_upgrade_required');
    const exam = await startMockExam(service, studentId, body.subjectId);
    return NextResponse.json({ data: exam, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
