import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { CRM_KINDS, CRM_STAGES, CRM_STATUS, SOURCES, INSTITUTION_KINDS, loadSettings } from '@adaptive-tutor/core';
import { RecordManager, type FieldDef } from '@/components/founder/RecordManager';

export const dynamic = 'force-dynamic';
const kinds = Object.entries(CRM_KINDS) as [string, string][];
const FIELDS: FieldDef[] = [
  { key: 'kind', label: 'Customer type', type: 'select', options: kinds }, { key: 'name', label: 'Name', type: 'text' }, { key: 'organisation', label: 'Organisation / school', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' }, { key: 'email', label: 'Email', type: 'text' }, { key: 'city', label: 'City', type: 'text' }, { key: 'state', label: 'State', type: 'text' },
  { key: 'board', label: 'Board', type: 'text' }, { key: 'class_level', label: 'Class', type: 'text' }, { key: 'subjects', label: 'Subjects', type: 'text' },
  { key: 'source', label: 'Source', type: 'select', options: SOURCES.map((s) => [s, s.replace(/_/g, ' ')] as [string, string]) },
  { key: 'stage', label: 'Pipeline stage', type: 'select', options: CRM_STAGES }, { key: 'status', label: 'Status', type: 'select', options: CRM_STATUS.map((s) => [s, s] as [string, string]) },
  { key: 'first_contact', label: 'First contact', type: 'date' }, { key: 'last_contact', label: 'Last contact', type: 'date' }, { key: 'next_followup', label: 'Next follow-up', type: 'date' },
  { key: 'plan_discussed', label: 'Plan discussed', type: 'text' }, { key: 'price_discussed', label: 'Price discussed (₹)', type: 'int' }, { key: 'amount_paid', label: 'Amount paid (₹)', type: 'int' },
  { key: 'potential_value', label: 'Potential value (₹)', type: 'int' }, { key: 'probability', label: 'Your own probability (0-100)', type: 'int' }, { key: 'owner', label: 'Owner', type: 'text' }, { key: 'tags', label: 'Tags', type: 'text' },
  { key: 'interest', label: 'Interest', type: 'textarea' }, { key: 'objections', label: 'Objections', type: 'textarea' }, { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { group } = await searchParams;
  const inst = group === 'institutions';
  const s = createServiceClient();
  const [{ data: rows }, { data: acts }, settings] = await Promise.all([s.from('crm_records').select('*').order('next_followup', { ascending: true, nullsFirst: false }).limit(2000), s.from('crm_activities').select('record_id, kind, note, created_at, by_email').eq('record_table', 'crm').order('created_at', { ascending: false }).limit(3000), loadSettings(s)]);
  const list = ((rows ?? []) as any[]).filter((r) => (inst ? INSTITUTION_KINDS.includes(r.kind) : true));
  // School / institution extra fields are kept in r.extra; shown flat for editing.
  const flat = list.map((r) => ({ ...r, ...Object.fromEntries(Object.entries(r.extra ?? {}).map(([k, v]) => [`x_${k}`, v])) }));
  const instFields: FieldDef[] = inst ? [
    { key: 'x_principal', label: 'Principal', type: 'text' }, { key: 'x_coordinator', label: 'Academic coordinator', type: 'text' }, { key: 'x_decision_maker', label: 'Decision maker', type: 'text' },
    { key: 'x_current_software', label: 'Current software / teaching model', type: 'text' }, { key: 'x_pain_points', label: 'Pain points', type: 'textarea' },
    { key: 'x_pilot_status', label: 'Pilot status (none / planned / running / done)', type: 'text' }, { key: 'x_pilot_students', label: 'Pilot students', type: 'int' }, { key: 'x_pilot_start', label: 'Pilot start', type: 'date' }, { key: 'x_pilot_end', label: 'Pilot end', type: 'date' },
    { key: 'x_procurement_route', label: 'Procurement route (government: do not assume the principal can buy)', type: 'text' }, { key: 'x_funding_source', label: 'Funding source / CSR / NGO partner', type: 'text' }, { key: 'x_pricing_model', label: 'Pricing model discussed', type: 'text' },
  ] : [];
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>{inst ? 'Schools and institutions' : 'Customers and leads'}</h1>
        <p style={{ color: 'var(--slate)' }}>{inst ? 'Private schools, government schools, KV/JNV and departments. Aim for a 4-6 week pilot of 20-50 students first: the goal is evidence, not a large licence. Government schools usually cannot buy on their own (district, state, tender, CSR or NGO routes): never assume approval. Contact people professionally and only with consent. Sahayak supports teachers; it does not replace them.' : 'Everyone you talk to: parents, tutors, centres, schools, partners. Use the stage list to move people along and set the next follow-up date so nobody is forgotten.'} <a href="/api/admin/founder/export?table=crm">Download CSV</a></p>
        <p>
          <a href="/admin/crm">All customers</a> · <a href="/admin/crm?group=institutions">Schools &amp; institutions only</a> · Assumed stage probabilities (editable in Pricing and offers → crm_probabilities): {CRM_STAGES.map(([k, l]) => `${l} ${settings.crm_probabilities[k] ?? 0}%`).join(', ')}
        </p>
        <AdminNav />
      </div>
      <RecordManager what="crm" title={inst ? 'school / institution' : 'customer or lead'} rows={flat as any} fields={[...FIELDS, ...instFields]} listKeys={['organisation', 'city', 'source', 'plan_discussed', 'price_discussed', 'amount_paid', 'potential_value', 'x_pilot_status']} stages={CRM_STAGES} activities={(acts ?? []) as any} logNotes kindFilter={kinds} defaults={{ stage: 'new_lead', status: 'open', ...(inst ? { kind: 'school' } : { kind: 'parent' }) }} addLabel="Add lead / customer" initialKind="" note="Phone numbers and emails here are for adults you are in touch with. Do not store children's details." />
    </div></main>
  );
}
