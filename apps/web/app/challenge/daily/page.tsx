import { loadSubjectCatalogue, E } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { studentPage } from '@/lib/student-page';

export const dynamic = 'force-dynamic';
export default async function Page() {
  const { studentId, service } = await studentPage();
  const lang = await getServerLang(); const L = (k: string) => E(k, lang);
  const day = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
  const cat = (await loadSubjectCatalogue(service, studentId)).filter((c) => (c.status === 'ready' || c.status === 'pilot') && c.registered);
  const { data } = await service.from('challenge_attempts').select('ref, status').eq('student_id', studentId).eq('mode', 'daily').like('ref', `${day}:%`);
  const st = new Map(((data ?? []) as any[]).map((r) => [r.ref as string, r.status as string]));
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{L('dl.title')}</h1>
      <p style={{ color: 'var(--slate)' }}>{L('dl.sub')}</p>
      {cat.length === 0 && <p>{L('ch.register')}</p>}
      {cat.map((c) => { const s = st.get(`${day}:${c.id}`); return <p key={c.id}><strong>{c.name}</strong> {s === 'completed' ? L('dl.done') : <a className="btn btn--accent btn--small" href={`/challenge/start?mode=daily&subject=${c.id}`}>{s === 'in_progress' ? L('dl.cont') : L('dl.try')}</a>}</p>; })}
    </div></main>
  );
}
