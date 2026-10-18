import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { getPaperView } from '@adaptive-tutor/core';

// The printable paper for the signed-in student's own blueprint exam. Never contains an answer key.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const studentId = await getCurrentStudentId();
    const paper = await getPaperView(createServiceClient(), studentId, id);
    return NextResponse.json({ data: paper, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
