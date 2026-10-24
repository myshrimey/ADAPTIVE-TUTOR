import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getContributor } from '@/lib/contributor';
import { contributeQuestion } from '@adaptive-tutor/core';

// An approved teacher, active tutor or centre, or an admin adds a question. It is saved as "needs review" with their name on it.
export async function POST(request: Request) {
  try {
    const who = await getContributor();
    if (!who) return NextResponse.json({ data: null, error: 'not_allowed' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const r = await contributeQuestion(createServiceClient(), who, body);
    return NextResponse.json({ data: r, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
