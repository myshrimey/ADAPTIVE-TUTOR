import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { counterSelfCheck } from '@adaptive-tutor/core';

// Admin only: can the server read and write the traffic table? Returns the database's own error text if not.
export async function POST() {
  try {
    await requireAdmin();
    const r = await counterSelfCheck(createServiceClient());
    return NextResponse.json({ data: { ...r, serviceKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
