import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { saveMockAnswers } from '@adaptive-tutor/core';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    const out = await saveMockAnswers(createServiceClient(), studentId, id, body.answers);
    return NextResponse.json({ data: out, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
