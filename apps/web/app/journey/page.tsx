import { loadEngagementHome, E, trE } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const { studentId, service } = await studentPage(); const ctx = await engineCtx(service);
  const lang = await getServerLang(); const L = (k: string) => E(k, lang);
  const h = await loadEngagementHome(service, studentId, ctx);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{L('jr.title')}</h1>
      <p style={{ color: 'var(--slate)' }}>{L('jr.sub')}</p>
      {h.journeys.length === 0 && <p>{L('jr.none')}</p>}
      {h.journeys.map((j) => (
        <section key={j.subjectId} style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{j.subjectName}</h2>
          <ol style={{ listStyle: 'none', padding: 0 }}>
            {j.journey.stages.map((s) => (
              <li key={s.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '0.35rem 0', borderLeft: `4px solid ${s.status === 'done' ? 'var(--mastered)' : s.status === 'current' ? 'var(--marigold-deep)' : 'var(--line)'}`, paddingLeft: 10 }}>
                <span>{s.status === 'done' ? '✓' : s.status === 'current' ? '➤' : '○'}</span>
                <span><strong>{trE(s.label, lang)}</strong>{s.status === 'current' ? L('jr.here') : ''}<br /><span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{trE(s.note, lang)}</span></span>
              </li>
            ))}
          </ol>
          <p><strong>{L('jr.next')}</strong> <a href={j.journey.next.href}>{trE(j.journey.next.text, lang)}</a></p>
        </section>
      ))}
    </div></main>
  );
}
