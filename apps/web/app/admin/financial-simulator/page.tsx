import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadSim } from '@adaptive-tutor/core';
import { FinancialSimulator } from '@/components/FinancialSimulator';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const inputs = await loadSim(createServiceClient());
  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Founder financial simulator</h1>
          <p style={{ color: 'var(--slate)' }}>Type your own numbers; everything below recalculates at once. Every result is a <strong>PLANNING SCENARIO</strong> made from what you typed. It is not a forecast and not a guarantee. Actual figures are on the Command Centre and Commercial pages. Signed in as {g.email}.</p>
          <AdminNav />
        </div>
        <FinancialSimulator initial={inputs} />
      </div>
    </main>
  );
}
