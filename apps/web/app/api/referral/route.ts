import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { referralOverview } from '@adaptive-tutor/core';

// Any signed-in person (student, parent, teacher, tutor, centre): their own invite link and counts. Counts only; no names.
export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'not_signed_in' }, { status: 401 });
    const service = createServiceClient();
    const { data: u } = await service.from('users').select('id, role').eq('auth_user_id', user.id).maybeSingle();
    if (!u) return NextResponse.json({ data: null, error: 'no_account' }, { status: 404 });
    const o = await referralOverview(service, u.id);
    return NextResponse.json({ data: { ...o, role: u.role }, error: null });
  } catch (e: any) { return NextResponse.json({ data: null, error: 'referral_failed' }, { status: 500 }); }
}
