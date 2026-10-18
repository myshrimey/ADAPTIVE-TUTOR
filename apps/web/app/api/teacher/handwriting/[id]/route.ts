import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireApprovedTeacher } from '@/lib/teacher';
import { getTeacherItem, submitTeacherScore } from '@adaptive-tutor/core';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireApprovedTeacher();
    const { id } = await ctx.params;
    return NextResponse.json({ data: await getTeacherItem(createServiceClient(), id), error: null });
  } catch (err: any) {
    const forbidden = ['not_a_teacher', 'teacher_not_approved', 'unauthenticated'].includes(err.message);
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: forbidden ? 403 : 400 });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const teacher = await requireApprovedTeacher();
    const { id } = await ctx.params;
    const body = await request.json().catch(() => ({}));
    await submitTeacherScore(createServiceClient(), teacher.userId, id, Number(body.score), String(body.note ?? ''));
    return NextResponse.json({ data: { saved: true }, error: null });
  } catch (err: any) {
    const forbidden = ['not_a_teacher', 'teacher_not_approved', 'unauthenticated'].includes(err.message);
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: forbidden ? 403 : 400 });
  }
}
