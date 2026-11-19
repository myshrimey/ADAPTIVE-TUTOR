import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { recordConfidenceAfter, publicError } from '@adaptive-tutor/core';

// Saves the end-of-session confidence (0-10) on the caller's own check-in row.
// v129: saved with the server key and filtered by the student id from the session
// (the student's own write rule on session_checkins is read-only from migration 0066).
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.sessionId || typeof body.sessionId !== 'string') {
      return NextResponse.json({ data: null, error: 'missing_session' }, { status: 400 });
    }
    const studentId = await getCurrentStudentId(); // must be signed in as a student; the id comes from the session
    await recordConfidenceAfter(createServiceClient(), studentId, body.sessionId, Number(body.confidenceAfter));
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err) }, { status: 400 });
  }
}
