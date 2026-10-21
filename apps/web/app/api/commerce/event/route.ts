import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { COMMERCE_EVENTS, recordCommerceEvent, type CommerceEvent } from '@adaptive-tutor/core';

// Records a commercial event (page views, button clicks). Whitelisted names only; works signed in or out.
const BROWSER_EVENTS = new Set<string>(['pricing_page_view', 'plan_selected', 'subject_selected', 'checkout_started', 'payment_instructions_viewed', 'upgrade_clicked', 'readiness_offer_viewed', 'readiness_purchase_intent', 'mock_offer_viewed']);
export async function POST(request: Request) {
  try {
    const b = await request.json().catch(() => ({}));
    const ev = String(b.event ?? '');
    if (!(COMMERCE_EVENTS as readonly string[]).includes(ev) || !BROWSER_EVENTS.has(ev)) return NextResponse.json({ data: null, error: 'bad_event' }, { status: 400 });
    const { data: { user } } = await (await createServerClient()).auth.getUser();
    await recordCommerceEvent(createServiceClient(), ev as CommerceEvent, { userId: user?.id ?? null, productCode: typeof b.productCode === 'string' ? b.productCode.slice(0, 60) : null, meta: typeof b.source === 'string' ? { source: b.source.slice(0, 40) } : {} });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch { return NextResponse.json({ data: { ok: false }, error: null }); }
}
