import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { analyseNewFeedback, listClusters, FB_CATEGORY_LABEL, FB_STATUS_LABEL, type FbCategory, type FbStatus } from '@adaptive-tutor/core';
import { FeedbackReview } from '@/components/FeedbackReview';
import { Section, Tag } from '@/components/founder/Cards';

export const dynamic = 'force-dynamic';

const SEV: Record<string, string> = { high: '#d03a2f', medium: '#e0a100', low: '#3f7a5c' };

// ADMIN ONLY. Messages from students and parents, sorted into groups by plain rules (no AI, no cost).
// Sahayak proposes; a person decides; nothing is changed or deployed by pressing a button here.
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const g = await adminPageGate();
  if ('gate' in g) return g.gate;
  const sp = await searchParams;
  const f = sp.f === 'all' || sp.f === 'done' ? sp.f : 'waiting';
  const service = createServiceClient();
  const ran = await analyseNewFeedback(service);
  const { clusters, total, error } = await listClusters(service, f);
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-3)', margin: 0 }}>Feedback Intelligence</h1>
        <p style={{ color: 'var(--slate)', margin: '0.2rem 0' }}>Signed in as {g.email}. {total} messages in total{ran.analysed ? `; ${ran.analysed} new ones were just sorted` : ''}.</p>
        <AdminNav />
        <p style={{ fontSize: '0.88rem' }}><Tag label="ESTIMATED" /> Groups, severity and “likely cause” are guesses from the words people wrote, using fixed rules. No AI is used here, so there is no AI cost. <strong>Sahayak proposes, you decide.</strong> Pressing a button only records your decision; it does not change any question, score, price or lesson.</p>
        {(ran.error || error) && <p className="alert">{ran.error ?? error}</p>}
        <div className="hero__actions">
          {([['waiting', 'Waiting for me'], ['done', 'Decided'], ['all', 'Everything']] as const).map(([k, l]) => <a key={k} href={`?f=${k}`} className={`btn btn--small ${f === k ? 'btn--accent' : 'btn--ghost'}`}>{l}</a>)}
        </div>
      </div>
      <Section title={f === 'waiting' ? 'Groups waiting for your decision' : f === 'done' ? 'Groups you have decided' : 'All groups'} hint="Most serious first, then most reported.">
        {clusters.length === 0 ? <p style={{ color: 'var(--slate)' }}>{total === 0 ? 'No feedback yet. When students or parents use the feedback button, their messages appear here in groups.' : 'Nothing here.'}</p> : clusters.map((c) => (
          <div key={c.id} className="chapter-row" style={{ display: 'block', borderLeft: `5px solid ${SEV[c.severity]}`, marginBottom: '0.8rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'baseline' }}>
              <strong style={{ fontSize: '1.05rem' }}>{FB_CATEGORY_LABEL[c.category as FbCategory]} · {c.feature_area}</strong>
              <span>{FB_STATUS_LABEL[c.status as FbStatus]}</span>
            </div>
            <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
              <strong>{c.report_count}</strong> report{c.report_count === 1 ? '' : 's'}{c.duplicate_count ? ` (${c.duplicate_count} repeats of the same words)` : ''} · severity <strong>{c.severity}</strong> · care needed <strong>{c.risk}</strong>
              {c.affected_pages.length > 0 && <> · pages: {c.affected_pages.slice(0, 4).join(', ')}</>}
            </p>
            {c.likely_cause && <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Likely cause (a guess):</strong> {c.likely_cause}</p>}
            {c.proposed_action && <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Proposed action:</strong> {c.proposed_action}</p>}
            {c.risk === 'high' && <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#a13a2f' }}>High-risk area (scores, answers, plans or prices): approval needs a note and a tick saying you tested it.</p>}
            {c.reviewer_note && <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--slate)' }}>Last note by {c.decided_by}: {c.reviewer_note}</p>}
            <FeedbackReview id={c.id} status={c.status} risk={c.risk} />
          </div>
        ))}
      </Section>
      <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>Not built yet: which exact questions were reported (the feedback button records the page, not the question), and AI-written fix proposals (REQUIRES PROVIDER and your approval of the cost).</p>
    </div></main>
  );
}
