import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadAiEconomics, TASKS, FEATURE_CATALOG, PROJECTION_SIZES, FREE_CORE_NOTICE } from '@adaptive-tutor/core';
import { EconomicsSettings, ReconcileForm, SwitchSimulator } from '@/components/ai/EconomicsControls';

export const dynamic = 'force-dynamic';

const inr = (n: number | null | undefined) => (n === null || n === undefined ? 'Insufficient data' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const num = (n: number) => n.toLocaleString('en-IN');
const COLOR: Record<string, string> = { ok: '#1f9d55', warning: '#b07a00', critical: '#d03a2f', blocked: '#d03a2f', MARGIN_AT_RISK: '#d03a2f', OK: '#1f9d55', OK_PARTIAL: '#b07a00', NO_PRICE: '#888' };
const H = ({ children }: { children: React.ReactNode }) => <h2 style={{ fontSize: 'var(--step-1)', margin: 'var(--space-4) 0 0.2rem' }}>{children}</h2>;
const Note = ({ children }: { children: React.ReactNode }) => <p style={{ fontSize: '0.82rem', color: 'var(--slate)', margin: '0.2rem 0' }}>{children}</p>;
const Tbl = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
  <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
    <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>{head.map((h) => <th key={h} style={{ padding: '0.25rem 0.4rem' }}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>{r.map((c, j) => <td key={j} style={{ padding: '0.25rem 0.4rem', verticalAlign: 'top' }}>{c}</td>)}</tr>)}</tbody></table></div>
);

