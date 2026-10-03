import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';

export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('learning_sessions')
      .select('id, skill_id, status, starting_mastery, ending_mastery, summary, started_at, completed_at, skills(name)')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
