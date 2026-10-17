import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadGateReports } from '@adaptive-tutor/core';
import { AdminQualityGates } from '@/components/AdminQualityGates';

// Subject quality gates: you sign off each of the ten gates; a subject can be promoted to
// Ready only when all ten are signed off. Nothing is promoted automatically.
export const dynamic = 'force-dynamic';

export default async function AdminQualityPage() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const reports = await loadGateReports(createServiceClient());
  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Subject quality gates</h1>
          <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. A subject is called Ready only after all ten gates are signed off by you.</p>
          <AdminNav />
        </div>
        {reports.map((r) => <AdminQualityGates key={r.subjectId} report={r} />)}
      </div>
    </main>
  );
}
