import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { saveSubjectRequest } from '@adaptive-tutor/core';

// A signed-in family tells us which subject / board / class they want next. The user id comes from the session, never from the body.
export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'Please sign in first.' }, { status: 401 });
    const service = createServiceClient();
    const { data: u } = await service.from('users').select('id').eq('auth_user_id', user.id).maybeSingle();
    await saveSubjectRequest(service, u?.id ?? null, await req.json());
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) { return NextResponse.json({ data: null, error: String(err?.message ?? 'error').slice(0, 120) }, { status: 400 }); }
}
