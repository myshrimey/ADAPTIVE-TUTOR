import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { loadSubjectCatalogue, registerSubject, assertAccess, assertSubjectAllowed } from '@adaptive-tutor/core';

// GET  -> the subject catalogue with readiness status + which ones this student registered.
// POST -> { subjectId, action: 'register' | 'activate' }. The student id is always
//         derived from the signed-in session, never taken from the request body.
export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const subjects = await loadSubjectCatalogue(supabase, studentId);
    return NextResponse.json({ data: { subjects }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.subjectId || typeof body.subjectId !== 'string') {
      return NextResponse.json({ data: null, error: 'missing_subject' }, { status: 400 });
    }
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const access = await assertAccess(supabase, studentId);
    await assertSubjectAllowed(supabase, studentId, [body.subjectId], access.subjectLimit);
    await registerSubject(supabase, studentId, body.subjectId, { activate: body.action === 'activate' });
    const subjects = await loadSubjectCatalogue(supabase, studentId);
    return NextResponse.json({ data: { subjects }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
