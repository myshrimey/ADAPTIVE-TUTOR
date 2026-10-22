import { loadEngagementHome } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const { studentId, service } = await studentPage(); const ctx = await engineCtx(service);
  const h = await loadEngagementHome(service, studentId, ctx);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Study journey</h1>
      <p style={{ color: 'var(--slate)' }}>Where you are in each subject, from your own evidence. &quot;Board readiness&quot; is never declared here: it is an ongoing stage that needs mock and re-check evidence.</p>
      {h.journeys.length === 0 && <p>Register for a subject on the <a href="/subjects">Subjects</a> page to see its journey.</p>}
      {h.journeys.map((j) => (
        <section key={j.subjectId} style={{ marginTop: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--step-1)' }}>{j.subjectName}</h2>
          <ol style={{ listStyle: 'none', padding: 0 }}>
            {j.journey.stages.map((s) => (
              <li key={s.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '0.35rem 0', borderLeft: `4px solid ${s.status === 'done' ? 'var(--mastered)' : s.status === 'current' ? 'var(--marigold-deep)' : 'var(--line)'}`, paddingLeft: 10 }}>
                <span>{s.status === 'done' ? '✓' : s.status === 'current' ? '➤' : '○'}</span>
                <span><strong>{s.label}</strong>{s.status === 'current' ? ' (you are here)' : ''}<br /><span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{s.note}</span></span>
              </li>
            ))}
          </ol>
          <p><strong>Next recommended step:</strong> <a href={j.journey.next.href}>{j.journey.next.text}</a></p>
        </section>
      ))}
    </div></main>
  );
}
