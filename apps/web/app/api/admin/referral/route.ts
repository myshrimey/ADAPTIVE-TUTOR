import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { saveReferralSettings, rewardAllQualified, resolveHeldReward } from '@adaptive-tutor/core';

// Admin only: change the referral settings (days, switches, limits), give out rewards of friends who already qualified, settle a held reward by hand.
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    if (b.action === 'save') return NextResponse.json({ data: await saveReferralSettings(service, b.settings), error: null });
    if (b.action === 'reward_all') return NextResponse.json({ data: { rewarded: await rewardAllQualified(service) }, error: null });
    if (b.action === 'resolve') { await resolveHeldReward(service, String(b.id ?? ''), String(b.note ?? '')); return NextResponse.json({ data: { ok: true }, error: null }); }
    return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
