import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { SocialGrowthBoard } from '@/components/SocialGrowthBoard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  return <main className="page"><div className="shell">
    <div style={{ paddingTop: 'var(--space-3)' }}>
      <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>Sahayak Growth Engine</h1>
      <p style={{ color: 'var(--slate)' }}>Social strategy, content calendar, draft review and publishing record. Signed in as {g.email}.</p>
      <AdminNav />
      <div className="stats-grid" style={{ margin: '1rem 0' }}>
        <div className="card"><strong>Draft-first</strong><p>Review before publishing</p></div>
        <div className="card"><strong>3 platforms</strong><p>Facebook · Instagram · LinkedIn</p></div>
        <div className="card"><strong>No AI cost</strong><p>Initial content uses templates</p></div>
      </div>
      <SocialGrowthBoard />
    </div>
  </div></main>;
}
