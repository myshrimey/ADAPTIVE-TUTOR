import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { startBaseline, assertAccess, assertSubjectAllowed, registerSubject, languagesForStudent } from '@adaptive-tutor/core';
import { kickBankGrowth } from '@/lib/bank-growth';

export const maxDuration = 60;

// Starts (or resumes) the adaptive baseline check. The student id always comes from the session.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const access = await assertAccess(supabase, studentId);
    const subjectId = typeof body.subjectId === 'string' ? body.subjectId : null;
    if (!subjectId) return NextResponse.json({ data: null, error: 'missing_subject' }, { status: 400 });
    await assertSubjectAllowed(supabase, studentId, [subjectId], access.subjectLimit);
    await registerSubject(supabase, studentId, subjectId, { activate: true });
    const service = createServiceClient();
    let languageMismatch = false;
    try { const l = await languagesForStudent(service, studentId, null); languageMismatch = (l as any).question && (l as any).question !== 'en'; } catch { /* default: no mismatch */ }
    const r = await startBaseline(service, studentId, subjectId, { mini: body.mini === true, languageMismatch });
    kickBankGrowth(subjectId); // every session owes its subject new questions (at least 10)
    return NextResponse.json({ data: r, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
