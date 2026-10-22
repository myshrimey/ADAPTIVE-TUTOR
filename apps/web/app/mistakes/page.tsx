import { listMistakes, mistakeCounts, CATEGORY_LABEL } from '@adaptive-tutor/core';
import { studentPage } from '@/lib/student-page';
import { MathText } from '@/components/MathText';
import { engineCtx } from '@/lib/engagement';

export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  const { studentId, service } = await studentPage(); const sp = await searchParams;
  const ctx = await engineCtx(service);
  const [rows, counts] = await Promise.all([listMistakes(service, studentId, { limit: 300 }), mistakeCounts(service, studentId)]);
  const shown = rows.filter((r) => (!sp.status || (sp.status === 'open' ? r.status !== 'corrected' : r.status === sp.status)) && (!sp.category || r.category === sp.category));
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>My Mistake Book</h1>
      <p style={{ color: 'var(--slate)' }}>{counts.open} waiting for review · {counts.corrected} corrected. A mistake is corrected when you get it right on a retry. A category is shown only when the system detected the likely cause; otherwise it says &quot;Not yet categorised&quot;.</p>
      <p><a className="btn btn--accent" href="/mistakes/review">Review mistakes</a> {counts.calculation >= 1 && <a className="btn btn--ghost" href="/mistakes/review?category=calculation">Fix calculation mistakes</a>}</p>
      <p style={{ fontSize: '0.9rem' }}>Show: <a href="/mistakes?status=open">Open</a> · <a href="/mistakes?status=corrected">Corrected</a> · <a href="/mistakes">All</a> · {Object.entries(CATEGORY_LABEL).map(([k, v]) => <a key={k} href={`/mistakes?category=${k}`} style={{ marginRight: 8 }}>{v}</a>)}</p>
      {shown.length === 0 && <p>Nothing here yet. Wrong answers in lessons, diagnostics, mocks and challenges are collected here automatically.</p>}
      {shown.map((r) => {
        const info = r.skillId ? ctx.idx.get(r.skillId) : null;
        return (
          <div key={r.id} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
            <p style={{ margin: 0, color: 'var(--slate)', fontSize: '0.85rem' }}>{info ? `${info.subjectName} · ${info.chapterName} · ${info.name}` : 'Question'} · {r.categoryLabel} · seen {r.repetitions}× · {r.status === 'corrected' ? 'Corrected' : r.status === 'practising' ? 'Practising' : 'Open'} · {r.lastSeen.slice(0, 10)}</p>
            <p style={{ margin: '0.3rem 0' }}><MathText text={r.prompt || 'Question no longer available'} /></p>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Your answer: <MathText text={r.studentAnswer || '—'} /> · Correct answer: <strong><MathText text={r.correctAnswer || '—'} /></strong></p>
            {r.explanation && <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}><MathText text={r.explanation} /></p>}
          </div>
        );
      })}
    </div></main>
  );
}
