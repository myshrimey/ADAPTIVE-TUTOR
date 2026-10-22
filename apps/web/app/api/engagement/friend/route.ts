import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { assertAccess, createFriendChallenge, joinFriendChallenge, cancelFriendChallenge } from '@adaptive-tutor/core';
import { engineCtx } from '@/lib/engagement';

export const runtime = 'nodejs';
const uuid = (v: unknown) => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
// Friend challenge actions for the SIGNED-IN student only (create, join with a code, cancel). The server decides everything else.
export async function POST(req: Request) {
  try {
    const studentId = await getCurrentStudentId(); const b = await req.json().catch(() => ({})); const service = createServiceClient();
    await assertAccess(await createServerClient(), studentId);
    const ctx = await engineCtx(service);
    if (b.action === 'create') { const sid = uuid(b.subjectId); if (!sid) throw new Error('Pick a subject.'); return NextResponse.json({ data: await createFriendChallenge(service, studentId, sid, ctx), error: null }); }
    if (b.action === 'join') return NextResponse.json({ data: await joinFriendChallenge(service, studentId, String(b.code ?? ''), ctx.settings), error: null });
    if (b.action === 'cancel') { const id = uuid(b.id); if (!id) throw new Error('Missing challenge.'); await cancelFriendChallenge(service, studentId, id); return NextResponse.json({ data: { ok: true }, error: null }); }
    throw new Error('Unknown action.');
  } catch (err: any) { const m = String(err?.message ?? 'failed'); return NextResponse.json({ data: null, error: m === 'unauthenticated' ? 'unauthenticated' : m.slice(0, 160) }, { status: m === 'unauthenticated' ? 401 : 400 }); }
}
