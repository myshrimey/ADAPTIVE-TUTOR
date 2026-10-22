import { loadSubjectCatalogue } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';

export const dynamic = 'force-dynamic';
const MODES = [
  { mode: 'practice', name: 'Practice', text: 'Questions at your current learning level.' },
  { mode: 'challenge', name: 'Challenge', text: 'Harder questions, where the question bank has them.' },
  { mode: 'mixed', name: 'Mixed', text: 'Several skills in one round.' },
  { mode: 'boss', name: 'Boss Battle', text: '10 verified questions, rising in difficulty, ending with application and reasoning.' },
];
export default async function Page() {
  const { studentId, service } = await studentPage();
  const cat = (await loadSubjectCatalogue(service, studentId)).filter((c) => (c.status === 'ready' || c.status === 'pilot') && c.registered);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Challenges</h1>
      <p style={{ color: 'var(--slate)' }}>Pick a subject and a type. Difficulty comes from the question bank&apos;s own levels. Nothing here is made hard just to be hard.</p>
      {cat.length === 0 && <p>Register for a subject first on the <a href="/subjects">Subjects</a> page.</p>}
      {cat.map((c) => (
        <section key={c.id} className="chapter-row" style={{ display: 'block', marginTop: '0.8rem' }}>
          <strong>{c.name}</strong>
          <p style={{ margin: '0.4rem 0' }}>{MODES.map((m) => <a key={m.mode} className="btn btn--ghost btn--small" style={{ marginRight: 6 }} title={m.text} href={`/challenge/start?mode=${m.mode}&subject=${c.id}`}>{m.name}</a>)}</p>
        </section>
      ))}
      <ul style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{MODES.map((m) => <li key={m.mode}><strong>{m.name}:</strong> {m.text}</li>)}</ul>
    </div></main>
  );
}
