import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { engineCtx } from '@/lib/engagement';
import { answerStretch, afterActivity } from '@adaptive-tutor/core';

export const maxDuration = 60;

// Marks one Challenge question. Writes only stretch_attempts (+ badges). Never mastery, readiness or XP.
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    if (typeof body.questionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.questionId) || body.answer === undefined) return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });
    const service = createServiceClient();
    const r = await answerStretch(service, studentId, body.questionId, body.answer, body.seconds ?? null, async () => {
      const act = await afterActivity(service, studentId, await engineCtx(service));
      return act.unlocked.filter((d) => d.code.startsWith('stretch_')).map((d) => ({ code: d.code, title: d.title, description: d.description }));
    });
    return NextResponse.json({ data: r, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
