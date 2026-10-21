import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { RecordManager, type FieldDef } from '@/components/founder/RecordManager';
export const dynamic = 'force-dynamic';
const F: FieldDef[] = [{ key: 'changed_on', label: 'Date', type: 'date' }, { key: 'version', label: 'Version', type: 'text' }, { key: 'change', label: 'What changed', type: 'textarea' }, { key: 'reason', label: 'Why', type: 'text' }, { key: 'files', label: 'Files', type: 'text' }, { key: 'database_changes', label: 'Database changes', type: 'text' }, { key: 'pricing_changes', label: 'Pricing changes', type: 'text' }, { key: 'ai_model_changes', label: 'AI model changes', type: 'text' }, { key: 'deployment', label: 'Deployment', type: 'text' }];
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { data } = await createServiceClient().from('system_changelog').select('*').order('changed_on', { ascending: false }).order('created_at', { ascending: false }).limit(500);
  return (<main className="page"><div className="shell shell--narrow"><div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>System change log</h1><p style={{ color: 'var(--slate)' }}>What changed, when and why. Add a line each time you deploy a new version or change a price. <a href="/api/admin/founder/export?table=changelog">Download CSV</a></p><AdminNav /></div>
    <RecordManager what="changelog" nameKey="label" title="change" rows={(data ?? []).map((r: any) => ({ ...r, label: `${r.version ? r.version + ' · ' : ''}${r.change.slice(0, 80)}` })) as any} fields={F} listKeys={['changed_on', 'reason', 'database_changes', 'pricing_changes']} addLabel="Add log entry" defaults={{ changed_on: new Date().toISOString().slice(0, 10) }} /></div></main>);
}
