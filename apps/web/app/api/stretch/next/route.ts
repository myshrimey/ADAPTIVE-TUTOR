import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { aiForStudent } from '@/lib/ai';
import { nextStretchQuestion } from '@adaptive-tutor/core';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    const str = (v: unknown) => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);
    let ai; try { ai = await aiForStudent(studentId); } catch { ai = undefined; }
    const r = await nextStretchQuestion(createServiceClient(), studentId, { skillId: str(body.skillId), subjectId: str(body.subjectId), style: typeof body.style === 'string' ? body.style : undefined }, ai);
    return NextResponse.json({ data: r, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
