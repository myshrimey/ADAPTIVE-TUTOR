import { loadSubjectCatalogue } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';
import { engineCtx } from '@/lib/engagement';
import { ChallengeRunner } from '@/components/engagement/ChallengeRunner';

export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ skill?: string; subject?: string }> }) {
  const { studentId, service } = await studentPage(); const sp = await searchParams;
  if (sp.skill && /^[0-9a-f-]{36}$/i.test(sp.skill)) return <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}><ChallengeRunner start={{ mode: 'weakness', skillId: sp.skill }} /></div></main>;
  const ctx = await engineCtx(service);
  const cat = (await loadSubjectCatalogue(service, studentId)).filter((c) => (c.status === 'ready' || c.status === 'pilot') && c.registered && (!sp.subject || c.id === sp.subject));
  const ok = new Set(cat.map((c) => c.id));
  const { data } = await service.from('mastery_states').select('skill_id, score').eq('student_id', studentId).lt('score', 60).order('score').limit(60);
  const list = ((data ?? []) as any[]).map((r) => ({ r, i: ctx.idx.get(r.skill_id) })).filter((x) => x.i && ok.has(x.i.subjectId)).slice(0, 8);
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>Weakness Battle</h1>
      <p style={{ color: 'var(--slate)' }}>Questions start basic and move up or down with how you do. Mastery is not declared here: your mastery scores change through lessons and diagnostics.</p>
      {list.length === 0 ? <p>No weak skills on the evidence so far. Take a <a href="/diagnostic">diagnostic</a> to find your starting point.</p> : <ol>{list.map(({ r, i }) => <li key={r.skill_id} style={{ margin: '0.5rem 0' }}>{i!.chapterName}: {i!.name} <span style={{ color: 'var(--slate)' }}>({i!.subjectName}, {Math.round(Number(r.score))}%)</span> <a className="btn btn--accent btn--small" href={`/battle?skill=${r.skill_id}`}>Start battle</a></li>)}</ol>}
    </div></main>
  );
}
