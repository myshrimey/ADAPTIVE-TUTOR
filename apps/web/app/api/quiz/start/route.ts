import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { generateSkillQuiz, assertAccess } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    const { skillId } = body as { skillId?: string };
    if (!skillId) {
      return NextResponse.json({ data: null, error: 'missing_skill_id' }, { status: 400 });
    }

    const supabase = await createServerClient();
    await assertAccess(supabase, studentId);
    const questions = await generateSkillQuiz(supabase, skillId);
    return NextResponse.json({ data: { questions }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
