import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { loadReviewPlan, reviewStep, loadSettings } from '@adaptive-tutor/core';

export const maxDuration = 30;
const UUID = /^[0-9a-f-]{36}$/i;

// GET: today's revision list. POST {competencyId, answer?}: one question, or the marking of one.
export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    const s = await loadSettings(service);
    const plan = await loadReviewPlan(service, studentId, s.boards.board1_date ?? null);
    return NextResponse.json({ data: plan, error: null });
  } catch (err: any) { return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 }); }
}
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const b = await request.json().catch(() => ({}));
    if (typeof b.competencyId !== 'string' || !UUID.test(b.competencyId)) throw new Error('Choose a skill.');
    const a = b.answer && typeof b.answer.itemTable === 'string' && typeof b.answer.itemId === 'string' && UUID.test(b.answer.itemId) ? { itemTable: b.answer.itemTable, itemId: b.answer.itemId, answer: b.answer.answer } : undefined;
    return NextResponse.json({ data: await reviewStep(createServiceClient(), studentId, b.competencyId, a), error: null });
  } catch (err: any) { return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 }); }
}
