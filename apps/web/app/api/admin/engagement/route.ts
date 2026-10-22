import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { saveEngagementSettings, setReferralReward } from '@adaptive-tutor/core';

export const runtime = 'nodejs';
// ADMIN ONLY. Save engagement settings (XP rules, mission size, switches, experiments), mark a review flag as seen, or change an achievement's XP / on-off.
export async function POST(req: Request) {
  try {
    await requireAdmin(); const b = await req.json(); const s = createServiceClient();
    if (b.action === 'save_settings') return NextResponse.json({ data: await saveEngagementSettings(s, b.settings), error: null });
    if (b.action === 'flag_reviewed') { const { error } = await s.from('engagement_flags').update({ reviewed: true }).eq('id', String(b.id)); if (error) throw new Error('Could not update.'); return NextResponse.json({ data: { ok: true }, error: null }); }
    if (b.action === 'achievement') { const xp = Math.round(Number(b.xp)); if (!(xp >= 0 && xp <= 1000)) throw new Error('XP must be 0 to 1000.'); const { error } = await s.from('achievements').update({ xp, active: b.active !== false }).eq('code', String(b.code)); if (error) throw new Error('Could not update.'); return NextResponse.json({ data: { ok: true }, error: null }); }
    if (b.action === 'referral_reward') { await setReferralReward(s, String(b.id), String(b.status), String(b.note ?? '')); return NextResponse.json({ data: { ok: true }, error: null }); }
    throw new Error('Unknown action.');
  } catch (err: any) { return NextResponse.json({ data: null, error: err.message === 'not_authorized' ? 'not_authorized' : String(err.message ?? 'failed').slice(0, 140) }, { status: err.message === 'not_authorized' ? 403 : 400 }); }
}
