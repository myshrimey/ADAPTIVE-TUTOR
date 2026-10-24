import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { saveReferralSettings, rewardAllQualified, resolveHeldReward, writeAudit } from '@adaptive-tutor/core';

// Admin only: change the referral settings (days, switches, limits), give out rewards of friends who already qualified, settle a held reward by hand.
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const service = createServiceClient();
    if (b.action === 'save') { const d = await saveReferralSettings(service, b.settings); await writeAudit(service, { actorEmail: admin.email, action: 'save', entity: 'referral_settings', detail: { rewards_on: d.rewards_on, days_referrer: d.days_referrer, days_referred: d.days_referred } }); return NextResponse.json({ data: d, error: null }); }
    if (b.action === 'reward_all') { const n = await rewardAllQualified(service); await writeAudit(service, { actorEmail: admin.email, action: 'reward_all', entity: 'referral', detail: { rewarded: n } }); return NextResponse.json({ data: { rewarded: n }, error: null }); }
    if (b.action === 'resolve') { await resolveHeldReward(service, String(b.id ?? ''), String(b.note ?? '')); return NextResponse.json({ data: { ok: true }, error: null }); }
    return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'not_authorized' ? 403 : 400 });
  }
}
