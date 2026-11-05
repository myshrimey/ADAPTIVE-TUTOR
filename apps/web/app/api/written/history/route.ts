import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { listWrittenHistory, publicError } from '@adaptive-tutor/core';

export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const supabase = await createServerClient(); // RLS: the student's own attempts only
    return NextResponse.json({ data: { history: await listWrittenHistory(supabase, studentId) }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err) }, { status: 400 });
  }
}
