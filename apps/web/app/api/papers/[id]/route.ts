import { NextResponse } from 'next/server';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { deletePreviousPaper } from '@adaptive-tutor/core';

// RLS (migrations/0006_previous_papers.sql) already restricts the delete to
// whoever uploaded that specific row — getCurrentStudentId() here is just
// an early auth check so a signed-out request fails with a clear error
// instead of a silent "0 rows deleted".
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getCurrentStudentId();
    const { id } = await params;

    const supabase = await createServerClient();
    await deletePreviousPaper(supabase, id);
    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: 400 });
  }
}
