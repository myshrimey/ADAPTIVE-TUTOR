import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getContributor } from '@/lib/contributor';
import { createQuestionRequest } from '@adaptive-tutor/core';

export async function POST(request: Request) {
  try {
    const who = await getContributor();
    if (!who || !who.userId) return NextResponse.json({ data: null, error: 'not_allowed' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const r = await createQuestionRequest(createServiceClient(), who as any, body);
    return NextResponse.json({ data: r, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
