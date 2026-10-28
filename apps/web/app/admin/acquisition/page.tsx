import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { AcquisitionForms } from '@/components/AcquisitionForms';
import { Tag, Section, inr } from '@/components/founder/Cards';
import { loadRaw, buildReport, untaggedSales, rangeBounds, RANGES, MODEL_LABEL, REPORTING_MODELS, sourceLabel, EXPERIMENT_METRIC_LABEL, CUSTOMER_LABEL, NOT_AVAILABLE, type ReportingModel, type Row } from '@adaptive-tutor/core';

export const dynamic = 'force-dynamic';

// ADMIN ONLY. Where did each person come from, what did they do, did they pay, did they refer anyone. Counts only: no names, no answers.
// Rates show "Insufficient data" below the minimum sample. Visitors and registrations are not directly matched (only tracked-link arrivals are).
const na = (v: number | null | undefined, suffix = '') => (v === null || v === undefined ? <span style={{ color: 'var(--slate)' }}>{NOT_AVAILABLE}</span> : `${v.toLocaleString('en-IN')}${suffix}`);
const rt = (v: number | null | undefined) => (v === null || v === undefined ? <span style={{ color: 'var(--slate)' }}>Insufficient data</span> : `${v}%`);
const money = (v: number | null | undefined) => (v === null || v === undefined ? <span style={{ color: 'var(--slate)' }}>{NOT_AVAILABLE}</span> : inr(v));
const th = { textAlign: 'left' as const, padding: '0.3rem', borderBottom: '2px solid var(--line)', fontSize: '0.78rem', whiteSpace: 'nowrap' as const };
const td = { padding: '0.3rem', borderBottom: '1px solid var(--line)', fontSize: '0.86rem' };
function Table({ head, rows, empty = 'Nothing recorded for this period yet.' }: { head: string[]; rows: React.ReactNode[][]; empty?: string }) {
  if (!rows.length) return <p style={{ color: 'var(--slate)' }}>{empty}</p>;
  return <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', width: '100%' }}><thead><tr>{head.map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}</tbody></table></div>;
}
const rowCells = (r: Row, extra: React.ReactNode[] = []) => [<strong key="l">{r.label}</strong>, r.people, r.students, na(r.visits), r.arrivals === null ? na(null) : `${r.arrivals} (${r.arrivalsMatched ?? 0} matched)`, r.diagDone, rt(r.diagRate), r.activated, rt(r.activationRate), r.paid, rt(r.paidRate), money(r.revenue), money(r.revPerCustomer), ...extra];
const ROWHEAD = ['', 'Sign-ups', 'Students', 'Visits', 'Tracked arrivals', 'Diagnostics done', 'Diag. rate', 'Activated', 'Activation', 'Paid', 'Paid rate', 'Revenue', 'Revenue / customer'];
const Dl = ({ href, kind, q }: { href?: string; kind: string; q: string }) => <a className="btn btn--ghost btn--small" href={`/api/admin/acquisition/export?kind=${kind}&${q}`}>Download CSV</a>;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const sp = await searchParams; const service = createServiceClient();
  const rb = rangeBounds(sp.r ?? '30', { from: sp.from, to: sp.to });
  const { raw, missing } = await loadRaw(service);
  const model = ((REPORTING_MODELS as readonly string[]).includes(sp.model ?? '') ? sp.model : raw.settings.model) as ReportingModel;
  const seg = { board: sp.board, grade: sp.grade, state: sp.state, country: sp.country, subject: sp.subject, type: sp.type };
  const rep = buildReport(raw, { range: rb, rangeLabel: rb.label, model, segment: seg });
  const untagged = await untaggedSales(service).catch(() => []);
  const q = new URLSearchParams(Object.entries({ r: sp.r ?? '30', from: sp.from, to: sp.to, model }).filter(([, v]) => v) as [string, string][]).toString();
  const notInstalled = missing.includes('acquisition_attribution') || missing.includes('acq_partners');
  const ex = rep.selected;
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>Acquisition &amp; Referral Intelligence</h1>
        <p style={{ color: 'var(--slate)', margin: '0.2rem 0' }}>Where people came from, what they did, whether they paid, and whether they referred others. Counts only; no names or answers. {rep.visitorsNote}</p>
        <AdminNav />
      </div>
      {(notInstalled || missing.length > 0) && <p role="alert" style={{ background: '#fff4e5', border: '1px solid #e0a100', padding: '0.5rem 0.7rem', borderRadius: 8 }}>{notInstalled ? 'The acquisition database update (0048) has not been run yet, so sources are read from the older sign-up record and partners are unavailable. Run npm run db:migrate.' : `Some data could not be read: ${missing.join(', ')}. Those parts show "Not available".`}</p>}

      <Section title="What should I do next?" hint="At most five suggestions from the numbers below. They are recommendations, not facts.">
        <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>{rep.actions.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a.href ? <a href={a.href}>{a.text}</a> : a.text}</li>)}</ol>
        {rep.insights.length > 0 && <details style={{ marginTop: 6 }}><summary style={{ cursor: 'pointer' }}>Why? ({rep.insights.length} observations)</summary><ul>{rep.insights.map((t, i) => <li key={i}>{t}</li>)}</ul><p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>These describe association, not cause. Advice appears only when a source has at least {rep.minSample} people.</p></details>}
      </Section>

      <form method="get" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center', marginTop: '0.8rem' }}>
        <select name="r" defaultValue={rb.key}>{RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <span style={{ fontSize: '0.82rem' }}>custom <input type="date" name="from" defaultValue={sp.from} /> to <input type="date" name="to" defaultValue={sp.to} /></span>
        <select name="model" defaultValue={model} title="Reporting model">{REPORTING_MODELS.map((m) => <option key={m} value={m}>{MODEL_LABEL[m].split(' (')[0]}</option>)}</select>
        {([['board', 'Board', rep.segments.boards], ['grade', 'Class', rep.segments.grades], ['subject', 'Subject', rep.segments.subjects], ['state', 'State', rep.segments.states], ['country', 'Country', rep.segments.countries]] as [string, string, string[]][]).map(([k, l, vals]) => (
          <select key={k} name={k} defaultValue={sp[k] ?? ''} title={l}><option value="">{l}: all</option>{vals.map((v) => <option key={v} value={v}>{v}</option>)}</select>))}
        <select name="type" defaultValue={sp.type ?? ''} title="Customer type"><option value="">Type: all</option>{Object.entries(CUSTOMER_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className="btn btn--small btn--accent">Show</button>
      </form>
      <p style={{ fontSize: '0.84rem', color: 'var(--slate)' }}>Showing <strong>{rb.label}</strong> · model: <strong>{MODEL_LABEL[model]}</strong>. People are grouped by the day they signed up; &ldquo;paid&rdquo;, &ldquo;activated&rdquo; and revenue are what they did <em>since</em>. Segments left blank are shown as &ldquo;Unknown / not provided&rdquo;, never dropped. <Tag label="ACTUAL" /> counted <Tag label="CALCULATED" /> worked out from counts <Tag label="MANUAL" /> typed in by you <Tag label="INSUFFICIENT DATA" /> not enough to show.</p>

      <Section title="A. Executive summary" hint="Events that happened in each period. Visitors are unique per day, summed.">
        <Table head={['Period', 'Visitors', 'Sessions', 'Registrations', 'Diagnostics done', 'Activated learners', 'Paid customers', 'Revenue', 'Referral sign-ups', 'Referred customers']}
          rows={[...rep.exec, ex].map((e) => [<strong key="l">{e.label}</strong>, na(e.visitors), na(e.sessions), e.registrations, e.diagnostics, e.activated, e.paidCustomers, money(e.revenue), e.referrals, e.referredCustomers])} />
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Activated = a second learning session. Paid customers count sales to organisations once per sale. <Tag label="ACTUAL" /></p>
      </Section>

      <Section title="B. Acquisition funnel (people who signed up in the period)" hint={`Only stages with evidence are shown. ${rep.visitorsNote} Tracked-link arrivals ARE matched: ${rep.trackedLinkMatch.matched} of ${rep.trackedLinkMatch.arrivals} became an account${rep.trackedLinkMatch.rate === null ? ' (rate: Insufficient data)' : ` (${rep.trackedLinkMatch.rate}%)`}.`}>
        <Table head={['Stage', 'Count', 'Note']} rows={rep.funnel.map((f) => [f.stage, f.count === null ? <span style={{ color: 'var(--slate)' }}>Insufficient data</span> : f.count.toLocaleString('en-IN'), <span key="n" style={{ fontSize: '0.78rem', color: 'var(--slate)' }}>{f.note ?? ''}<Tag label={f.label} /></span>])} />
        <h3 style={{ fontSize: '1rem', marginTop: '0.8rem' }}>By source <Dl kind="sources" q={q} /></h3>
        <Table head={[...ROWHEAD.map((h, i) => (i === 0 ? 'Source' : h)), 'Cash spend', 'Cost / customer', 'Kind']} rows={rep.sources.map((r) => rowCells(r, [money(r.spend), money(r.cac), r.organic ? 'Organic acquisition (no cash cost recorded)' : r.spend ? 'Cash acquisition' : '—']))} empty="No sign-ups in this period." />
      </Section>

      <Section title="C. Channel comparison" hint="Facebook, Instagram, LinkedIn, WhatsApp, Google, referral, tutor, coaching centre, school, founder, offline, direct and everything else.">
        <Dl kind="channels" q={q} /><Table head={ROWHEAD.map((h, i) => (i === 0 ? 'Channel' : h))} rows={rep.channels.map((r) => rowCells(r))} />
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>&ldquo;Organic&rdquo; here means no cash spent. It is not &ldquo;free&rdquo;: your time is not counted as money. Customer conversion = paid ÷ students, shown only from {rep.minSample} students.</p>
      </Section>

      <Section title="D. Campaign performance"><Dl kind="campaigns" q={q} />
        <Table head={['Campaign', 'Sign-ups', 'Visits', 'Diagnostics', 'Active', 'Customers', 'Revenue', 'Paid rate', 'Revenue / customer', 'Budget (plan)', 'Cash spend', 'Cost / customer']}
          rows={rep.campaigns.map((c) => [<strong key="n">{c.name}</strong>, c.people, na(c.visits), c.diagDone, c.activated, c.paid, money(c.revenue), rt(c.paidRate), money(c.revPerCustomer), money(c.budget), money(c.spend), money(c.cac)])} empty="No campaign-tagged sign-ups in this period. Use the tracked links from the Social Media Growth Engine." />
      </Section>

      <Section title="E. Content performance" hint="Posts are ranked by revenue, then customers, sign-ups, diagnostics, clicks, engagement: never by likes. Impressions, clicks and engagement are typed in by you (MANUAL); arrivals and sign-ups are counted from tracked links.">
        <Dl kind="content" q={q} /><Table head={['Post', 'Platform', 'Campaign', 'Impressions', 'Clicks', 'Link arrivals', 'Sign-ups', 'Diagnostics', 'Customers', 'Revenue', 'Referrals', 'Outcome score']}
          rows={rep.content.slice(0, 40).map((c) => [<strong key="s">{c.slug}</strong>, c.platform, c.campaign ?? '—', na(c.impressions), na(c.clicks), na(c.arrivals), c.signups, c.diagnostics, c.customers, money(c.revenue), c.referrals, c.score])} empty="No published posts yet." />
        <p style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Outcome score = points for sign-ups, diagnostics, active learners and paid customers (weights in Settings). A post is credited with people whose {model === 'last_touch' ? 'last' : 'first'} tracked link was that post.</p>
      </Section>

      <Section title="F. Referrals" hint="Both invite systems are included. Rewards stay a manual decision; nothing here pays or credits anyone.">
        <Table head={['Measure', 'Value']} rows={[
          ['Invite codes created', rep.referral.codes], ['Invitations sent', <span key="i" style={{ color: 'var(--slate)' }}>{rep.referral.invitationsNote}</span>], ['Redemptions (joined through an invite)', rep.referral.redemptions], ['Qualified (finished a real first diagnostic)', rep.referral.qualified],
          ['People who referred', rep.referral.referrers], ['Active referrers (a sign-up this period)', rep.referral.activeReferrers], ['Referred: diagnostics completed', rep.referral.diagDone], ['Referred: active learners', rep.referral.activated], ['Referred: paid customers', rep.referral.paid], ['Referral revenue', money(rep.referral.revenue)],
          ['Rewards pending / approved / declined', `${rep.referral.pending} / ${rep.referral.approved} / ${rep.referral.declined}`],
          ['Reward liability', <span key="l">{rep.referral.liabilityDays} bonus access days {rep.referral.liabilityDaysEstimated ? <Tag label="ESTIMATED" /> : <Tag label="ACTUAL" />} · money: Not available (no money rewards exist)</span>]]} />
        <h3 style={{ fontSize: '1rem', marginTop: '0.8rem' }}>Top referrers (quality = weighted outcomes, not volume) <Dl kind="referrals" q={q} /></h3>
        <Table head={['Referrer', 'Sign-ups', 'Diagnostics', 'Active', 'Paid', 'Revenue', 'Quality score']} rows={rep.referral.topByQuality.map((r) => [`${r.role} · ${r.code}`, r.signups, r.diagDone, r.activated, r.paid, money(r.revenue), r.quality])} empty="No referred people in this period." />
        <details><summary style={{ cursor: 'pointer' }}>Top by sign-ups, active learners, revenue</summary>
          {([['By sign-ups', rep.referral.topBySignups], ['By active learners', rep.referral.topByActivated], ['By revenue', rep.referral.topByRevenue]] as const).map(([t, list]) => <div key={t}><strong>{t}:</strong> {list.length ? list.map((r) => `${r.role} ${r.code} (${r.signups}/${r.activated}/₹${r.revenue})`).join(' · ') : 'none yet'}</div>)}</details>
      </Section>

      <Section title="Partners: tutors, coaching centres, schools" hint="Partner → students → active → paid → revenue. A code is shared as a link ending ?p=CODE. Reward status is your own record; no commission is promised or paid by Sahayak." >
        <div id="partners" /><Dl kind="partners" q={q} />
        <Table head={['Code', 'Type', 'Stage', 'Students (attributed + linked)', 'Diagnostics', 'Active', 'Paid', 'Revenue', 'Reward (manual)']} rows={rep.partners.map((p) => [<strong key="c">{p.code}</strong>, p.kind, p.status, `${p.students} (${p.attributed} + ${p.linked})`, p.diagDone, p.activated, p.paid, money(p.revenue), p.rewardStatus])} empty="No partners yet. Add one below." />
        <h3 style={{ fontSize: '1rem', marginTop: '0.8rem' }}>By customer type</h3>
        <Table head={['Type', 'New accounts', 'Leads (CRM)', 'Meetings', 'Pilots', 'Active', 'Students brought', 'Revenue']} rows={rep.customerTypes.map((t) => [t.label, t.accounts, na(t.leads), na(t.meetings), na(t.pilots), na(t.active), na(t.students), money(t.revenue)])} />
        <p style={{ fontSize: '0.84rem' }}><strong>Students / families:</strong> sign-ups {rep.studentEconomics.signups}, paid {rep.studentEconomics.paid}, conversion {rt(rep.studentEconomics.conversion)}, revenue {money(rep.studentEconomics.revenue)}, revenue / customer {money(rep.studentEconomics.revPerCustomer)}, 7-day return {rt(rep.studentEconomics.ret7)}, referral rate {rt(rep.studentEconomics.referralRate)}, cost per customer {money(rep.studentEconomics.cac)}.</p>
      </Section>

      <Section title="Cohorts" hint="People grouped by sign-up month and source. Returns are counted only for people old enough to measure (shown as x of y).">
        <Dl kind="cohorts" q={q} /><Table head={['Cohort', 'People', 'Activated', 'D1 return', 'D7 return', 'D30 return', 'Paid', 'Revenue']}
          rows={rep.cohorts.bySource.slice(0, 40).map((c) => [<strong key="l">{c.label}</strong>, c.people, rt(c.activationRate), c.ret1.of ? `${c.ret1.n} of ${c.ret1.of}` : '—', c.ret7.of ? `${c.ret7.n} of ${c.ret7.of}${c.ret7.rate === null ? '' : ` (${c.ret7.rate}%)`}` : '—', c.ret30.of ? `${c.ret30.n} of ${c.ret30.of}${c.ret30.rate === null ? '' : ` (${c.ret30.rate}%)`}` : '—', rt(c.paidRate), money(c.revenue)])} />
        <details><summary style={{ cursor: 'pointer' }}>By campaign and by customer type</summary>
          <Table head={['Cohort', 'People', 'Activated', 'Paid', 'Revenue']} rows={[...rep.cohorts.byCampaign.slice(0, 20), ...rep.cohorts.byType.slice(0, 20)].map((c) => [c.label, c.people, rt(c.activationRate), rt(c.paidRate), money(c.revenue)])} /></details>
      </Section>

      <Section title="Offline and organisation sales" hint="Money received that is not tied to a sign-up (tutors, centres, schools, direct sales), by source. Student sales are inside the tables above.">
        <div id="sales" /><Table head={['Source', 'Sales', 'Amount']} rows={rep.sales.bySource.map((s) => [s.label, s.count, money(s.amount)])} empty="No organisation sales in this period." />
        <Table head={['Date', 'Type', 'Source', 'Partner', 'Campaign', 'Amount']} rows={rep.sales.recent.map((s) => [s.date, s.kind, sourceLabel(s.source), s.partner ?? '—', s.campaign ?? '—', money(s.amount)])} empty="" />
      </Section>

      <Section title="Business metrics" hint="AI cost uses the same usage ledger as AI Economics (public list prices). Teacher cost is only what you recorded as an expense. Nothing is guessed.">
        <Table head={['Measure', 'Value', 'Status']} rows={[
          ['Customers (period)', rep.business.customers, <Tag key="a" label="ACTUAL" />], ['Revenue (period)', money(rep.business.revenue), <Tag key="b" label="ACTUAL" />], ['Revenue per customer (period)', money(rep.business.revPerCustomer), <Tag key="c" label="CALCULATED" />],
          ['AI cost (period)', money(rep.business.aiCost), <Tag key="d" label="ESTIMATED" />], ['Teacher / evaluator cost (recorded)', money(rep.business.teacherCost), <Tag key="e" label="MANUAL" />], ['Contribution', money(rep.business.contribution), <Tag key="f" label={rep.business.contribution === null ? 'INSUFFICIENT DATA' : 'ESTIMATED'} />],
          ['Contribution margin', rt(rep.business.margin), <Tag key="g" label={rep.business.margin === null ? 'INSUFFICIENT DATA' : 'ESTIMATED'} />], ['Cash marketing spend tagged', money(rep.business.spendTagged), <Tag key="h" label="MANUAL" />],
          ['Customer acquisition cost', money(rep.business.cac), <span key="i" style={{ fontSize: '0.78rem' }}>{rep.business.cacNote}</span>], ['Revenue per customer to date', money(rep.business.ltvToDate), <Tag key="j" label="CALCULATED" />], ['Revenue to date ÷ acquisition cost', rep.business.ltvToCac === null ? <span key="k" style={{ color: 'var(--slate)' }}>Not available</span> : `${rep.business.ltvToCac}×`, <span key="l" style={{ fontSize: '0.78rem' }}>No predicted lifetime value is shown until there is enough history.</span>],
          ['Referral revenue', money(rep.business.referralRevenue), <Tag key="m" label="ACTUAL" />], ['Referral reward liability', `${rep.business.liabilityDays} bonus days`, <Tag key="n" label="ACTUAL" />]]} />
      </Section>

      <Section title="Journeys (pseudonymous)" hint="From source to payment to referral, for people who paid or referred someone. Where a step cannot be linked it says &ldquo;Not linked&rdquo;.">
        {rep.chains.length === 0 ? <p style={{ color: 'var(--slate)' }}>No paying or referring people yet.</p> : rep.chains.map((c) => (
          <details key={c.who} style={{ marginBottom: 4 }}><summary style={{ cursor: 'pointer' }}><strong>{c.who}</strong> · {inr(c.revenue)} (including people they referred)</summary><ul style={{ margin: '0.3rem 0' }}>{c.steps.map((s, i) => <li key={i}><strong>{s.label}:</strong> {s.value}</li>)}</ul></details>))}
      </Section>

      <Section title="Experiments">
        <Table head={['Experiment', 'Metric', 'Status', 'A (people / result)', 'B (people / result)', 'Reading']} rows={rep.experiments.map((x) => [<strong key="n">{x.name}</strong>, EXPERIMENT_METRIC_LABEL[x.metric] ?? x.metric, x.status, `${x.aN} / ${x.aValue === null ? 'Insufficient data' : x.aValue}`, `${x.bN} / ${x.bValue === null ? 'Insufficient data' : x.bValue}`, <span key="v" style={{ fontSize: '0.8rem' }}>{x.verdict}</span>])} empty="No experiments yet." />
      </Section>

      <Section title="Data quality" hint="Things that make these numbers less reliable, and where to fix them.">
        <Table head={['Issue', 'Count', 'Severity', 'Fix']} rows={rep.quality.map((i) => [i.title, i.count, <strong key="s" style={{ color: i.severity === 'high' ? '#b3261e' : i.severity === 'medium' ? '#8a5a00' : 'var(--slate)' }}>{i.severity}</strong>, <a key="f" href={i.href}>{i.fix}</a>])} empty="No data-quality problems found." />
      </Section>

      <Section title="Add or change records"><AcquisitionForms settings={raw.settings} untagged={untagged} partnerCodes={rep.partners.map((p) => p.code)} />
        <p style={{ fontSize: '0.84rem' }}>Downloads: <a href={`/api/admin/acquisition/export?kind=acquisition&${q}`}>every account (short id only)</a> · <a href={`/api/admin/acquisition/export?kind=customers&${q}`}>paying customers</a></p></Section>
    </div></main>
  );
}
