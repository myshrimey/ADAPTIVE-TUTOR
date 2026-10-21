import type { StudentReportData } from '@adaptive-tutor/core';
import { QuestionFigure } from '@/components/QuestionFigure';
import { MathText } from '@/components/MathText';
import { PrintButton } from './PrintButton';
import { fmtDateTime, fmtScore, fmtDuration } from '@/lib/report-format';

export function StudentReportView({ title, takenAt, score, total, inMarks, data, back }: { title: string; takenAt: string; score: number | null; total: number | null; inMarks: boolean; data: StudentReportData; back: string }) {
  let fig = 0;
  const dur = fmtDuration(data.timeUsedSeconds);
  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <div className="report-brand"><img src="/logo-mark.png" alt="" /><strong>Sahayak</strong></div>
          <p className="no-print"><a href={back}>← All my test reports</a></p>
          <h1 style={{ fontSize: 'var(--step-2)' }}>{title}</h1>
          <p style={{ color: 'var(--slate)' }}>Taken on {fmtDateTime(takenAt)} · Score {fmtScore(score, total, inMarks)}{dur ? ` · Time used ${dur}` : ''}</p>
          {data.autoSubmitted && <p style={{ color: 'var(--slate)' }}>The timer ended and the test was submitted automatically.</p>}
          {data.pendingWritten > 0 && <p style={{ color: 'var(--slate)' }}>{data.pendingWritten} written answer(s) are waiting for handwritten marking and are not in the score yet.</p>}
          <PrintButton fileName={`sahayak-${title}-${takenAt.slice(0, 10)}`} />
        </div>

        {data.byGroup.length > 0 && (
          <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
            <div className="chapter-row__title">By topic</div>
            {data.byGroup.map((g) => <div key={g.group} style={{ fontSize: '0.92rem' }}>{g.group}: {g.correct} of {g.total}</div>)}
          </section>
        )}

        <h2 style={{ fontSize: 'var(--step-1)', marginTop: 'var(--space-4)' }}>Question by question</h2>
        {data.items.map((it, i) => {
          if (it.figureUrl) fig++;
          return (
            <section key={i} className="chapter-row" style={{ display: 'block', marginTop: '0.6rem', breakInside: 'avoid' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>Question {i + 1} · {it.group}{it.marks ? ` · ${it.marks} mark${it.marks === 1 ? '' : 's'}` : ''}</div>
              {it.figureUrl && <QuestionFigure url={it.figureUrl} caption={it.figureCaption} number={fig} />}
              <div style={{ margin: '0.3rem 0' }}><MathText text={it.prompt} /></div>
              {it.pending ? (
                <div style={{ color: 'var(--slate)' }}>Written answer: waiting for handwritten marking.</div>
              ) : (
                <>
                  <div><strong>{it.isCorrect ? 'Correct' : it.answered ? 'Not yet correct' : 'Not answered'}</strong></div>
                  <div>Your answer: {it.answered ? <MathText text={it.yourAnswer} /> : '—'}</div>
                  {!it.isCorrect && <div>Correct answer: <MathText text={it.correctAnswer} /></div>}
                  {it.explanation && <div style={{ color: 'var(--slate)', marginTop: '0.2rem' }}>Why: <MathText text={it.explanation} /></div>}
                </>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
