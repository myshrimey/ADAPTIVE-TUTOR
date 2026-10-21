import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { EXPENSE_CATEGORIES, CRM_KINDS } from '@adaptive-tutor/core';
import { RecordManager, type FieldDef } from '@/components/founder/RecordManager';
import { inr } from '@/components/founder/Cards';
export const dynamic = 'force-dynamic';
const cats = Object.entries(EXPENSE_CATEGORIES) as [string, string][];
const EXP: FieldDef[] = [{ key: 'spent_on', label: 'Date', type: 'date' }, { key: 'category', label: 'Category', type: 'select', options: cats }, { key: 'description', label: 'What for', type: 'text' }, { key: 'vendor', label: 'Paid to', type: 'text' }, { key: 'amount_inr', label: 'Amount (₹)', type: 'int' }, { key: 'recurring', label: 'Repeats every month?', type: 'bool' }];
const REV: FieldDef[] = [{ key: 'received_on', label: 'Date received', type: 'date' }, { key: 'customer_kind', label: 'Customer type', type: 'select', options: Object.entries(CRM_KINDS) as [string, string][] }, { key: 'customer_name', label: 'Customer', type: 'text' }, { key: 'product', label: 'Product / plan', type: 'text' }, { key: 'amount_inr', label: 'Amount (₹)', type: 'int' }, { key: 'method', label: 'Method', type: 'select', options: [['upi', 'UPI'], ['qr', 'QR'], ['bank_transfer', 'Bank transfer'], ['cash', 'Cash'], ['other', 'Other']] }, { key: 'reference', label: 'Reference / UTR', type: 'text' }, { key: 'notes', label: 'Notes', type: 'text' }];
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const s = createServiceClient();
  const [{ data: ex }, { data: rv }] = await Promise.all([s.from('expenses').select('*').order('spent_on', { ascending: false }).limit(2000), s.from('revenue_entries').select('*').order('received_on', { ascending: false }).limit(2000)]);
  const tot = (rows: any[]) => rows.reduce((a, r) => a + Number(r.amount_inr), 0);
  return (<main className="page"><div className="shell shell--narrow"><div style={{ paddingTop: 'var(--space-3)' }}>
    <h1 style={{ fontSize: 'var(--step-2)' }}>Money in and money out</h1>
    <p style={{ color: 'var(--slate)' }}>Sahayak cannot see your bank. Record what you spend and what you receive here and the Command Centre will use it. Student plan payments are already counted from <a href="/admin/payments">Payments</a>: do not enter them again. AI cost is read from usage automatically; enter an AI invoice only if it is higher than the app shows. Downloads: <a href="/api/admin/founder/export?table=expenses">costs</a> · <a href="/api/admin/founder/export?table=revenue">other money received</a> · <a href="/api/admin/founder/export?table=payments">student payments</a></p>
    <AdminNav /></div>
    <h2 style={{ fontSize: 'var(--step-1)' }}>Costs (total recorded {inr(tot(ex ?? []))})</h2>
    <RecordManager what="expense" title="cost" rows={(ex ?? []).map((r: any) => ({ ...r, name: `${EXPENSE_CATEGORIES[r.category] ?? r.category}: ${inr(r.amount_inr)}` })) as any} fields={EXP} listKeys={['spent_on', 'description', 'vendor', 'recurring']} addLabel="Add a cost" defaults={{ spent_on: new Date().toISOString().slice(0, 10), category: 'infrastructure' }} />
    <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Other money received (total {inr(tot(rv ?? []))})</h2>
    <p style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>For tutors, centres, schools and anything that is not a student plan payment.</p>
    <RecordManager what="revenue" title="money received" rows={(rv ?? []).map((r: any) => ({ ...r, name: `${r.customer_name || 'Customer'}: ${inr(r.amount_inr)}` })) as any} fields={REV} listKeys={['received_on', 'product', 'method', 'reference']} addLabel="Add money received" defaults={{ received_on: new Date().toISOString().slice(0, 10), customer_kind: 'tutor', method: 'upi' }} />
  </div></main>);
}
