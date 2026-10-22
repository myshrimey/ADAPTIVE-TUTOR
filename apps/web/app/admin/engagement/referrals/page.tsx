import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { listReferralsAdmin, loadEngagementSettings } from '@adaptive-tutor/core';
import { ReferralReward } from '@/components/engagement/ReferralReward';

export const dynamic = 'force-dynamic';
// ADMIN ONLY. Counts per referrer. Nothing is paid or credited automatically: you set each reward status by hand.
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const s = createServiceClient(); const rows = await listReferralsAdmin(s); const settings = await loadEngagementSettings(s);
  return (
    <main className="page"><div className="shell shell--narrow"><div style={{ paddingTop: 'var(--space-3)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Referrals</h1><AdminNav />
      <p style={{ color: 'var(--slate)' }}>The invite feature is currently <strong>{settings.features.referral ? 'ON' : 'OFF'}</strong> (change it in Engagement settings). Students share a code; a new student can enter one code in their first 14 days. A code stops at 50 uses. Nothing is paid, credited or discounted automatically. Decide each reward yourself below; look for the same family, the same device or many sign-ups in one day before approving.</p>
      {rows.length === 0 && <p>No referrals yet.</p>}
      {rows.map((r) => (
        <section key={r.referrerId} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
          <p style={{ margin: 0 }}>Code <strong>{r.code}</strong> · {r.signedUp} signed up · {r.firstDiagnostic} finished a first diagnostic <span style={{ color: 'var(--slate)' }}>(referrer id {r.referrerId.slice(0, 8)})</span></p>
          {r.rows.map((x) => <p key={x.id} style={{ margin: '0.3rem 0' }}>{x.createdAt.slice(0, 10)} · <ReferralReward id={x.id} status={x.rewardStatus} note={x.rewardNote} /></p>)}
        </section>
      ))}
    </div></div></main>
  );
}
