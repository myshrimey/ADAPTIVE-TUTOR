import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { redeemReferralCode } from '@adaptive-tutor/core';
import { engineCtx } from '@/lib/engagement';

export const runtime = 'nodejs';
// A student enters someone else's invite code once. No reward, score or XP is created here.
export async function POST(req: Request) {
  try {
    const studentId = await getCurrentStudentId(); const b = await req.json().catch(() => ({})); const service = createServiceClient();
    const ctx = await engineCtx(service);
    await redeemReferralCode(service, studentId, String(b.code ?? ''), ctx.settings);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) { const m = String(err?.message ?? 'failed'); return NextResponse.json({ data: null, error: m === 'unauthenticated' ? 'unauthenticated' : m.slice(0, 160) }, { status: m === 'unauthenticated' ? 401 : 400 }); }
}
