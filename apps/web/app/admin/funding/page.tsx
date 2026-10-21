import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { FUNDING_KINDS, FUNDING_STAGES, ELIGIBILITY_STATUSES, CONFIDENCE, FIT_CRITERIA, FUNDING_SUBTYPES, LEGAL_NOTE, loadSettings, fitScore, weightedPipeline } from '@adaptive-tutor/core';
import { RecordManager, type FieldDef } from '@/components/founder/RecordManager';
import { Section, Grid, inr, Tag } from '@/components/founder/Cards';

export const dynamic = 'force-dynamic';
const kinds = Object.entries(FUNDING_KINDS) as [string, string][];
const allSubtypes = [...new Set(Object.values(FUNDING_SUBTYPES).flat())].map((x) => [x, x] as [string, string]);
const FIELDS: FieldDef[] = [
  { key: 'kind', label: 'Category', type: 'select', options: kinds }, { key: 'subtype', label: 'Type (HNI, Angel, VC, Startup India ...)', type: 'select', options: allSubtypes, unknown: true },
  { key: 'name', label: 'Name', type: 'text' }, { key: 'organisation', label: 'Organisation', type: 'text', unknown: true }, { key: 'website', label: 'Website', type: 'text', unknown: true }, { key: 'linkedin', label: 'LinkedIn', type: 'text', unknown: true },
  { key: 'location', label: 'Location', type: 'text', unknown: true }, { key: 'country', label: 'Country', type: 'text', unknown: true }, { key: 'sector_focus', label: 'Sector focus (education / EdTech / AI)', type: 'text', unknown: true },
  { key: 'stage_preference', label: 'Stage preference', type: 'text', unknown: true }, { key: 'cheque_min', label: 'Minimum cheque (₹) if known', type: 'int', unknown: true }, { key: 'cheque_max', label: 'Maximum cheque (₹) if known', type: 'int', unknown: true },
  { key: 'geography', label: 'Geography', type: 'text', unknown: true }, { key: 'traction_requirement', label: 'Traction / revenue requirement', type: 'text', unknown: true }, { key: 'previous_investments', label: 'Previous investments / portfolio', type: 'textarea', unknown: true },
  { key: 'why_fit', label: 'Why Sahayak may fit', type: 'textarea' }, { key: 'warm_intro', label: 'Warm introduction available?', type: 'bool' }, { key: 'intro_source', label: 'Introduction source', type: 'text', unknown: true },
  { key: 'contact_person', label: 'Contact person', type: 'text', unknown: true }, { key: 'email', label: 'Email', type: 'text', unknown: true }, { key: 'phone', label: 'Phone (only if legitimately obtained)', type: 'text', unknown: true },
  { key: 'source', label: 'SOURCE of this information', type: 'text', unknown: true }, { key: 'last_verified', label: 'DATE VERIFIED', type: 'date', unknown: true }, { key: 'confidence', label: 'CONFIDENCE', type: 'select', options: CONFIDENCE.map((c) => [c, c] as [string, string]) },
  { key: 'stage', label: 'Pipeline stage', type: 'select', options: FUNDING_STAGES }, { key: 'priority', label: 'Priority', type: 'select', options: [['low', 'Low'], ['normal', 'Normal'], ['high', 'High']] },
  { key: 'amount_requested', label: 'Amount requested (₹)', type: 'int' }, { key: 'amount_offered', label: 'Amount offered (₹)', type: 'int' }, { key: 'amount_received', label: 'Amount received (₹)', type: 'int' },
  { key: 'valuation_note', label: 'Valuation / equity discussion (note only)', type: 'text' }, { key: 'instrument', label: 'Instrument (SAFE / convertible / debt / equity / grant)', type: 'text' },
  { key: 'next_action', label: 'Next action', type: 'text' }, { key: 'next_followup', label: 'Next follow-up', type: 'date' }, { key: 'deadline', label: 'Application deadline', type: 'date' },
  { key: 'eligibility_status', label: 'Eligibility (do not assume Sahayak qualifies)', type: 'select', options: ELIGIBILITY_STATUSES }, { key: 'documents_required', label: 'Documents required', type: 'textarea', unknown: true },
  { key: 'reason_rejected', label: 'Reason rejected / passed', type: 'text' }, { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { kind } = await searchParams;
  const s = createServiceClient();
  const [{ data: rows }, { data: acts }, settings] = await Promise.all([s.from('funding_records').select('*').order('created_at', { ascending: false }).limit(2000), s.from('crm_activities').select('record_id, kind, note, created_at, by_email').eq('record_table', 'funding').order('created_at', { ascending: false }).limit(3000), loadSettings(s)]);
  const all = (rows ?? []) as any[];
  const scores: Record<string, ReturnType<typeof fitScore>> = {};
  for (const r of all) scores[r.id] = fitScore(r.fit, settings.fit_weights);
  const inv = weightedPipeline(all.filter((r) => r.kind === 'investor').map((r) => ({ stage: r.stage, amount: r.amount_requested ?? r.amount_offered })), settings.funding_probabilities, ['passed', 'funds_received']);
  const committed = all.filter((r) => r.stage === 'committed').reduce((a, r) => a + Number(r.amount_offered ?? 0), 0);
  const received = all.reduce((a, r) => a + Number(r.amount_received ?? 0), 0);
  const list = all.filter((r) => !kind || r.kind === kind);
  const byKind = Object.entries(FUNDING_KINDS).map(([k, l]) => `${l} ${all.filter((r) => r.kind === k).length}`).join(' · ');
  return (
    <main className="page"><div className="shell shell--narrow">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Funding and investors</h1>
        <p style={{ color: 'var(--slate)' }}>Investors, government schemes, incubators, accelerators, CSR and debt, in one private list. Only you can see this page. <strong>Never invent facts:</strong> leave a field empty and it shows UNKNOWN — VERIFY. Every record should have a source, a verified date and a confidence. <a href="/api/admin/founder/export?table=funding">Download CSV</a></p>
        <p className="alert">{LEGAL_NOTE}</p>
        <p>Filter: <a href="/admin/funding">All</a> {kinds.map(([k, l]) => <span key={k}>· <a href={`/admin/funding?kind=${k}`}>{l}</a> </span>)}· <a href="/admin/funding/documents">Documents checklist</a> · <a href="/admin/investor-metrics">Investor-safe metrics</a></p>
        <AdminNav />
      </div>
      <Section title="Pipeline" hint="Weighted pipeline = amount asked × your assumed chance for that stage (editable in Pricing and offers → funding_probabilities).">
        <Grid>
          <div className="stat-tile"><div className="stat-tile__value">{all.length}</div><div className="stat-tile__label">Prospects</div></div>
          <div className="stat-tile"><div className="stat-tile__value">{inr(inv.potential)}</div><div className="stat-tile__label">Potential capital (investors)<Tag label="ASSUMED" /></div></div>
          <div className="stat-tile"><div className="stat-tile__value">{inr(inv.weighted)}</div><div className="stat-tile__label">Weighted pipeline<Tag label="ASSUMED" /></div></div>
          <div className="stat-tile"><div className="stat-tile__value">{inr(committed)}</div><div className="stat-tile__label">Committed<Tag label="ACTUAL" /></div></div>
          <div className="stat-tile"><div className="stat-tile__value">{inr(received)}</div><div className="stat-tile__label">Received<Tag label="ACTUAL" /></div></div>
        </Grid>
        <p style={{ fontSize: '0.88rem' }}>{byKind}</p>
        <p style={{ fontSize: '0.88rem' }}>{FUNDING_STAGES.map(([k, l]) => `${l} ${all.filter((r) => r.stage === k).length}`).join(' → ')}</p>
      </Section>
      <RecordManager what="funding" title="funding source" rows={list as any} fields={FIELDS} listKeys={['subtype', 'organisation', 'location', 'cheque_min', 'cheque_max', 'amount_requested', 'deadline', 'eligibility_status', 'source', 'last_verified', 'confidence']} stages={FUNDING_STAGES} activities={(acts ?? []) as any} logNotes fitCriteria={FIT_CRITERIA} fitWeights={settings.fit_weights} scores={scores} kindFilter={kinds} initialKind={kind ?? ''} defaults={{ kind: kind ?? 'investor', stage: 'researching', priority: 'normal', confidence: 'unknown', eligibility_status: 'needs_verification' }} addLabel="Add funding source" />
    </div></main>
  );
}
