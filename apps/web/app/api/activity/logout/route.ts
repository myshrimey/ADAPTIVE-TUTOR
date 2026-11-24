import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { recordActivity } from '@adaptive-tutor/core';

// v138: the browser calls this just before signing out so the sign-out is recorded. Best effort: it never blocks signing out.
export async function POST() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const service = createServiceClient();
      const { data: row } = await service.from('users').select('id, role').eq('auth_user_id', user.id).maybeSingle();
      if (row) await recordActivity(service, { userId: (row as any).id, type: 'logout', role: (row as any).role });
    }
  } catch { /* never blocks signing out */ }
  return NextResponse.json({ data: { ok: true }, error: null });
}
