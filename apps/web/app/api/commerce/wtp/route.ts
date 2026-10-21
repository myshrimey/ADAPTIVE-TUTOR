import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { nextWtpQuestion, loadSettings, recordCommerceEvent } from '@adaptive-tutor/core';

// Willingness-to-pay: GET ?feature= returns the price to ask (or null = do not ask). POST records the answer.
export async function GET(request: Request) {
  try {
    const { data: { user } } = await (await createServerClient()).auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: null });
    const feature = String(new URL(request.url).searchParams.get('feature') ?? '');
    return NextResponse.json({ data: await nextWtpQuestion(createServiceClient(), user.id, feature), error: null });
  } catch { return NextResponse.json({ data: null, error: null }); }
}
export async function POST(request: Request) {
  try {
    const { data: { user } } = await (await createServerClient()).auth.getUser();
    if (!user) return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 });
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    const q = await nextWtpQuestion(service, user.id, String(b.feature ?? ''));
    if (!q) return NextResponse.json({ data: { ok: true }, error: null }); // not (or no longer) asked
    if (!['yes', 'maybe', 'no'].includes(b.answer)) return NextResponse.json({ data: null, error: 'bad_answer' }, { status: 400 });
    const settings = await loadSettings(service);
    void settings;
    const { data: u } = await service.from('users').select('role').eq('auth_user_id', user.id).maybeSingle();
    await service.from('wtp_responses').upsert({ user_id: user.id, user_type: u?.role ?? null, feature: String(b.feature), price_inr: q.price, answer: b.answer }, { onConflict: 'user_id,feature' });
    await recordCommerceEvent(service, 'willingness_to_pay_response', { userId: user.id, amount: q.price, meta: { feature: b.feature, answer: b.answer } });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch { return NextResponse.json({ data: null, error: 'failed' }, { status: 400 }); }
}
