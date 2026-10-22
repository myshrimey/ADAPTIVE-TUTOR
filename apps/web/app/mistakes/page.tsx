import { listMistakes, mistakeCounts, CATEGORY_LABEL, E, trE } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';
import { studentPage } from '@/lib/student-page';
import { MathText } from '@/components/MathText';
import { engineCtx } from '@/lib/engagement';

export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; category?: string }> }) {
  const { studentId, service } = await studentPage(); const sp = await searchParams;
  const ctx = await engineCtx(service);
  const lang = await getServerLang(); const L = (k: string, v?: Record<string, string | number>) => E(k, lang, v);
  const [rows, counts] = await Promise.all([listMistakes(service, studentId, { limit: 300 }), mistakeCounts(service, studentId)]);
  const shown = rows.filter((r) => (!sp.status || (sp.status === 'open' ? r.status !== 'corrected' : r.status === sp.status)) && (!sp.category || r.category === sp.category));
  return (
    <main className="page"><div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)' }}>
      <h1 style={{ fontSize: 'var(--step-2)' }}>{L('mb.title')}</h1>
      <p style={{ color: 'var(--slate)' }}>{L('mb.sub', { o: counts.open, c: counts.corrected })}</p>
      <p><a className="btn btn--accent" href="/mistakes/review">{L('mb.review')}</a> {counts.calculation >= 1 && <a className="btn btn--ghost" href="/mistakes/review?category=calculation">{L('mb.fixCalc')}</a>}</p>
      <p style={{ fontSize: '0.9rem' }}>{L('mb.show')} <a href="/mistakes?status=open">{L('mb.open')}</a> · <a href="/mistakes?status=corrected">{L('mb.corrected')}</a> · <a href="/mistakes">{L('mb.all')}</a> · {Object.entries(CATEGORY_LABEL).map(([k, v]) => <a key={k} href={`/mistakes?category=${k}`} style={{ marginRight: 8 }}>{trE(v, lang)}</a>)}</p>
      {shown.length === 0 && <p>{L('mb.empty')}</p>}
      {shown.map((r) => {
        const info = r.skillId ? ctx.idx.get(r.skillId) : null;
        return (
          <div key={r.id} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem' }}>
            <p style={{ margin: 0, color: 'var(--slate)', fontSize: '0.85rem' }}>{info ? `${info.subjectName} · ${info.chapterName} · ${info.name}` : L('mb.question')} · {trE(r.categoryLabel, lang)} · {L('mb.seen', { n: r.repetitions })} · {r.status === 'corrected' ? L('mb.corrected') : r.status === 'practising' ? L('mb.practising') : L('mb.open')} · {r.lastSeen.slice(0, 10)}</p>
            <p style={{ margin: '0.3rem 0' }}><MathText text={r.prompt || L('mb.gone')} /></p>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{L('mb.your')} <MathText text={r.studentAnswer || '—'} /> · {L('mb.correct')} <strong><MathText text={r.correctAnswer || '—'} /></strong></p>
            {r.explanation && <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}><MathText text={r.explanation} /></p>}
          </div>
        );
      })}
    </div></main>
  );
}
