import type { AdultReportData } from '@adaptive-tutor/core';
import { PrintButton } from './PrintButton';
import { fmtDateTime, fmtScore, fmtDuration } from '@/lib/report-format';

export function AdultReportView({ studentName, title, takenAt, score, total, inMarks, data, back }: { studentName: string; title: string; takenAt: string; score: number | null; total: number | null; inMarks: boolean; data: AdultReportData; back: string }) {
  const dur = fmtDuration(data.timeUsedSeconds);
  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <div className="report-brand"><img src="/logo-mark.png" alt="" /><strong>Sahayak</strong></div>
          <p className="no-print"><a href={back}>← Back to {studentName}</a></p>
          <h1 style={{ fontSize: 'var(--step-2)' }}>{title}</h1>
          <p style={{ color: 'var(--slate)' }}>{studentName} · taken on {fmtDateTime(takenAt)} · Score {fmtScore(score, total, inMarks)}{dur ? ` · Time used ${dur}` : ''}</p>
          <PrintButton fileName={`sahayak-${title}-${takenAt.slice(0, 10)}`} />
        </div>
        <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
          <div className="chapter-row__title">By topic</div>
          {data.byGroup.length === 0 && <div style={{ color: 'var(--slate)' }}>No scored questions yet.</div>}
          {data.byGroup.map((g) => <div key={g.group} style={{ fontSize: '0.92rem' }}>{g.group}: {g.correct} of {g.total}</div>)}
          {data.unanswered > 0 && <div style={{ marginTop: '0.4rem', fontSize: '0.92rem' }}>Questions left unanswered: {data.unanswered}</div>}
        </section>
        {data.wentWell.length > 0 && <p><strong>Went well:</strong> {data.wentWell.join(', ')}</p>}
        {data.practiseAgain.length > 0 && <p><strong>Worth practising again:</strong> {data.practiseAgain.join(', ')}</p>}
        <ul style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{data.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </div>
    </main>
  );
}
