import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { joinClassBoard, leaveBoards, suggestNickname } from '@adaptive-tutor/core';
import { engineCtx } from '@/lib/engagement';

export const runtime = 'nodejs';
// Optional leaderboard: a student chooses a nickname to join, or leaves. Nothing else about the student is shared.
export async function POST(req: Request) {
  try {
    const studentId = await getCurrentStudentId(); const b = await req.json().catch(() => ({})); const service = createServiceClient();
    if (b.action === 'suggest') return NextResponse.json({ data: { nickname: suggestNickname() }, error: null });
    if (b.action === 'join') { const { settings } = await engineCtx(service); return NextResponse.json({ data: { nickname: await joinClassBoard(service, studentId, b.nickname, settings) }, error: null }); }
    if (b.action === 'leave') { await leaveBoards(service, studentId); return NextResponse.json({ data: { ok: true }, error: null }); }
    throw new Error('Unknown action.');
  } catch (err: any) { return NextResponse.json({ data: null, error: String(err?.message ?? 'failed').slice(0, 140) }, { status: 400 }); }
}
