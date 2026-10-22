import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { loadEngagementMetrics, loadEngagementSettings } from '@adaptive-tutor/core';
import { FlagReviewButton } from '@/components/engagement/AdminEngagement';

export const dynamic = 'force-dynamic';
const P = (v: number | null, u = '%') => (v === null ? 'Insufficient data' : `${v}${u}`);
function Tile({ label, value, note }: { label: string; value: string | number; note?: string }) { return <div className="stat-tile"><span className="stat-tile__value">{value}</span><span className="stat-tile__label">{label}{note ? ` · ${note}` : ''}</span></div>; }

// ADMIN ONLY. Counts of what happened; a rate with too few students behind it says "Insufficient data". No names or contact details.
export default async function Page() {
  const g = await adminPageGate(); if ('gate' in g) return g.gate;
  const s = createServiceClient(); const settings = await loadEngagementSettings(s);
  const m = await loadEngagementMetrics(s, settings);
  const maxA = Math.max(1, ...m.trend.map((t) => t.active));
  return (
    <main className="page"><div className="shell">
      <div style={{ paddingTop: 'var(--space-3)' }}>
        <h1 style={{ fontSize: 'var(--step-2)' }}>Student engagement</h1><AdminNav />
        <p style={{ color: 'var(--slate)' }}>As of {m.asOf} (India time). All numbers are ACTUAL counts from the database. A rate needs at least 5 students behind it, otherwise it shows &quot;Insufficient data&quot;. Engagement is judged by learning, not screen time.</p>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Activity</h2>
        <div className="stat-tile-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <Tile label="Students" value={m.totalStudents} /><Tile label="Active in 30 days" value={m.active30} /><Tile label="DAU" value={m.dau} /><Tile label="WAU" value={m.wau} />
          <Tile label="MAU" value={m.mau} /><Tile label="DAU / WAU" value={m.dauWau ?? 'Insufficient data'} /><Tile label="DAU / MAU" value={m.dauMau ?? 'Insufficient data'} /><Tile label="Return rate (week to week)" value={P(m.returnRate.rate)} note={`${m.returnRate.returned} of ${m.returnRate.prior}`} />
        </div>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Retention</h2>
        <div className="stat-tile-row">
          {[['D1', m.d1], ['D7', m.d7], ['D30', m.d30]].map(([l, r]: any) => <Tile key={l} label={`${l} retention`} value={P(r.rate)} note={`${r.retained} of ${r.eligible} eligible`} />)}
        </div>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Trend: active students per day (last 30 days)</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>{m.trend.map((t) => <div key={t.day} title={`${t.day}: ${t.active}`} style={{ flex: 1, background: 'var(--marigold-deep)', height: `${Math.max(2, (t.active / maxA) * 100)}%` }} />)}</div>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Learning behaviour (30 days)</h2>
        <div className="stat-tile-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <Tile label="Sessions per active student" value={m.sessionsPerStudent ?? 'Insufficient data'} /><Tile label="Learning sessions per student" value={m.learningSessionsPerStudent ?? 'Insufficient data'} /><Tile label="Avg learning session (min)" value={m.avgLearningMinutes ?? 'Insufficient data'} note="sessions up to 90 min" /><Tile label="Quizzes completed" value={m.quizzesCompleted30} />
          <Tile label="Mission completion" value={P(m.missionCompletion.pct)} note={`${m.missionCompletion.complete} of ${m.missionCompletion.created}`} /><Tile label="Mock completion" value={P(m.mockCompletion.pct)} note={`${m.mockCompletion.submitted} of ${m.mockCompletion.started}`} /><Tile label="Mistakes corrected" value={P(m.mistakes.pct)} note={`${m.mistakes.corrected} of ${m.mistakes.total}`} /><Tile label="Achievements unlocked" value={m.achievementsUnlocked30} />
          <Tile label="On a 3+ day streak now" value={m.streaks.atLeast3} /><Tile label="On a 7+ day streak" value={m.streaks.atLeast7} /><Tile label="On a 14+ day streak" value={m.streaks.atLeast14} /><Tile label="Longest streak ever" value={m.streaks.longest} />
        </div>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Engagement and learning improvement</h2>
        <p>Students with at least two scored rounds in 30 days: <strong>{m.improvement.n}</strong>. Average change from first to latest round: <strong>{P(m.improvement.overall, ' points')}</strong>.</p>
        <p>Studied on 8+ days: {P(m.improvement.highAvg, ' points')} (n={m.improvement.highN}) · fewer days: {P(m.improvement.lowAvg, ' points')} (n={m.improvement.lowN}). {m.improvement.enough ? '' : 'Not enough students in each group to compare.'} This is an association, not proof that studying more caused the change.</p>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Commercial connection (association only)</h2>
        <table><thead><tr><th align="left">Group</th><th>Students</th><th>On a paid plan</th><th>Submitted a mock</th><th>Parent linked</th></tr></thead><tbody>{m.commercial.map((c) => <tr key={c.group}><td>{c.group}</td><td align="center">{c.n}</td><td align="center">{P(c.paidShare)}</td><td align="center">{P(c.mockShare)}</td><td align="center">{P(c.parentLinkedShare)}</td></tr>)}</tbody></table>
        <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>Use this to decide what belongs in Free Core and what in paid features. It shows what goes together, not what causes what; test a change with the experiments below before deciding. Handwritten-evaluation usage by engagement is not shown yet.</p>
        <h2 style={{ fontSize: 'var(--step-1)' }}>Experiments</h2>
        {m.experiments.length === 0 ? <p>No experiment is running. Set a feature&apos;s share (for example 50) in <a href="/admin/engagement-settings">Engagement settings</a> to compare students with the feature against students without it.</p> : <table><thead><tr><th align="left">Feature</th><th>Share who get it</th><th>With: students / active last 7 days</th><th>Without: students / active last 7 days</th></tr></thead><tbody>{m.experiments.map((e) => <tr key={e.feature}><td>{e.feature}</td><td align="center">{e.pct}%</td><td align="center">{e.on.n} / {P(e.on.activeLast7)}</td><td align="center">{e.off.n} / {P(e.off.activeLast7)}</td></tr>)}</tbody></table>}
        <h2 style={{ fontSize: 'var(--step-1)' }}>Patterns for a person to look at</h2>
        <p style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>These are signals, not accusations. They never reach the student. Rounds flagged here earn no XP for the rushed answers.</p>
        {m.flags.length === 0 ? <p>Nothing flagged.</p> : <ul>{m.flags.map((f) => <li key={f.id}>{String(f.createdAt).slice(0, 16).replace('T', ' ')} · {f.kind.replace(/_/g, ' ')} · {f.detail?.mode ?? ''} {f.detail?.answers ?? ''} answers {f.reviewed ? '· seen' : <FlagReviewButton id={f.id} />}</li>)}</ul>}
      </div>
    </div></main>
  );
}
