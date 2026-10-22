import { loadSubjectCatalogue } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const { studentId, service } = await studentPage();
  const day = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
  const cat = (await loadSubjectCatalogue(service, studentId)).filter((c) => (c.status === 'ready' || c.status === 'pilot') && c.registered);
  const { data } = await service.from('challenge_attempts').select('ref, status').eq('student_id', studentId).eq('mode', 'daily').like('ref', `${day}:%`);
  const st = new Map(((data ?? []) as any[]).map((r) => [r.ref as string, r.status as string]));
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>CBSE Challenge of the Day</h1>
      <p style={{ color: 'var(--slate)' }}>One verified question for each subject, the same for everyone today. A question you answered before is skipped.</p>
      {cat.length === 0 && <p>Register for a subject first on the <a href="/subjects">Subjects</a> page.</p>}
      {cat.map((c) => { const s = st.get(`${day}:${c.id}`); return <p key={c.id}><strong>{c.name}</strong> {s === 'completed' ? '· done today ✓' : <a className="btn btn--accent btn--small" href={`/challenge/start?mode=daily&subject=${c.id}`}>{s === 'in_progress' ? 'Continue' : 'Try it'}</a>}</p>; })}
    </div></main>
  );
}
