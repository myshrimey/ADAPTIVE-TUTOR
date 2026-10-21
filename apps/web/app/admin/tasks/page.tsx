import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { RecordManager, type FieldDef } from '@/components/founder/RecordManager';
export const dynamic = 'force-dynamic';
const F: FieldDef[] = [{ key: 'title', label: 'Task', type: 'text' }, { key: 'area', label: 'Area (sales, product, funding, schools ...)', type: 'text' }, { key: 'priority', label: 'Priority', type: 'select', options: [['p0', 'P0 do now'], ['p1', 'P1 soon'], ['p2', 'P2 later']] }, { key: 'due', label: 'Due', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: [['open', 'Open'], ['done', 'Done']] }, { key: 'notes', label: 'Notes', type: 'textarea' }];
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const { data } = await createServiceClient().from('founder_tasks').select('*').order('status').order('priority').order('due', { ascending: true, nullsFirst: false }).limit(1000);
  return (<main className="page"><div className="shell shell--narrow"><div style={{ paddingTop: 'var(--space-3)' }}><h1 style={{ fontSize: 'var(--step-2)' }}>Founder tasks</h1><p style={{ color: 'var(--slate)' }}>Your own to-do list. Overdue tasks appear as alerts on the Command Centre. <a href="/api/admin/founder/export?table=tasks">Download CSV</a></p><AdminNav /></div>
    <RecordManager what="task" nameKey="title" title="task" rows={(data ?? []) as any} fields={F} listKeys={['area', 'priority', 'due', 'status']} addLabel="Add task" defaults={{ priority: 'p1', status: 'open' }} /></div></main>);
}
