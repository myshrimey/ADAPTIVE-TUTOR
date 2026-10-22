import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { assertAccess, startChallenge, answerChallenge, featureOn, type ChallengeMode } from '@adaptive-tutor/core';
import { engineCtx } from '@/lib/engagement';
import { aiForStudent } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;
const MODES: ChallengeMode[] = ['practice', 'challenge', 'mixed', 'boss', 'weakness', 'mistake_review', 'comeback', 'daily', 'org'];
const uuid = (v: unknown) => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);

// Start a round or answer one question. The student is the signed-in student only; answer keys are returned only after an answer.
export async function POST(req: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const b = await req.json().catch(() => ({}));
    const service = createServiceClient();
    if (b.action === 'start') {
      await assertAccess(await createServerClient(), studentId);
      if (!MODES.includes(b.mode)) throw new Error('Unknown challenge type.');
      const ctx = await engineCtx(service);
      const feat = b.mode === 'boss' ? 'boss' : b.mode === 'daily' ? 'daily_challenge' : null;
      if (feat && !featureOn(ctx.settings, studentId, feat as any)) throw new Error('This is not switched on yet.');
      const r = await startChallenge(service, studentId, { mode: b.mode, subjectId: uuid(b.subjectId), skillId: uuid(b.skillId), chapterId: uuid(b.chapterId), category: typeof b.category === 'string' && /^[a-z]{3,12}$/.test(b.category) ? b.category : undefined, sourceAttemptId: uuid(b.sourceAttemptId), orgChallengeId: uuid(b.orgChallengeId) }, ctx);
      return NextResponse.json({ data: r, error: null });
    }
    if (b.action === 'answer') {
      const id = uuid(b.attemptId); if (!id) throw new Error('Missing round.');
      const ctx = await engineCtx(service, await aiForStudent(studentId));
      const r = await answerChallenge(service, studentId, id, b.answer, typeof b.seconds === 'number' ? b.seconds : null, ctx);
      return NextResponse.json({ data: r, error: null });
    }
    throw new Error('Unknown action.');
  } catch (err: any) {
    const m = String(err?.message ?? 'failed');
    return NextResponse.json({ data: null, error: m === 'unauthenticated' ? 'unauthenticated' : m.slice(0, 160) }, { status: m === 'unauthenticated' ? 401 : 400 });
  }
}
