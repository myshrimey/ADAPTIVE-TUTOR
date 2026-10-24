import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { cleanRegion } from '@adaptive-tutor/core';

// A signed-in person sets their own country, timezone and currency (optional; used for support and future country pricing).
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'not_signed_in' }, { status: 401 });
    const b = await request.json().catch(() => ({}));
    const r = cleanRegion(b);
    const { error } = await createServiceClient().from('users').update({ country: r.country, timezone: r.timezone, currency: r.currency }).eq('auth_user_id', user.id);
    if (error) throw error;
    return NextResponse.json({ data: r, error: null });
  } catch (e: any) { return NextResponse.json({ data: null, error: e?.message === 'bad_region' ? 'bad_region' : 'save_failed' }, { status: 400 }); }
}
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: 'not_signed_in' }, { status: 401 });
  const { data } = await createServiceClient().from('users').select('country, timezone, currency').eq('auth_user_id', user.id).maybeSingle();
  return NextResponse.json({ data: data ?? {}, error: null });
}
