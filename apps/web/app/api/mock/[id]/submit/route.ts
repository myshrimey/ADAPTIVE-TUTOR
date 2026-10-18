import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { submitMockExam } from '@adaptive-tutor/core';
import { saveMockReport } from '@/lib/reports';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    const result = await submitMockExam(createServiceClient(), studentId, id, body.answers, body.auto === true);
    await saveMockReport(studentId, id, result); // saved with date and time for the student and (separately) for linked adults
    return NextResponse.json({ data: result, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