// ADMIN ONLY. Economics of AI: what each feature, model and student costs, with free quota shown separately from real spend.
export default async function Page() {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const d = await loadAiEconomics(createServiceClient());
  const tasks = Object.entries(TASKS).filter(([k]) => !['provider_test', 'benchmark'].includes(k)).map(([key, t]) => ({ key, label: t.label }));
  const provs = d.providers.filter((p) => p.status !== 'retired').map((p) => ({ id: p.id, name: p.provider_name }));
  const stat = (label: string, value: React.ReactNode, hint?: string) => <div style={{ minWidth: 150 }}><div style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>{label}</div><div style={{ fontSize: '1.15rem', fontWeight: 600 }}>{value}</div>{hint && <div style={{ fontSize: '0.74rem', color: 'var(--slate)' }}>{hint}</div>}</div>;
  const row = { display: 'flex', gap: '1.4rem', flexWrap: 'wrap' as const, margin: '0.4rem 0' };
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <p style={{ margin: 0, color: 'var(--slate)', letterSpacing: '0.08em', fontSize: '0.8rem' }}>SAHAYAK · ADMIN</p>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>AI Economics</h1>
        <AdminNav />
        {!d.migrated && <p className="alert">Migration 0036 has not been run yet, so the request ledger columns are missing and figures below use the older estimate only. Run <code>npm run db:migrate</code>.</p>}
        {d.truncated && <p className="alert">This month has more than 60,000 AI attempts; the figures below cover the newest 60,000 only.</p>}
        <Note>{FREE_CORE_NOTICE.line} Cost layers: <strong>list price</strong> (published rate × tokens), <strong>free quota</strong> (the part a free quota covered, a subsidy that can end), <strong>promotional credit</strong>, <strong>billed</strong> (what Sahayak expects to pay) and <strong>economic cost</strong> (list price: used for unit economics, because a free quota is never treated as permanently free). Provider invoices are entered by hand below; until then &ldquo;actual provider charge&rdquo; is unknown. All list prices are only as good as the prices entered in the provider list (ESTIMATED; none was verified by Claude).</Note>

        <H>Cost protection</H>
        {d.caps.length === 0 ? <Note>No spend or call limits are set. Set them in AI Infrastructure → controls. Limits count <strong>{d.econ.cap_basis}</strong> cost. Paid providers are never used without both a daily and a monthly limit.</Note> :
          <Tbl head={['Limit', 'Used', 'Limit', '%', 'Status']} rows={d.caps.map((c) => [c.label, c.unit === 'inr' ? inr(c.used) : num(c.used), c.unit === 'inr' ? inr(c.limit) : num(c.limit), `${c.pct}%`, <strong key="s" style={{ color: COLOR[c.level] }}>{c.level === 'ok' ? 'OK' : c.level === 'warning' ? `WARNING (${d.econ.spend_warn_pct}%+)` : c.level === 'critical' ? `CRITICAL (${d.econ.spend_critical_pct}%+)` : 'BLOCKED (100%)'}</strong>])} />}
        <Note>At 100% non-essential AI work stops and paid routes switch off; essential work (tutor, marking, handwriting) keeps running only on approved free routes. Nothing moves to paid by itself.</Note>

        <H>Today</H>
        <div style={row}>{stat('AI calls', num(d.today.calls))}{stat('Failures', num(d.today.failures))}{stat('Tokens', `${num(d.today.inputTokens + d.today.outputTokens)}`, `${num(d.today.inputTokens)} in / ${num(d.today.outputTokens)} out`)}{stat('Images', num(d.today.images))}{stat('Estimated (list)', inr(d.today.listInr))}{stat('Actual billed (expected)', inr(d.today.billedInr))}{stat('Economic cost', inr(d.today.economicInr))}</div>

        <H>This month ({d.period}, day {d.daysElapsed} of {d.daysInMonth})</H>
        <div style={row}>{stat('AI cost (economic)', inr(d.month.economicInr))}{stat('Billed (expected)', inr(d.month.billedInr))}{stat('Free quota used (value)', inr(d.freeVsPaid.freeQuotaValueInr), 'would have cost this at list price')}{stat('Promotional credit used', inr(d.freeVsPaid.promoCreditInr))}{stat('Cost per student', inr(d.costPerStudent), `${num(d.totalStudents)} students registered`)}{stat('Cost per active student', inr(d.costPerActiveStudent), `${num(d.month.users)} used AI`)}</div>
        <div style={row}>{stat('Most-used model', d.mostUsedModel?.key ?? 'Insufficient data', d.mostUsedModel ? `${num(d.mostUsedModel.calls)} calls` : undefined)}{stat('Most expensive model', d.mostExpensiveModel?.key ?? 'Insufficient data', d.mostExpensiveModel ? inr(d.mostExpensiveModel.economicInr) : undefined)}{stat('Most expensive feature', d.mostExpensiveFeature?.economicInr ? d.mostExpensiveFeature.label : 'Insufficient data', d.mostExpensiveFeature?.economicInr ? inr(d.mostExpensiveFeature.economicInr) : undefined)}</div>
        <Note>Calls on a free quota: {num(d.freeVsPaid.freeCalls)} · on promotional credit: {num(d.freeVsPaid.promoCalls)} · paid or unknown plan: {num(d.freeVsPaid.paidCalls)}. {d.month.unpriced > 0 && <strong>{d.month.unpriced} call(s) had no price recorded, so their cost shows as ₹0: fill in the prices.</strong>}</Note>

        <H>Projection at current usage</H>
        {!d.projection.ok ? <p>{d.projection.reason}</p> : <>
          <Tbl head={['Students using AI', 'AI cost / month (economic)', 'Expected billed / month']} rows={d.projection.rows.map((r) => [num(r.size), inr(r.economicInr), inr(r.billedInr)])} />
          <Note>Per active student per month: {inr(d.projection.perActiveStudentMonthEconomic)} (economic), {inr(d.projection.perActiveStudentMonthBilled)} (billed). {d.projection.basis} Sizes: {PROJECTION_SIZES.map(num).join(', ')}.</Note></>}

        <H>Feature economics (this month)</H>
        <Tbl head={['Feature', 'Calls', 'Failed', 'Users', 'Tokens in / out', 'Images', 'Estimated (list)', 'Actual (confirmed)', 'Economic', 'Cost / user']}
          rows={d.features.map((f) => f.rulesOnly ? [f.label, <span key="n" style={{ color: 'var(--slate)' }} >{f.note}</span>, '', '', '', '', '', '', '', ''] : [f.label, num(f.calls), num(f.failures), num(f.users), `${num(f.inputTokens)} / ${num(f.outputTokens)}`, num(f.images), inr(f.listInr), f.actualInr === null ? 'not available' : inr(f.actualInr), inr(f.economicInr), inr(f.costPerUserInr)])} />
        <Note>Features not in the table above make no AI call. Catalogue: {FEATURE_CATALOG.length} features.</Note>

        <H>Models (this month)</H>
        <Tbl head={['Model', 'Calls', 'Failed', 'Fallback uses', 'Avg latency', 'Free-quota value', 'Billed', 'Economic']}
          rows={d.models.map((a) => [a.key, num(a.calls), num(a.failures), num(a.fallbacks), a.avgLatencyMs === null ? '—' : `${a.avgLatencyMs} ms`, inr(a.freeQuotaValueInr), inr(a.billedInr), inr(a.economicInr)])} />

        <H>Handwritten evaluation economics</H>
        <Note>CONTRIBUTION = SELLING PRICE − TOTAL VARIABLE COST. Selling price used: the target price {inr(d.econ.handwritten_target_price_inr)} (the real price paid depends on the bundle bought). MARGIN_AT_RISK when contribution is below {d.econ.handwritten_min_contribution_inr !== null ? inr(d.econ.handwritten_min_contribution_inr) : `${d.econ.handwritten_min_margin_pct}% of the price`}. The number of images is whatever the exam&apos;s own limit allows; it is not fixed at 12.</Note>
        <div style={row}>{stat('Evaluations tracked', num(d.evaluations.count))}{stat('MARGIN_AT_RISK', <span style={{ color: d.evaluations.atRiskCount ? COLOR.MARGIN_AT_RISK : undefined }}>{num(d.evaluations.atRiskCount)}</span>)}{stat('Average contribution', inr(d.evaluations.avgContributionInr))}</div>
        {d.evaluations.recent.length === 0 ? <p>No evaluations recorded yet. One row is saved after each handwritten evaluation.</p> :
          <Tbl head={['Evaluation', 'Questions', 'Images', 'Model', 'Tokens', 'AI cost (economic)', 'Storage', 'Processing', 'Human review', 'Total variable', 'Price', 'Contribution', 'Margin', 'Status']}
            rows={d.evaluations.recent.slice(0, 25).map((e: any) => [<code key="i" style={{ fontSize: '0.75rem' }}>{String(e.exam_id).slice(0, 8)}</code>, e.questions, e.images, `${e.provider ?? '—'} · ${e.model ?? '—'}`, num((e.input_tokens ?? 0) + (e.output_tokens ?? 0)), inr(Number(e.ai_economic_cost_inr)), e.storage_cost_inr === null ? 'not entered' : inr(Number(e.storage_cost_inr)), e.processing_cost_inr === null ? 'not entered' : inr(Number(e.processing_cost_inr)), e.human_review_cost_inr === null ? 'not entered' : inr(Number(e.human_review_cost_inr)), inr(Number(e.total_variable_cost_inr)), inr(e.selling_price_inr === null ? null : Number(e.selling_price_inr)), inr(e.contribution_inr === null ? null : Number(e.contribution_inr)), e.margin_pct === null ? '—' : `${Number(e.margin_pct).toFixed(1)}%`, <strong key="s" style={{ color: e.margin_at_risk ? COLOR.MARGIN_AT_RISK : e.incomplete ? COLOR.OK_PARTIAL : COLOR.OK }}>{e.margin_at_risk ? 'MARGIN_AT_RISK' : e.incomplete ? `OK so far (missing: ${e.incomplete})` : 'OK'}</strong>])} />}

        <H>Provider invoices (actual provider charge)</H>
        <Tbl head={['Provider', 'Month', 'Sahayak expected billed', 'Invoice entered', 'Difference']} rows={d.reconciliations.map((r) => [r.provider, r.period, inr(r.billedByAppInr), r.actualInr === null ? 'not entered' : inr(r.actualInr), r.diffInr === null ? '—' : `${inr(r.diffInr)}${r.diffPct === null ? '' : ` (${r.diffPct.toFixed(0)}%)`}`])} />
        <ReconcileForm providers={provs} />

        <H>Model comparison (latest benchmark run per model)</H>
        {d.comparison.length === 0 ? <p>No benchmark runs yet. Run one from <a href="/admin/ai-infrastructure">AI Infrastructure</a>; you can limit a run to one subject, class, language or task type.</p> :
          <Tbl head={['Model', 'Version', 'Date', 'Scope', 'Quality', 'Accuracy', 'Hindi accuracy', 'Reasoning', 'Explanation', 'CBSE', 'Vision/OCR', 'Latency', 'Cost / case (list)']}
            rows={d.comparison.map((c) => [`${c.provider} · ${c.model ?? '—'}`, c.version ?? '—', c.date, c.scope, c.quality ?? 'not enough data', c.accuracyPct === null ? '—' : `${c.accuracyPct}%`, c.hindiPct === null ? '—' : `${c.hindiPct}%`, c.reasoning ?? '—', c.explanation ?? '—', c.cbse ?? '—', c.vision ?? '—', c.latencyMs === null ? '—' : `${c.latencyMs} ms`, c.costPerCaseInr === null ? '—' : inr(c.costPerCaseInr)])} />}
        <Note>Reasoning, explanation, CBSE and vision scores are 0-5 ratings a person enters under each run. Accuracy counts only auto-marked questions. Nothing is filled in for you.</Note>

        <H>Model switch simulator (admin only)</H>
        <SwitchSimulator options={d.simulator} fx={d.econ.fx_usd_inr} daysElapsed={d.daysElapsed} daysInMonth={d.daysInMonth} />

        <H>Assumptions and routing requirements</H>
        <EconomicsSettings econ={d.econ} tasks={tasks} />
        <p style={{ marginTop: 'var(--space-3)' }}><a href="/admin/ai-requests">Inspect individual AI requests →</a> · <a href="/admin/ai-infrastructure">AI Infrastructure (providers, controls, benchmark) →</a></p>
      </div>
    </div></main>
  );
}
