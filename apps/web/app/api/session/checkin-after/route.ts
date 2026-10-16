import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { recordConfidenceAfter } from '@adaptive-tutor/core';

// Saves the end-of-session confidence (0-10) on the caller's own check-in row.
// Session-bound client, so RLS (session_checkins_owner) guarantees a student
// can only ever update their own row.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json({ data: null, error: 'missing_session' }, { status: 400 });
    }
    await getCurrentStudentId(); // must be signed in as a student
    const supabase = await createServerClient();
    await recordConfidenceAfter(supabase, body.sessionId, Number(body.confidenceAfter));
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
