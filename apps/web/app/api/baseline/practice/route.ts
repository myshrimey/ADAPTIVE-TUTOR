import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { practiceStep } from '@adaptive-tutor/core';

export const maxDuration = 60;

// Practice for one step of the student's learning path. The answer key never leaves the server.
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    if (typeof body.nodeId !== 'string') return NextResponse.json({ data: null, error: 'missing_step' }, { status: 400 });
    const answer = typeof body.itemId === 'string' && typeof body.itemTable === 'string' && body.answer !== undefined ? { itemTable: body.itemTable, itemId: body.itemId, answer: body.answer } : undefined;
    const r = await practiceStep(createServiceClient(), studentId, body.nodeId, answer);
    return NextResponse.json({ data: r, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
