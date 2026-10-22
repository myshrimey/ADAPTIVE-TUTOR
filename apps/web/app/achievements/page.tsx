import { loadEngagementHome, achievementProgress, loadAchievementDefs } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';

export const dynamic = 'force-dynamic';
const CAT: Record<string, string> = { consistency: 'Consistency', learning: 'Learning', improvement: 'Improvement', assessment: 'Assessment', mistakes: 'Mistakes', cbse: 'CBSE preparation' };
export default async function Page() {
  const { studentId, service } = await studentPage(); const ctx = await engineCtx(service);
  const h = await loadEngagementHome(service, studentId, ctx); const defs = await loadAchievementDefs(service);
  const got = new Map(h.achievements.unlocked.map((u) => [u.code, u.at]));
  const nextBy = new Map(h.achievements.next.map((n) => [n.code, n.progress]));
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Sahayak Achievements</h1>
      <p style={{ color: 'var(--slate)' }}>{got.size} of {defs.length} unlocked. Each one is earned by a real learning behaviour, and the rule is written under it.</p>
      {Object.keys(CAT).map((c) => (
        <section key={c} style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{CAT[c]}</h2>
          {defs.filter((d) => d.category === c).map((d) => (
            <p key={d.code} style={{ margin: '0.4rem 0', opacity: got.has(d.code) ? 1 : 0.8 }}>{got.has(d.code) ? '🏅' : '○'} <strong>{d.title}</strong> <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>— {d.description}{got.has(d.code) ? ` Unlocked ${String(got.get(d.code)).slice(0, 10)}.` : nextBy.has(d.code) ? ` ${Math.round((nextBy.get(d.code) ?? 0) * 100)}% of the way.` : ''}</span></p>
          ))}
        </section>
      ))}
    </div></main>
  );
}
