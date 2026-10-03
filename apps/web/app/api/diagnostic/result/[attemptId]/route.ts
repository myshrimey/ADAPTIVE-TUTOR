import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const supabase = await createServerClient();
    const { data: attempt, error } = await supabase
      .from('diagnostic_attempts')
      .select('id, status, result, started_at, completed_at')
      .eq('id', attemptId)
      .single();
    if (error || !attempt) throw error ?? new Error('attempt_not_found');

    if (attempt.status !== 'completed') {
      return NextResponse.json({ data: null, error: 'diagnostic_not_completed' }, { status: 400 });
    }

    return NextResponse.json({ data: attempt.result, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
