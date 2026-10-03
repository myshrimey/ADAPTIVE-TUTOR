import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { loadCurriculum } from '@adaptive-tutor/core';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const board = searchParams.get('board') ?? 'CBSE';
    const klass = searchParams.get('class') ?? '10';

    const supabase = await createServerClient();
    const curriculum = await loadCurriculum(supabase, board, klass);

    return NextResponse.json({ data: curriculum, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
