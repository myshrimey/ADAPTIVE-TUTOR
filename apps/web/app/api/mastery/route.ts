import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';

export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('mastery_states')
      .select('skill_id, score, band, component_scores, updated_at, skills(name, slug, topic_id)')
      .eq('student_id', studentId);
    if (error) throw error;

    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
