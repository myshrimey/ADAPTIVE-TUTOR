import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { useLimitedFeature } from '@adaptive-tutor/core';

// Counts one use of a limited free feature (voice read-aloud) for the signed-in student. The student comes from the session.
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const b = await request.json().catch(() => ({}));
    if (b.feature !== 'voice') return NextResponse.json({ data: null, error: 'unknown_feature' }, { status: 400 });
    const r = await useLimitedFeature(createServiceClient(), studentId, 'voice');
    return NextResponse.json({ data: r, error: null });
  } catch { return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 }); }
}
