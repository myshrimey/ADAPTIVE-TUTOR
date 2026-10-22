import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadEngagementSettings } from '@adaptive-tutor/core';
import { SettingsForm } from '@/components/engagement/AdminEngagement';

export const dynamic = 'force-dynamic';
// ADMIN ONLY: XP rules, mission size, feature switches, experiments, achievement XP.
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const s = createServiceClient(); const settings = await loadEngagementSettings(s);
  const { data } = await s.from('achievements').select('code, title, xp, active, category').order('sort');
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Engagement settings</h1><AdminNav />
        <p style={{ color: 'var(--slate)' }}>These are starting values, not claims about what works best. XP should reward learning only: it never pays for opening the app, clicking, very fast answers or repeating the same question.</p>
        <SettingsForm settings={settings} achievements={(data ?? []) as any[]} />
      </div>
    </div></main>
  );
}
