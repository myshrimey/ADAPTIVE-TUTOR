import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import {
  getStudentProfileDetails,
  upsertStudentProfileDetails,
  listAcademicHistory,
  upsertAcademicHistory,
} from '@adaptive-tutor/core';

// A student can only ever read/write their own profile — getCurrentStudentId()
// resolves the row from the signed-in session, and RLS (migration
// 0007_student_profile.sql) backs that up at the database level too.
export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();

    const { data: student } = await supabase.from('students').select('display_name, grade').eq('id', studentId).single();
    const [details, academicHistory] = await Promise.all([
      getStudentProfileDetails(supabase, studentId),
      listAcademicHistory(supabase, studentId),
    ]);

    return NextResponse.json({
      data: {
        displayName: student?.display_name ?? null,
        grade: student?.grade ?? null,
        details,
        academicHistory,
      },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    const { details, academicHistory } = body as { details?: Record<string, unknown>; academicHistory?: unknown[] };

    const supabase = await createServerClient();
    const savedDetails = await upsertStudentProfileDetails(supabase, studentId, details ?? {});
    if (Array.isArray(academicHistory)) {
      await upsertAcademicHistory(supabase, studentId, academicHistory as any);
    }
    const savedHistory = await listAcademicHistory(supabase, studentId);

    return NextResponse.json({ data: { details: savedDetails, academicHistory: savedHistory }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
