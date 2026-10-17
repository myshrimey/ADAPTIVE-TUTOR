import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';

// Chapter list for the chapter-check picker. Curriculum names are not private, but we still
// require a signed-in student.
export async function GET(request: Request) {
  try {
    await getCurrentStudentId();
    const subjectId = new URL(request.url).searchParams.get('subjectId');
    if (!subjectId) return NextResponse.json({ data: null, error: 'missing_subject' }, { status: 400 });
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('chapters').select('id, name, sequence').eq('subject_id', subjectId).order('sequence');
    if (error) throw error;
    return NextResponse.json({ data: { chapters: (data ?? []).map((c: any) => ({ id: c.id, name: c.name })) }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
