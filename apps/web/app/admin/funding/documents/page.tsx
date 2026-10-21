import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { DocChecklist } from '@/components/founder/DocChecklist';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { data } = await createServiceClient().from('funding_documents').select('key, label, status, notes').order('sort');
  const docs = data ?? []; const done = docs.filter((d: any) => d.status === 'complete').length;
  return (<main className="page"><div className="shell shell--narrow"><div style={{ paddingTop: 'var(--space-3)' }}>
    <h1 style={{ fontSize: 'var(--step-2)' }}>Investor documents checklist</h1>
    <p style={{ color: 'var(--slate)' }}>{done} of {docs.length} complete. Mark each item honestly: COMPLETE / MISSING / NEEDS UPDATE. Never put child-level data in any investor document: use totals and averages only. <a href="/api/admin/founder/export?table=documents">Download CSV</a></p>
    <AdminNav /></div><DocChecklist docs={docs as any} /></div></main>);
}
