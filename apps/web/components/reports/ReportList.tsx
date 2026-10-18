import { fmtDateTime, fmtScore } from '@/lib/report-format';

export interface ReportRow { id: string; title: string; kind: string; taken_at: string; score: number | null; total: number | null; in_marks: boolean }
const KIND: Record<string, string> = { diagnostic: 'Diagnostic', skill_quiz: 'Quick quiz', mock: 'Mock / paper' };

export function ReportList({ rows, hrefBase, empty }: { rows: ReportRow[]; hrefBase: string; empty: string }) {
  if (rows.length === 0) return <p style={{ color: 'var(--slate)' }}>{empty}</p>;
  return (
    <div>
      {rows.map((r) => (
        <a key={r.id} href={`${hrefBase}/${r.id}`} className="chapter-row" style={{ display: 'block', marginTop: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
          <strong>{r.title}</strong>
          <div style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>{KIND[r.kind] ?? r.kind} · {fmtDateTime(r.taken_at)} · {fmtScore(r.score, r.total, r.in_marks)}</div>
        </a>
      ))}
    </div>
  );
}
