import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { analyseNewFeedback, loadQueue, reportedQuestions, FB_CATEGORY_LABEL, FB_CATEGORIES, FB_STATUS_LABEL, FB_SOURCES, FB_ROLES, FB_IMPACTS, VALIDATION, type FbCategory, type FbStatus, type Priority } from '@adaptive-tutor/core';
import { FeedbackReview } from '@/components/FeedbackReview';
import { FeedbackExtras, ManualFeedbackForm } from '@/components/FeedbackExtras';
import { Section, Tag } from '@/components/founder/Cards';

export const dynamic = 'force-dynamic';

const SEV: Record<string, string> = { high: '#d03a2f', medium: '#e0a100', low: '#3f7a5c' };
const PCOL: Record<string, string> = { P0: '#b3261e', P1: '#d03a2f', P2: '#e0a100', P3: '#3f7a5c' };
const pct = (v: number | null) => (v === null ? 'Not enough data' : `${Math.round(v * 100)}%`);
const dd = (v: number | null) => (v === null ? 'Not enough data' : `${v} days`);

// ADMIN ONLY. Messages from students, parents, tutors and others, sorted into groups by plain rules (no AI cost). Optional AI analysis is a recommendation only.
// Sahayak proposes; a person decides; nothing is changed or deployed by pressing a button here.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const sp = await searchParams;
  const f = sp.f === 'all' || sp.f === 'done' ? sp.f : 'waiting';
  const service = createServiceClient();
  const ran = await analyseNewFeedback(service);
  const qd = await loadQueue(service, { q: sp.q, cat: sp.cat, area: sp.area, src: sp.src, role: sp.role, prio: sp.prio, moat: sp.moat, sort: sp.sort, done: f === 'done', all: f === 'all' });
  const a = qd.analytics;
  const rq = await reportedQuestions(service).catch(() => []);
  const tiles: [string, string | number][] = [['Total feedback', a.total], ['Open groups', a.open], ['Critical (P0)', a.critical], ['High (P1)', a.highPriority], ['New this week', a.newThisWeek], ['Repeats of same words', a.duplicates], ['Approved', a.approved], ['Implemented', a.implemented], ['Awaiting validation', a.awaitingValidation], ['Reopened', a.reopened]];
  const list = (title: string, rows: { c: any; p: Priority }[], none: string) => (
    <div className="chapter-row" style={{ display: 'block', marginBottom: '0.6rem' }}><strong>{title}</strong>
      {rows.length === 0 ? <p style={{ margin: '0.2rem 0', color: 'var(--slate)', fontSize: '0.88rem' }}>{none}</p> : <ol style={{ margin: '0.3rem 0', paddingLeft: '1.2rem', fontSize: '0.88rem' }}>{rows.map(({ c, p }) => <li key={c.id}>{c.title} · {c.report_count} report{c.report_count === 1 ? '' : 's'} · {p.level}</li>)}</ol>}
    </div>
  );
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>Feedback Intelligence</h1>
        <p style={{ color: 'var(--slate)', margin: '0.2rem 0' }}>Signed in as {g.email}. {qd.total} messages in total{ran.analysed ? `; ${ran.analysed} new ones were just sorted` : ''}.</p>
        <AdminNav />
        <p style={{ fontSize: '0.88rem' }}><Tag label="ESTIMATED" /> Groups, severity, priority and &ldquo;likely cause&rdquo; come from fixed rules on the words people wrote; the priority formula is shown on every group. <strong>Sahayak proposes, you decide.</strong> The optional AI analysis is a labelled recommendation and never changes anything. Pressing a button records your decision; it does not change any question, score, price or lesson.</p>
        {(ran.error || qd.error) && <p className="alert">{ran.error ?? qd.error}</p>}
      </div>

      <Section title="At a glance">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>{tiles.map(([l, v]) => <div key={l} className="chapter-row" style={{ display: 'block' }}><span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{l}</span><br /><strong style={{ fontSize: '1.2rem' }}>{v}</strong></div>)}</div>
        <details style={{ marginTop: '0.6rem' }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>Top problems, wins, learning-critical, money-critical, loved features, numbers</summary>
          {list('Top problems (by priority score)', a.top, 'No open groups.')}
          {list('Quick wins (a guess: wording, language and question fixes that matter)', a.quickWins, 'None right now.')}
          {list('Strategic (moat value high or core)', a.strategic, 'Set the moat value on a group to see it here.')}
          {list('Learning-critical (answers, marking, explanations, diagnostic)', a.learning, 'None open.')}
          {list('Money-critical (price, payment)', a.revenue, 'None open.')}
          <div className="chapter-row" style={{ display: 'block', marginBottom: '0.6rem' }}><strong>Top loved features</strong> <span style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>(praise found by plain words; never published as a testimonial)</span>
            {a.loved.length === 0 ? <p style={{ margin: '0.2rem 0', color: 'var(--slate)', fontSize: '0.88rem' }}>No praise recorded yet.</p> : <p style={{ margin: '0.2rem 0', fontSize: '0.88rem' }}>{a.loved.map(([k, n]) => `${k} (${n})`).join(' · ')}</p>}</div>
          <div className="chapter-row" style={{ display: 'block', fontSize: '0.88rem' }}>
            <p style={{ margin: '0.2rem 0' }}><strong>By who:</strong> {a.byRole.map(([k, n]) => `${FB_ROLES[k] ?? k} ${n}`).join(' · ') || 'none'}</p>
            <p style={{ margin: '0.2rem 0' }}><strong>By where it came from:</strong> {a.bySource.map(([k, n]) => `${FB_SOURCES[k] ?? k} ${n}`).join(' · ') || 'none'}</p>
            <p style={{ margin: '0.2rem 0' }}><strong>By feature:</strong> {a.byArea.map(([k, n]) => `${k} ${n}`).join(' · ') || 'none'}</p>
            <p style={{ margin: '0.2rem 0' }}><strong>Last 30 days:</strong> {a.perDay.reduce((s, d) => s + d.n, 0)} messages ({a.perDay.slice(-7).reduce((s, d) => s + d.n, 0)} in the last 7 days).</p>
            <p style={{ margin: '0.2rem 0' }}><strong>Outcomes:</strong> {Object.entries(a.byOutcome).map(([k, n]) => `${FB_STATUS_LABEL[k as FbStatus] ?? k} ${n}`).join(' · ') || 'none'}</p>
            <p style={{ margin: '0.2rem 0' }}><strong>Average days to a decision:</strong> {dd(a.avgReviewDays)} · <strong>to validation:</strong> {dd(a.avgResolveDays)} · repeat rate {pct(a.duplicateRate)} · rejection rate {pct(a.rejectionRate)} · implementation rate {pct(a.implementationRate)} · regression rate {pct(a.regressionRate)}</p>
            <p style={{ margin: '0.2rem 0', color: 'var(--slate)' }}>&ldquo;Not enough data&rdquo; means nothing has been decided yet, so no figure is made up.</p></div>
        </details>
      </Section>

      {rq.length > 0 && (
        <details style={{ margin: '0.6rem 0' }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>Questions people reported ({rq.length})</summary>
          <p style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>From the &ldquo;Something wrong with this question?&rdquo; link. Open the question in the question bank or register with the id. Counts only; check the question yourself or with a teacher before changing anything.</p>
          <ol style={{ fontSize: '0.88rem', paddingLeft: '1.2rem' }}>{rq.map((x) => <li key={x.questionId}><code>{x.questionId}</code> &middot; {x.reports} report{x.reports === 1 ? '' : 's'} &middot; last {new Date(x.latest).toLocaleDateString('en-IN')} &middot; &ldquo;{x.sample}&rdquo;</li>)}</ol>
        </details>
      )}

      <ManualFeedbackForm sources={FB_SOURCES} roles={FB_ROLES} impacts={FB_IMPACTS} />

      <form method="get" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', margin: '0.6rem 0' }}>
        <input type="hidden" name="f" value={f} />
        <input name="q" placeholder="Search words, question, task, version" defaultValue={sp.q} style={{ padding: '0.4rem' }} />
        <select name="cat" defaultValue={sp.cat ?? ''}><option value="">Any kind</option>{FB_CATEGORIES.map((c) => <option key={c} value={c}>{FB_CATEGORY_LABEL[c as FbCategory]}</option>)}</select>
        <select name="area" defaultValue={sp.area ?? ''}><option value="">Any feature</option>{qd.areas.map((x) => <option key={x}>{x}</option>)}</select>
        <select name="role" defaultValue={sp.role ?? ''}><option value="">Anyone</option>{Object.entries(FB_ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select name="src" defaultValue={sp.src ?? ''}><option value="">Any source</option>{Object.entries(FB_SOURCES).concat([['in_app', 'In the app']]).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select name="prio" defaultValue={sp.prio ?? ''}><option value="">Any priority</option>{['P0', 'P1', 'P2', 'P3'].map((p) => <option key={p}>{p}</option>)}</select>
        <select name="moat" defaultValue={sp.moat ?? ''}><option value="">Any moat value</option>{['core', 'high', 'medium', 'low', 'none'].map((p) => <option key={p}>{p}</option>)}</select>
        <select name="sort" defaultValue={sp.sort ?? 'priority'}><option value="priority">Highest priority</option><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="reports">Most reports</option></select>
        <button className="btn btn--small btn--primary">Apply</button>
      </form>
      <div className="hero__actions">
        {([['waiting', 'Waiting for me'], ['done', 'Decided'], ['all', 'Everything']] as const).map(([k, l]) => <a key={k} href={`?f=${k}`} className={`btn btn--small ${f === k ? 'btn--accent' : 'btn--ghost'}`}>{l}</a>)}
      </div>
      <Section title={f === 'waiting' ? 'Groups waiting for your decision' : f === 'done' ? 'Groups you have decided' : 'All groups'} hint="Sorted as chosen above (default: highest priority first).">
        {qd.rows.length === 0 ? <p style={{ color: 'var(--slate)' }}>{qd.total === 0 ? 'No feedback yet. When people use the feedback button, or you add feedback above, it appears here in groups.' : 'Nothing matches.'}</p> : qd.rows.map(({ c, p }) => (
          <div key={c.id} className="chapter-row" style={{ display: 'block', borderLeft: `5px solid ${SEV[c.severity]}`, marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'baseline' }}>
              <span style={{ background: PCOL[p.level], color: '#fff', borderRadius: 6, padding: '0 0.45rem', fontWeight: 700 }}>{p.level}</span>
              <strong style={{ fontSize: '1.05rem' }}>{FB_CATEGORY_LABEL[c.category as FbCategory]} · {c.feature_area}</strong>
              <span>{FB_STATUS_LABEL[c.status as FbStatus]}</span>
              {c.moat && c.moat !== 'none' && <span style={{ fontSize: '0.8rem' }}>moat: {c.moat}</span>}
              {c.defer_until && c.status === 'deferred' && <span style={{ fontSize: '0.8rem' }}>review again {c.defer_until}</span>}
            </div>
            <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
              <strong>{c.report_count}</strong> report{c.report_count === 1 ? '' : 's'}{c.users ? ` from about ${c.users} ${c.users === 1 ? 'person' : 'people'}` : ''}{c.duplicate_count ? ` (${c.duplicate_count} repeats of the same words)` : ''}{c.roles?.length ? ` · ${c.roles.map((r: string) => FB_ROLES[r] ?? r).join(', ')}` : ''} · severity <strong>{c.severity}</strong> · care needed <strong>{c.risk}</strong>
              {c.affected_pages.length > 0 && <> · pages: {c.affected_pages.slice(0, 4).join(', ')}</>}
            </p>
            <details style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}><summary style={{ cursor: 'pointer' }}>Why {p.level}? Score {p.score}{c.priority_override ? ` (set by hand: ${c.priority_reason})` : p.escalated ? ' (raised automatically)' : ''}</summary>
              <ul style={{ margin: '0.3rem 0', paddingLeft: '1.1rem' }}>{p.parts.map((x) => <li key={x.label}>{x.label}: <strong>{x.points}</strong> &ndash; {x.why}</li>)}</ul>
              {p.reasons.map((r) => <p key={r} style={{ margin: '0.2rem 0' }}>&#9888; {r}</p>)}
              <p style={{ margin: '0.2rem 0', color: 'var(--slate)' }}>Total = sum of the lines above. P0 is 60 or more, P1 40+, P2 20+, otherwise P3. Learning-quality and privacy cases are lifted to at least P1 (privacy P0) and the reason is shown.</p></details>
            {c.likely_cause && <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Likely cause (a guess by rules):</strong> {c.likely_cause}</p>}
            {c.proposed_action && <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Proposed action:</strong> {c.proposed_action}</p>}
            {c.ai_analysis && (
              <div style={{ margin: '0.4rem 0', padding: '0.5rem 0.7rem', border: '1px dashed var(--line)', borderRadius: 8, fontSize: '0.88rem' }}>
                <strong>{c.ai_analysis.label}</strong> <span style={{ color: 'var(--slate)' }}>({c.ai_analysis.provider ?? 'provider not recorded'}{c.ai_analysis.model ? ` / ${c.ai_analysis.model}` : ''}, prompt {c.ai_analysis.promptVersion}, read {c.ai_analysis.messagesRead} messages, confidence {c.ai_analysis.confidence}%)</span>
                <p style={{ margin: '0.25rem 0' }}>{c.ai_analysis.summary}</p>
                <p style={{ margin: '0.25rem 0' }}><strong>Suspected cause:</strong> {c.ai_analysis.suspected_cause}</p>
                <p style={{ margin: '0.25rem 0' }}><strong>Suggested solution:</strong> {c.ai_analysis.recommended_solution} <em>({String(c.ai_analysis.recommended_action).replace(/_/g, ' ')}; learning impact {c.ai_analysis.learning_impact}; moat {c.ai_analysis.moat_impact})</em></p>
                <p style={{ margin: '0.25rem 0', color: 'var(--slate)' }}><strong>Why:</strong> {c.ai_analysis.reasoning} This is advice, not a decision.</p>
              </div>
            )}
            {c.risk === 'high' && <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#a13a2f' }}>High-risk area (scores, answers, plans or prices): approval needs a note and a tick saying you tested it.</p>}
            {c.validation_status && <p style={{ margin: '0.2rem 0', fontSize: '0.85rem' }}>Validation: <strong>{VALIDATION[c.validation_status] ?? c.validation_status}</strong>{c.deployment_version ? ` · deployed ${c.deployment_version}` : ''}{c.validation_note ? ` · ${c.validation_note}` : ''}</p>}
            {c.reviewer_note && <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--slate)' }}>Last note by {c.decided_by}: {c.reviewer_note}</p>}
            <FeedbackReview id={c.id} status={c.status} risk={c.risk} />
            <FeedbackExtras id={c.id} status={c.status} moat={c.moat ?? 'none'} override={c.priority_override ?? null} task={c.task ?? null} ai={c.ai_analysis ?? null} validation={c.validation_status ?? null} />
          </div>
        ))}
      </Section>
      <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Not built yet: showing people the status of their own feedback, e-mail/WhatsApp notifications, linking a group to a roadmap item or an A/B test, a feedback button on every individual question (the form already accepts a question id; each screen must send it), and editable severity/threshold settings (the formula and thresholds are fixed in code and shown above).</p>
    </div></main>
  );
}
