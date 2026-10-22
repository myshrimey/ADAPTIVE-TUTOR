import { loadEngagementHome, loadAchievementDefs, E, trE } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';

export const dynamic = 'force-dynamic';
const CAT = ['consistency', 'learning', 'improvement', 'assessment', 'mistakes', 'cbse'];
export default async function Page() {
  const { studentId, service } = await studentPage(); const ctx = await engineCtx(service);
  const lang = await getServerLang(); const L = (k: string, v?: Record<string, string | number>) => E(k, lang, v);
  const h = await loadEngagementHome(service, studentId, ctx); const defs = await loadAchievementDefs(service);
  const got = new Map(h.achievements.unlocked.map((u) => [u.code, u.at]));
  const nextBy = new Map(h.achievements.next.map((n) => [n.code, n.progress]));
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{L('ach.title')}</h1>
      <p style={{ color: 'var(--slate)' }}>{L('ach.sub', { a: got.size, b: defs.length })}</p>
      {CAT.map((c) => (
        <section key={c} style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{L(`cat.${c}`)}</h2>
          {defs.filter((d) => d.category === c).map((d) => (
            <p key={d.code} style={{ margin: '0.4rem 0', opacity: got.has(d.code) ? 1 : 0.8 }}>{got.has(d.code) ? '🏅' : '○'} <strong>{trE(d.title, lang)}</strong> <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>— {trE(d.description, lang)}{got.has(d.code) ? ` ${L('ach.unlocked', { d: String(got.get(d.code)).slice(0, 10) })}` : nextBy.has(d.code) ? ` ${L('ach.way', { p: Math.round((nextBy.get(d.code) ?? 0) * 100) })}` : ''}</span></p>
          ))}
        </section>
      ))}
    </div></main>
  );
}
