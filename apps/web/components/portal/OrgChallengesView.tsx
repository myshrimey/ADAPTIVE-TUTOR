import { createServiceClient } from '@/lib/supabase-server';
import { engineCtx } from '@/lib/engagement';
import { orgChallengeStats } from '@adaptive-tutor/core';
import type { PortalUser } from '@/lib/portal';
import { OrgChallengeForm, CloseChallenge } from './OrgChallengeForm';

// For approved tutors and centres: set a challenge for linked students and see aggregate results only (counts and averages).
export async function OrgChallengesView({ me }: { me: PortalUser }) {
  const s = createServiceClient(); const ctx = await engineCtx(s);
  const subjects = ctx.curriculum.subjects.filter((x) => x.status === 'ready' || x.status === 'pilot').map((x) => ({ id: x.id, name: x.name }));
  const { data } = await s.from('org_challenges').select('id, title, scope, size, starts_on, ends_on, active, subject_id').eq('owner_user_id', me.userId).order('created_at', { ascending: false }).limit(20);
  const list = (data ?? []) as any[];
  const stats = await Promise.all(list.map((c) => orgChallengeStats(s, me.userId, c.id, ctx.idx)));
  const P = (v: number | null, u = '%') => (v === null ? 'Insufficient data' : `${v}${u}`);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <p><a href={`/${me.role}`}>← Back to your dashboard</a></p>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Challenges for your students</h1>
      <p style={{ color: 'var(--slate)' }}>Linked students see the challenge under &quot;From your tutor or centre&quot;. Everyone gets the same questions. You see counts and averages only. Students see their own result and how many in the group finished, never anyone else&apos;s score.</p>
      {me.status !== 'active' ? <p className="alert">Your account must be approved before you can set challenges.</p> : <OrgChallengeForm subjects={subjects} />}
      <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Your challenges</h2>
      {list.length === 0 && <p>None yet.</p>}
      {list.map((c, i) => { const st = stats[i]; return (
        <div key={c.id} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
          <strong>{c.title}</strong> <span style={{ color: 'var(--slate)' }}>· {c.scope} · {c.size} questions · {c.starts_on} to {c.ends_on} · {c.active ? 'open' : 'closed'}</span> {c.active && <CloseChallenge id={c.id} />}
          {st && <ul style={{ margin: '0.3rem 0' }}>
            <li>Participation: {st.finished} of {st.groupSize} linked students finished ({P(st.participationPct)}), {st.started} started</li>
            <li>Average score: {P(st.averageAccuracy)}</li>
            <li>Improvement against their own earlier average: {P(st.improvement, ' points')}</li>
            <li>Topics most often missed: {st.weakTopics.length ? st.weakTopics.map((w) => `${w.topic} (${w.wrong})`).join(', ') : 'Insufficient data'}</li>
          </ul>}
        </div>); })}
    </div></main>
  );
}
