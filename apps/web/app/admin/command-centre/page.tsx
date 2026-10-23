import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadCommandCentreAi, loadCommandCentre, rangeBounds, RANGES, CRM_STAGES, FUNDING_STAGES, FUNDING_KINDS, EXPENSE_CATEGORIES, CRM_KINDS } from '@adaptive-tutor/core';
import { Stat, Section, Grid, Tag, Dot, inr } from '@/components/founder/Cards';

export const dynamic = 'force-dynamic';

// ADMIN ONLY. The first screen of the admin area. Every number says whether it is counted (ACTUAL), calculated from partial data (ESTIMATED),
// based on an assumption you set (ASSUMED), or cannot be shown yet (Insufficient data). Nothing here shows a child's name or answers.
export default async function Page({ searchParams }: { searchParams: Promise<{ r?: string; from?: string; to?: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const sp = await searchParams;
  const range = rangeBounds(sp.r ?? '30', { from: sp.from, to: sp.to });
  const d = await loadCommandCentre(createServiceClient(), range);
  const ai = await loadCommandCentreAi(createServiceClient()).catch(() => null); // AI economics block; a failure here must not break the Command Centre
  const t = d.today;
  const stageName = (k: string, list: [string, string][]) => list.find((s) => s[0] === k)?.[1] ?? k;
  const healthText = { green: 'Healthy on the measures that have data', amber: 'Needs attention', red: 'Several measures need action', grey: 'Not enough data yet' }[d.health];
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <p style={{ margin: 0, color: 'var(--slate)', letterSpacing: '0.08em', fontSize: '0.8rem' }}>SAHAYAK</p>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>Founder Command Centre</h1>
        <p style={{ color: 'var(--slate)', margin: '0.2rem 0' }}>Current product stage: {d.productStage}. Last updated {new Date(d.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Signed in as {g.email}.</p>
        <AdminNav />
        <form method="get" className="hero__actions" style={{ alignItems: 'center' }}>
          {RANGES.map(([k, l]) => <button key={k} name="r" value={k} className={`btn btn--small ${d.range.key === k ? 'btn--accent' : 'btn--ghost'}`}>{l}</button>)}
          <span style={{ fontSize: '0.85rem' }}>or from <input type="date" name="from" defaultValue={sp.from} /> to <input type="date" name="to" defaultValue={sp.to} /> <button name="r" value="custom" className="btn btn--ghost btn--small">Show</button></span>
        </form>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Showing: <strong>{d.range.label}</strong> (for the sections below the &ldquo;Today&rdquo; block). <Tag label="ACTUAL" /> counted <Tag label="ESTIMATED" /> from partial data <Tag label="ASSUMED" /> uses your assumption. &ldquo;Insufficient data&rdquo; means it cannot be worked out yet, so nothing is guessed.</p>
      </div>

      <Section title="Business health">
        <p style={{ fontSize: '1.05rem' }}><Dot rag={d.health} /> <strong>{healthText}</strong></p>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.92rem' }}>
          {([['Diagnostic completion', 'diagnostic_completion'], ['Weekly active students', 'weekly_active'], ['Return within 7 days', 'return_within_7_days'], ['Paid conversion', 'paid_conversion'], ['Contribution margin', 'contribution_margin'], ['Handwritten answers needing a teacher', 'handwritten_human_review']] as [string, keyof typeof d.rag][]).map(([l, k]) => <li key={k}><Dot rag={d.rag[k]} />{l}: {d.rag[k] === 'grey' ? 'not enough data' : d.rag[k]}</li>)}
        </ul>
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>The green / amber / red lines are starting points you can change in <a href="/admin/pricing">Pricing and offers → rag</a>.</p>
      </Section>

      {d.alerts.length > 0 && (
        <Section title="Alerts">
          {d.alerts.map((a, i) => <p key={i} className="alert" style={{ borderLeft: `4px solid ${a.level === 'red' ? '#d03a2f' : '#e0a100'}`, margin: '0.3rem 0' }}><a href={a.href}>{a.text}</a></p>)}
        </Section>
      )}

      <Section title="What should I do next?" hint="Simple rules over your own numbers. Not financial advice.">
        {d.actions.length === 0 ? <p style={{ color: 'var(--slate)' }}>Nothing urgent from the data. Keep recording payments, costs and conversations so this list can help.</p>
          : <ol style={{ paddingLeft: '1.2rem' }}>{d.actions.map((a, i) => <li key={i} style={{ margin: '0.3rem 0' }}>{a.href ? <a href={a.href}>{a.text}</a> : a.text}</li>)}</ol>}
      </Section>

      <Section title="Today">
        <Grid>
          <Stat label="Students" m={t.students} /><Stat label="Active today" m={t.activeToday} /><Stat label="Families (parents linked)" m={t.families} /><Stat label="Paid accounts" m={t.paidAccounts} />
          <Stat label="Tutors" m={t.tutors} /><Stat label="Coaching centres" m={t.centres} /><Stat label="Schools / institutions" m={t.schools} /><Stat label="School pilots" m={t.pilots} />
          <Stat label="Revenue today" m={t.revenueToday} money /><Stat label="Revenue this month" m={t.revenueMonth} money /><Stat label="Revenue this year" m={t.revenueYear} money />
          <Stat label="Costs today" m={t.costsToday} money /><Stat label="Costs this month" m={t.costsMonth} money /><Stat label="Contribution this month" m={t.contributionMonth} money /><Stat label="Profit this month" m={t.profitMonth} money />
        </Grid>
      </Section>

      <Section title="Users and engagement" hint={d.range.label}>
        <Grid>
          <Stat label="All registered users" m={d.users.registered} /><Stat label="New students" m={d.users.newStudents} /><Stat label="Daily active" m={d.users.dau} /><Stat label="Weekly active" m={d.users.wau} /><Stat label="Monthly active" m={d.users.mau} />
          <Stat label="Activation" m={d.users.activation} suffix="%" /><Stat label="Diagnostic completion" m={d.users.diagnosticCompletion} suffix="%" /><Stat label="Return within 7 days" m={d.users.returnRate} suffix="%" /><Stat label="Paid conversion" m={d.users.paidConversion} suffix="%" />
        </Grid>
      </Section>

      <Section title="Revenue" hint={`${d.range.label}. Verified student payments plus money you recorded under Money in / out.`}>
        <Grid><Stat label="Revenue" m={d.revenue.total} money /><Stat label="Handwritten mock revenue" m={d.revenue.handwritten} money /><Stat label="Institutional revenue (tutor, centre, school)" m={d.revenue.institutional} money /></Grid>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem', marginTop: '0.6rem' }}>
          {([['By product', d.revenue.byProduct], ['By customer type', d.revenue.byType], ['By payment method', d.revenue.byMethod]] as [string, Record<string, number>][]).map(([h, obj]) => (
            <div key={h} className="chapter-row" style={{ display: 'block' }}><strong>{h}</strong>{Object.keys(obj).length === 0 ? <div style={{ color: 'var(--slate)' }}>No revenue in this period</div> : Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => <div key={k}>{k.replace(/_/g, ' ')}: {inr(v)}</div>)}</div>
          ))}
        </div>
      </Section>

      <Section title="Costs and unit economics" hint="Only costs you recorded, plus AI cost read from usage. If you have not recorded a cost, it is not counted. Revenue by subject and by board is not tracked yet.">
        <Grid>
          <Stat label="Total recorded costs" m={d.costs.total} money /><Stat label="AI cost actually billed" m={d.costs.aiBilled} money /><Stat label="AI cost at list prices" m={d.costs.aiListEstimate} money />
          <Stat label="Variable costs" m={d.costs.variable} money /><Stat label="Contribution" m={d.margins.contribution} money /><Stat label="Profit" m={d.margins.profit} money /><Stat label="Contribution margin" m={d.margins.contributionMargin} suffix="%" />
          <Stat label="Revenue per paying customer" m={d.unit.revenuePerCustomer} money /><Stat label="AI cost per paying customer" m={d.unit.aiCostPerCustomer} money /><Stat label="Profit per paying customer" m={d.unit.profitPerCustomer} money />
          <Stat label="CAC" m={d.unit.cac} money /><Stat label="Revenue per customer to date" m={d.unit.ltvToDate} money /><Stat label="That ÷ CAC" m={d.unit.ltvToCac} suffix="x" />
        </Grid>
        {Object.keys(d.costs.byCategory).length > 0 && <p style={{ fontSize: '0.88rem' }}>Recorded by category: {Object.entries(d.costs.byCategory).map(([k, v]) => `${EXPENSE_CATEGORIES[k] ?? k} ${inr(v)}`).join(' · ')}</p>}
        <p><a href="/admin/expenses">Record costs and money received</a> · <a href="/admin/ai-costs">AI cost detail</a></p>
      </Section>

      <Section title="Handwritten evaluation economics" hint="Uses YOUR cost assumptions from Pricing and offers → economics. The image count is assumed to be your default page limit.">
        {d.handwritten.economics.status === 'insufficient_data'
          ? <p>Insufficient data: please fill in {d.handwritten.economics.missing.join(', ')} in <a href="/admin/pricing">Pricing and offers → economics</a>.</p>
          : <p><Dot rag={d.handwritten.economics.status === 'review_pricing' ? 'red' : 'green'} /> {inr(d.handwritten.economics.netPriceInr)} selling price − {inr(d.handwritten.economics.totalCostInr ?? 0)} estimated cost = <strong>{inr(d.handwritten.economics.contributionInr ?? 0)}</strong> contribution {d.handwritten.economics.status === 'review_pricing' && <strong style={{ color: '#d03a2f' }}>REVIEW PRICING</strong>} <Tag label="ASSUMED" /></p>}
        <Grid><Stat label="Answers needing a teacher" m={d.handwritten.humanReviewPercent} suffix="%" /><Stat label="Papers marked" m={d.handwritten.papers} /><Stat label="Papers failed" m={d.handwritten.failedPapers} /></Grid>
      </Section>

      <Section title="AI cost and margin risk (this month)" hint="From the AI request ledger. Economic cost = list price, so free-quota use is counted as the subsidy it is. Details and the model switch simulator: AI Economics.">
        {!ai ? <p>Insufficient data (AI ledger unavailable: has migration 0036 been run?).</p> : <>
          <Grid>
            <Stat label="AI cost this month (economic)" m={{ value: ai.monthEconomicInr, label: 'ESTIMATED' } as any} money />
            <Stat label="Billed this month (expected)" m={{ value: ai.monthBilledInr, label: 'ESTIMATED' } as any} money />
            <Stat label="AI cost per student" m={{ value: ai.perStudentInr, label: 'ESTIMATED' } as any} money />
            <Stat label="AI cost per active student" m={{ value: ai.perActiveStudentInr, label: 'ESTIMATED' } as any} money />
            <Stat label="Free-quota use (value at list price)" m={{ value: ai.freeQuotaValueInr, label: 'ESTIMATED' } as any} money />
            <Stat label="Handwritten AI cost per evaluation" m={{ value: ai.handwrittenAvgCostInr, label: 'ESTIMATED' } as any} money />
            <Stat label="Projected AI cost / month at today's users" m={{ value: ai.projectedMonthAtCurrentUse, label: 'ESTIMATED' } as any} money />
            <Stat label="Evaluations at MARGIN_AT_RISK" m={{ value: ai.evaluationsTracked ? ai.marginAtRisk : null, label: 'ACTUAL' } as any} />
          </Grid>
          <p style={{ fontSize: '0.88rem' }}>Calls on a free quota: <strong>{ai.freeCalls}</strong> · paid or unknown plan: <strong>{ai.paidCalls}</strong> · Most-used model: <strong>{ai.mostUsedModel ?? 'Insufficient data'}</strong> · Most expensive model: <strong>{ai.mostExpensiveModel ?? 'Insufficient data'}</strong> · Most expensive feature: <strong>{ai.mostExpensiveFeature ?? 'Insufficient data'}</strong>
            {ai.worstCap && <> · <strong style={{ color: '#d03a2f' }}>{ai.worstCap.label}: {ai.worstCap.pct}% of limit ({ai.worstCap.level})</strong></>} · <a href="/admin/ai-economics">AI Economics →</a></p>
        </>}
      </Section>

      <Section title="Funnel" hint={`${d.range.label}. Each step counts different students, so a step can be larger than the one before it.`}>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}><th>Step</th><th>Students</th><th>% of previous step</th></tr></thead>
          <tbody>{d.funnel.map((f) => <tr key={f.stage} style={{ borderBottom: '1px solid var(--line)' }}><td style={{ padding: '0.35rem 0.3rem' }}>{f.stage}</td><td>{f.count === null ? <span style={{ color: 'var(--slate)' }}>Not tracked: {f.note}</span> : f.count}</td><td>{f.fromPrevious === null ? '—' : `${f.fromPrevious}%`}</td></tr>)}</tbody>
        </table></div>
        <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>Filtering by board, class, subject or language is not available yet: those fields are not stored per sign-up.</p>
      </Section>

      <Section title="Where students came from" hint={`Sign-ups in ${d.range.label}, by first-touch source (links like ?src=whatsapp). Older sign-ups show as direct.`}>
        {Object.keys(d.sources).length === 0 ? <p style={{ color: 'var(--slate)' }}>No sign-ups in this period.</p> : (
          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}><th>Source</th><th>Sign-ups</th><th>Active (30 days)</th><th>Paid</th><th>Revenue</th></tr></thead>
            <tbody>{Object.entries(d.sources).sort((a, b) => b[1].signups - a[1].signups).map(([k, v]) => <tr key={k} style={{ borderBottom: '1px solid var(--line)' }}><td style={{ padding: '0.35rem 0.3rem' }}>{k.replace(/_/g, ' ')}</td><td>{v.signups}</td><td>{v.active}</td><td>{v.paid}</td><td>{inr(v.revenue)}</td></tr>)}</tbody>
          </table></div>)}
        <p style={{ fontSize: '0.85rem' }}>Share links such as <code>yoursite/?src=whatsapp</code>, <code>?src=linkedin</code>, <code>?utm_source=instagram</code>, <code>?ref=referral</code>.</p>
      </Section>

      <Section title="Learning outcomes" hint="Counts only. Detail by subject is at Product dashboard and Metrics.">
        <Grid><Stat label="Average mastery change per finished session" m={d.learning.avgMasteryChange} /><Stat label="Finished sessions" m={d.learning.sessionsFinished} /></Grid>
      </Section>

      <Section title="Sales pipeline (customers and leads)">
        <Grid><Stat label="Open leads" m={d.crm.open} /><Stat label="Potential value" m={d.crm.potential} money /><Stat label="Weighted pipeline" m={d.crm.weighted} money /><Stat label="Follow-ups overdue" m={d.crm.overdue} /><Stat label="Follow-ups due today" m={d.crm.dueToday} /></Grid>
        <p style={{ fontSize: '0.9rem' }}>{CRM_STAGES.map(([k, l]) => `${l} ${d.crm.byStage[k] ?? 0}`).join(' → ')}</p>
        <p><a href="/admin/crm">Open customers &amp; leads</a></p>
      </Section>

      <Section title="Tutors, coaching centres and schools">
        <Grid><Stat label="Tutors active" m={d.b2b.tutorsActive} /><Stat label="Tutors waiting approval" m={d.b2b.tutorsPending} /><Stat label="Centres active" m={d.b2b.centresActive} /><Stat label="Centres waiting approval" m={d.b2b.centresPending} /><Stat label="Paid tutor/centre plans" m={d.b2b.paidOrgPlans} /><Stat label="Schools & institutions in CRM" m={d.b2b.schools} /><Stat label="Pilots" m={d.b2b.pilots} /><Stat label="Institutional revenue" m={d.b2b.institutionalRevenue} money /></Grid>
        <h3 style={{ fontSize: '1rem', marginTop: '0.8rem' }}>Which customer type deserves your time? <span style={{ fontWeight: 400, color: 'var(--slate)' }}>(from your own CRM records)</span></h3>
        <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead><tr style={{ textAlign: 'left', borderBottom: '2px solid var(--line)' }}><th>Type</th><th>Leads</th><th>Won / paid</th><th>Conversion</th><th>Amount paid</th><th>Open potential</th></tr></thead>
          <tbody>{d.typeComparison.map((r) => <tr key={r.kind} style={{ borderBottom: '1px solid var(--line)' }}><td style={{ padding: '0.35rem 0.3rem' }}>{r.label}</td><td>{r.leads}</td><td>{r.won}</td><td>{r.conversion === null ? 'Insufficient data' : `${r.conversion}%`}</td><td>{inr(r.amountPaid)}</td><td>{inr(r.openPotential)}</td></tr>)}</tbody>
        </table></div>
        <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Sales cycle, support burden and strategic value are your own judgement: write them in <a href="/admin/memory">Project memory</a>.</p>
      </Section>

      <Section title="Funding and investors" hint="Facts you recorded. Nothing is filled in for you; unknown means UNKNOWN — VERIFY.">
        <Grid><Stat label="Prospects" m={d.funding.prospects} /><Stat label="Investor meetings / conversations" m={d.funding.meetings} /><Stat label="Potential capital (asked)" m={d.funding.potential} money /><Stat label="Weighted pipeline" m={d.funding.weighted} money /><Stat label="Committed capital" m={d.funding.committed} money /><Stat label="Received capital" m={d.funding.received} money /><Stat label="Government applications" m={d.funding.govtApplications} /><Stat label="Incubator / accelerator applications" m={d.funding.incubatorApplications} /><Stat label="Funding documents missing or old" m={d.funding.docsMissing} /></Grid>
        <p style={{ fontSize: '0.9rem' }}>By type: {Object.keys(d.funding.byKind).length ? Object.entries(d.funding.byKind).map(([k, v]) => `${FUNDING_KINDS[k] ?? k} ${v}`).join(' · ') : 'none yet'}</p>
        <p style={{ fontSize: '0.9rem' }}>By stage: {Object.keys(d.funding.byStage).length ? FUNDING_STAGES.filter(([k]) => d.funding.byStage[k]).map(([k, l]) => `${l} ${d.funding.byStage[k]}`).join(' · ') : 'none yet'}</p>
        <p><a href="/admin/funding">Open funding &amp; investors</a> · <a href="/admin/funding/documents">Documents checklist</a> · <a href="/admin/investor-metrics">Investor-safe metrics</a></p>
      </Section>
    </div></main>
  );
}
