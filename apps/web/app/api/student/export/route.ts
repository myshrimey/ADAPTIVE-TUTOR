import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';

// The signed-in student/parent downloads a copy of the data Sahayak holds for this student.
// Read through the session (RLS) client, so it can only ever contain this student's own rows.
const BY_STUDENT = [
  'student_profile_details', 'student_academic_history', 'student_access', 'learning_profiles', 'learning_goals',
  'learning_sessions', 'mastery_states', 'question_attempts', 'misconceptions', 'session_checkins', 'recovery_events',
  'mock_exams', 'written_attempts', 'diagnostic_attempts', 'learning_events', 'pilot_payments', 'feedback',
];

export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), note: 'Copy of the learning data Sahayak holds for this student. Sign-in details, device records and internal cost logs are not included.' };
    const unreadable: string[] = [];
    const { data: student } = await supabase.from('students').select('id, display_name, grade, date_of_birth, created_at').eq('id', studentId).maybeSingle();
    out.student = student;
    for (const t of BY_STUDENT) {
      const { data, error } = await supabase.from(t).select('*').eq('student_id', studentId).limit(20000);
      if (error) unreadable.push(t); else out[t] = data;
    }
    const sessionIds = ((out.learning_sessions as any[]) ?? []).map((s) => s.id);
    if (sessionIds.length) {
      const { data } = await supabase.from('messages').select('*').in('session_id', sessionIds).limit(50000);
      out.messages = data;
    }
    const attemptIds = ((out.diagnostic_attempts as any[]) ?? []).map((s) => s.id);
    if (attemptIds.length) {
      const { data } = await supabase.from('diagnostic_answers').select('*').in('diagnostic_attempt_id', attemptIds).limit(50000);
      out.diagnostic_answers = data;
    }
    if (unreadable.length) out.not_included = unreadable;
    return new NextResponse(JSON.stringify(out, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="sahayak-my-data.json"', 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}
