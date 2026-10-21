import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadSettings, loadProducts, handwrittenEconomics, maxEconomicImages, periodStart } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';
const inr = (n: number | null) => (n === null ? 'Insufficient data' : `₹${Math.round(n).toLocaleString('en-IN')}`);
const PERIODS: [string, string][] = [['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['all', 'All time']];

export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const { p = '30' } = await searchParams;
  const from = periodStart(p);
  const s = createServiceClient();
  const since = <T,>(q: any, col = 'created_at'): T => (from ? q.gte(col, from) : q);
  const [settings, products, { data: pays }, { data: events }, { data: wtp }, { data: interest }, { data: ledger }, { data: sheets }, { data: evals }, { count: students }, { count: paidNow }] = await Promise.all([
    loadSettings(s), loadProducts(s),
    since<any>(s.from('pilot_payments').select('product_code, amount, discount_amount, quantity, status, created_at').in('status', ['pending', 'confirmed'])),
    since<any>(s.from('commerce_events').select('event, product_code, created_at').neq('event', 'admin_change').limit(20000)),
    since<any>(s.from('wtp_responses').select('feature, price_inr, answer, user_type')),
    since<any>(s.from('commerce_interest').select('kind, status')),
    since<any>(s.from('mock_credit_ledger').select('ref, delta, reason')),
    s.from('answer_sheets').select('mock_exam_id').limit(50000),
    since<any>(s.from('handwritten_evaluations').select('status, mock_exam_id')),
    s.from('students').select('id', { count: 'exact', head: true }),
    s.from('student_access').select('student_id', { count: 'exact', head: true }).not('product_code', 'is', null),
  ]);
  const confirmed = (pays ?? []).filter((x: any) => x.status === 'confirmed');
  const pending = (pays ?? []).filter((x: any) => x.status === 'pending');
  const revenue = confirmed.reduce((a: number, x: any) => a + Number(x.amount), 0);
  const byProduct = new Map<string, { n: number; rev: number }>();
  for (const x of confirmed) { const k = x.product_code ?? '(older payments)'; const cur = byProduct.get(k) ?? { n: 0, rev: 0 }; cur.n++; cur.rev += Number(x.amount); byProduct.set(k, cur); }
  const evCount = new Map<string, number>();
  for (const e of events ?? []) evCount.set(e.event, (evCount.get(e.event) ?? 0) + 1);
  const used = (ledger ?? []).filter((l: any) => String(l.ref).startsWith('eval:')).length;
  const examsEvaluated = new Set((evals ?? []).map((e: any) => e.mock_exam_id));
  const pagesPer = new Map<string, number>();
  for (const sh of sheets ?? []) if (examsEvaluated.has(sh.mock_exam_id)) pagesPer.set(sh.mock_exam_id, (pagesPer.get(sh.mock_exam_id) ?? 0) + 1);
  const avgImages = pagesPer.size ? [...pagesPer.values()].reduce((a, b) => a + b, 0) / pagesPer.size : 0;
  const evalRows = evals ?? [];
  const humanRate = evalRows.length ? evalRows.filter((e: any) => e.status === 'needs_teacher' || e.status === 'teacher_done').length / evalRows.length : 0;
  const mock = products.find((x) => x.kind === 'mock');
  const mockSales = confirmed.filter((x: any) => x.product_code === mock?.code);
  const mockUnits = mockSales.reduce((a: number, x: any) => a + (x.quantity ?? 1), 0);
  const netPerEval = mockUnits ? mockSales.reduce((a: number, x: any) => a + Number(x.amount), 0) / mockUnits : mock?.priceInr ?? 0;
  const eco = handwrittenEconomics({ netPriceInr: netPerEval, avgImages, humanReviewRate: humanRate, assumptions: settings.economics });
  const maxImg = maxEconomicImages(netPerEval, humanRate, settings.economics);
  const wtpBy = new Map<string, { yes: number; maybe: number; no: number }>();
  for (const w of wtp ?? []) { const k = `${w.feature} @ ₹${w.price_inr}`; const c = wtpBy.get(k) ?? { yes: 0, maybe: 0, no: 0 }; (c as any)[w.answer]++; wtpBy.set(k, c); }
  const intr = new Map<string, number>();
  for (const i of interest ?? []) intr.set(i.kind, (intr.get(i.kind) ?? 0) + 1);
  const ev = (n: string) => evCount.get(n) ?? 0;
  const rate = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
  const card = (label: string, value: string, note?: string) => <div className="stat-tile"><div className="stat-tile__value" style={{ fontSize: '1.4rem' }}>{value}</div><div className="stat-tile__label">{label}{note ? <><br /><span style={{ fontSize: '0.75rem' }}>{note}</span></> : null}</div></div>;

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-3)' }}>
          <h1 style={{ fontSize: 'var(--step-2)' }}>Commercial dashboard</h1>
          <p style={{ color: 'var(--slate)' }}>Signed in as {g.email}. Real counts from the database. Anything that depends on your cost assumptions is marked ESTIMATED; missing assumptions show &quot;Insufficient data&quot;.</p>
          <AdminNav />
          <p>{PERIODS.map(([k, l]) => <a key={k} href={`/admin/commercial?p=${k}`} style={{ marginRight: '0.8rem', fontWeight: p === k ? 700 : 400 }}>{l}</a>)}</p>
        </div>

        <div className="stat-tile-row">
          {card('Revenue (verified payments)', inr(revenue), 'ACTUAL')}
          {card('Payments waiting to be checked', String(pending.length), inr(pending.reduce((a: number, x: any) => a + Number(x.amount), 0)))}
          {card('Paying students now (with a plan)', String(paidNow ?? 0), `of ${students ?? 0} students`)}
          {card('Handwritten evaluations done', String(used))}
        </div>

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>Revenue by product</h2>
        {byProduct.size === 0 ? <p style={{ color: 'var(--slate)' }}>No verified payments in this period.</p> : (
          <table style={{ borderCollapse: 'collapse', fontSize: '0.92rem' }}><tbody>{[...byProduct.entries()].map(([k, v]) => <tr key={k}><td style={{ padding: '0.3rem 1rem 0.3rem 0' }}>{k}</td><td>{v.n} sale(s)</td><td style={{ paddingLeft: '1rem' }}>{inr(v.rev)}</td></tr>)}</tbody></table>
        )}

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>Commercial funnel (events)</h2>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.92rem' }}><tbody>
          {['pricing_page_view', 'plan_selected', 'checkout_started', 'payment_instructions_viewed', 'payment_submitted', 'payment_verified', 'plan_activated', 'mock_offer_viewed', 'mock_purchased', 'mock_completed', 'upgrade_clicked', 'readiness_offer_viewed', 'tutor_interest', 'centre_interest', 'willingness_to_pay_response'].map((k) => <tr key={k}><td style={{ padding: '0.2rem 1rem 0.2rem 0' }}>{k}</td><td>{ev(k)}</td></tr>)}
        </tbody></table>
        <p style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>Plan page → checkout: {rate(ev('checkout_started'), ev('pricing_page_view'))} · checkout → payment submitted: {rate(ev('payment_submitted'), ev('checkout_started'))} · submitted → verified: {rate(ev('payment_verified'), ev('payment_submitted'))}. Page views are counted per visit, not per person.</p>

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>Handwritten evaluation economics <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>(ESTIMATED, admin only)</span></h2>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.92rem' }}><tbody>
          <tr><td style={{ padding: '0.2rem 1rem 0.2rem 0' }}>Standard price</td><td>{inr(mock?.priceInr ?? null)}</td></tr>
          <tr><td>Average net price per paid evaluation</td><td>{mockUnits ? inr(netPerEval) : `${inr(netPerEval)} (list; none sold yet)`}</td></tr>
          <tr><td>Average images per evaluation (ACTUAL)</td><td>{pagesPer.size ? avgImages.toFixed(1) : 'No evaluations yet'}</td></tr>
          <tr><td>Share needing a teacher (ACTUAL)</td><td>{evalRows.length ? `${Math.round(humanRate * 100)}% of marked answers` : 'No data'}</td></tr>
          <tr><td>AI cost per evaluation</td><td>{inr(eco.aiCostInr)}</td></tr>
          <tr><td>Human review cost per evaluation</td><td>{inr(eco.humanCostInr)}</td></tr>
          <tr><td>Infrastructure per evaluation</td><td>{inr(eco.infraCostInr)}</td></tr>
          <tr><td><strong>Contribution per evaluation</strong></td><td><strong>{inr(eco.contributionInr)}</strong>{eco.marginPct !== null ? ` (${eco.marginPct.toFixed(0)}% margin)` : ''}</td></tr>
          <tr><td>Most images that still break even</td><td>{maxImg === null ? 'Insufficient data' : maxImg}</td></tr>
        </tbody></table>
        {eco.status === 'review_pricing' && <p className="alert">REVIEW PRICING: with your assumptions each evaluation loses money. Options: lower the image allowance, improve the process, raise the price, or reduce teacher review. Prices are never changed automatically.</p>}
        {eco.status === 'insufficient_data' && <p style={{ color: 'var(--slate)' }}>To see contribution, enter your cost assumptions (rupees) in Pricing → settings → economics. Missing: {eco.missing.join(', ')}. Plan credits have no separate price, so revenue per credit used inside a plan is not shown.</p>}

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>Willingness to pay (answers so far)</h2>
        {wtpBy.size === 0 ? <p style={{ color: 'var(--slate)' }}>No answers yet.</p> : <table style={{ borderCollapse: 'collapse', fontSize: '0.92rem' }}><tbody>{[...wtpBy.entries()].map(([k, v]) => <tr key={k}><td style={{ padding: '0.2rem 1rem 0.2rem 0' }}>{k}</td><td>Yes {v.yes} · Maybe {v.maybe} · No {v.no}</td></tr>)}</tbody></table>}

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-3)' }}>Applications and requests</h2>
        <p>{['tutor', 'centre', 'partner', 'subject_request', 'other'].map((k) => `${k}: ${intr.get(k) ?? 0}`).join(' · ')} — <a href="/admin/interest">open the list</a> · <a href="/api/admin/commerce/export?table=payments">Download payments (CSV)</a></p>
      </div>
    </main>
  );
}
