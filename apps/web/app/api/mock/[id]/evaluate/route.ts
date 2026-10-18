import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { aiForStudent } from '@/lib/ai';
import { evaluateHandwrittenPaper, getHandwritingConsent, assertAccess, planAllows } from '@adaptive-tutor/core';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Reads the uploaded pages and stores AI-suggested marks (some go to a teacher). Safe to press again.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    const access = await assertAccess(service, studentId);
    if (!planAllows(access.planCode, 'mock_exams')) throw new Error('plan_upgrade_required');
    const consent = await getHandwritingConsent(service, studentId);
    if (!consent.current) return NextResponse.json({ data: null, error: 'consent_required' }, { status: 403 });
    const ai = await aiForStudent(studentId);
    if (!ai.supportsImages) return NextResponse.json({ data: null, error: 'image_reading_unavailable' }, { status: 503 });
    const out = await evaluateHandwrittenPaper(service, ai, studentId, id);
    return NextResponse.json({ data: out, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}
