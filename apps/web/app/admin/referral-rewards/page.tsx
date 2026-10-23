import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadReferralSettings, listReferralEvents } from '@adaptive-tutor/core';
import { AdminReferral } from '@/components/AdminReferral';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const service = createServiceClient();
  const [settings, { events, byRole }] = await Promise.all([loadReferralSettings(service), listReferralEvents(service)]);
  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Referral links and rewards</h1>
          <p style={{ color: 'var(--slate)' }}>Everyone (student, parent, teacher, tutor, centre) has their own invite link on the homepage, dashboard and profile. When a friend signs up through it and finishes a real first diagnostic, the friend and the person who invited them each get bonus access days, once, automatically, if you switch rewards on. Days are added to the end date of a paid plan straight away; on the free plan they are kept and added when a paid plan starts. Teachers, tutors and centres are not paid in days: their rewards wait here for you to settle by hand. Signed in as {g.email}.</p>
          <AdminNav />
        </div>
        <AdminReferral settings={settings} events={events} byRole={byRole} />
      </div>
    </main>
  );
}
