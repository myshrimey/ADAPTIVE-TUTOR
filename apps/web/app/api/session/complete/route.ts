import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { completeSession } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    await getCurrentStudentId(); // auth check; ownership of the session itself is enforced by RLS on the update inside completeSession
    const body = await request.json();
    const { sessionId } = body as { sessionId: string };
    if (!sessionId) return NextResponse.json({ data: null, error: 'missing_required_fields' }, { status: 400 });

    const supabase = await createServerClient();
    const summary = await completeSession(supabase, sessionId);

    return NextResponse.json({ data: summary, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
