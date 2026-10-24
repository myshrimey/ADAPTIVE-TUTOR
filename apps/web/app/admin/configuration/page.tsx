import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { listExamSessions, listCurriculumVersions, listCountryPrices } from '@adaptive-tutor/core';
import { AdminConfiguration } from '@/components/AdminConfiguration';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const s = createServiceClient();
  const [exams, versions, prices, { data: products }, { data: subjects }] = await Promise.all([
    listExamSessions(s), listCurriculumVersions(s), listCountryPrices(s),
    s.from('commerce_products').select('code, name').order('code'), s.from('subjects').select('id, name').order('name'),
  ]);
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Boards, exams and country prices</h1>
        <p style={{ color: 'var(--slate)' }}>The configuration side of &quot;board + class + year + subject + language + exam&quot;. Signed in as {g.email}. Every change here is written to the <a href="/admin/audit-log">audit log</a>.</p>
        <AdminNav />
      </div>
      <AdminConfiguration exams={exams} versions={versions} prices={prices} products={(products ?? []) as any} subjects={(subjects ?? []) as any} />
    </div></main>
  );
}
