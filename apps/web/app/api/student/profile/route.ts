import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';

export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();

    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id, display_name, grade')
      .eq('id', studentId)
      .single();
    if (studentErr || !student) throw studentErr ?? new Error('student_not_found');

    const { data: profile } = await supabase
      .from('learning_profiles')
      .select('onboarding_completed, preferred_pace')
      .eq('student_id', studentId)
      .maybeSingle();

    return NextResponse.json({
      data: {
        studentId: student.id,
        displayName: student.display_name,
        grade: student.grade,
        onboardingCompleted: profile?.onboarding_completed ?? false,
      },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
