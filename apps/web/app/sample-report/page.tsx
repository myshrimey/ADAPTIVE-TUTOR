// A made-up example of what a family receives. Every name and number below is invented to show
// the layout; none of it describes a real child. It is not a promise of any result.

const SUBJECTS = [
  { name: 'Mathematics (Standard)', coverage: '72%', band: 'On track', last: '2 Oct 2026', priority: 'Keep going' },
  { name: 'Science', coverage: '48%', band: 'Developing', last: '28 Sep 2026', priority: 'Give this the most attention' },
  { name: 'English', coverage: '15%', band: 'Not enough evidence yet', last: '20 Sep 2026', priority: 'Not enough evidence yet' },
];

import { PrintButton } from '@/components/reports/PrintButton';
export default function SampleReportPage() {
  return (
    <main className="page">
      <div className="shell shell--narrow" style={{ paddingTop: 'var(--space-4)', paddingBottom: 'var(--space-5)' }}>
        <p className="alert" role="note">
          <strong>Sample only.</strong> The student, the subjects and every number on this page are made up to show you the layout. This is not a real child&apos;s report.
        </p>
        <h1 style={{ fontSize: 'var(--step-3)' }}>Progress report for “Sample Student”</h1>
        <PrintButton fileName="sahayak-sample-report" title="Sample report" kind="sample-report" classification="general" />
        <p style={{ color: 'var(--slate)' }}>Built from what the student actually did. It does not predict board marks and does not guarantee results.</p>

        <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
          <div className="chapter-row__title">All subjects at a glance</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '0.3rem' }}>Subject</th><th style={{ padding: '0.3rem' }}>Syllabus assessed</th><th style={{ padding: '0.3rem' }}>Preparation</th><th style={{ padding: '0.3rem' }}>Last assessed</th><th style={{ padding: '0.3rem' }}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {SUBJECTS.map((s) => (
                  <tr key={s.name} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '0.3rem' }}>{s.name}</td><td style={{ padding: '0.3rem' }}>{s.coverage}</td><td style={{ padding: '0.3rem' }}>{s.band}</td><td style={{ padding: '0.3rem' }}>{s.last}</td><td style={{ padding: '0.3rem' }}>{s.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
          <div className="chapter-row__title">Science</div>
          <p style={{ margin: '0.3rem 0' }}><strong>Where things stand:</strong> started at about 38% on the diagnostic; about 54% mastery now, across 48% of the syllabus.</p>
          <p style={{ margin: '0.3rem 0' }}><strong>Needs more practice:</strong> Balancing chemical equations, Series and parallel circuits</p>
          <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}><strong>Patterns we are watching in wrong answers:</strong> Mixes up two similar-sounding scientific terms. <span style={{ color: 'var(--slate)' }}>(Possibilities from the answers given, not a finding about the child.)</span></p>
          <p style={{ margin: '0.3rem 0' }}><strong>Suggested next step:</strong> Series and parallel circuits, then a chapter check on Electricity.</p>
        </section>

        <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
          <div className="chapter-row__title">What changed in the last 30 days</div>
          <ul style={{ margin: '0.3rem 0', paddingLeft: '1.1rem' }}>
            <li>13 learning sessions in the last 30 days, against 8 in the 30 days before.</li>
            <li>More accurate answers in Mathematics.</li>
          </ul>
          <p style={{ margin: '0.2rem 0' }}><strong>Mathematics:</strong> answers became more accurate: 71% correct now, up from 58%. Fewer answers needed hints (22% now, 35% before).</p>
          <p style={{ margin: '0.2rem 0' }}><strong>What to do next:</strong> a few more practice questions in English would make next month&apos;s comparison reliable.</p>
        </section>

        <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
          <div className="chapter-row__title">How study has gone in the last 30 days</div>
          <p style={{ margin: '0.3rem 0' }}>9 study days (2.1 a week) · 11 of 13 sessions finished · typical time to answer 48 seconds · current streak 3 days.</p>
          <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>2 sessions were left before the end. Shorter sessions can help on busy days.</p>
        </section>

        <section className="chapter-row" style={{ display: 'block', marginTop: 'var(--space-3)' }}>
          <div className="chapter-row__title">Assessment history</div>
          <ul style={{ margin: '0.3rem 0', paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
            <li>2 Oct 2026 · Mathematics · Subject check · 7 of 10 (70%)</li>
            <li>28 Sep 2026 · Science · Chapter check · 4 of 8 (50%)</li>
            <li>20 Sep 2026 · English · Diagnostic · 6 of 15 (40%)</li>
          </ul>
        </section>

        <p style={{ marginTop: 'var(--space-3)' }}>
          <a className="btn btn--accent" href="/check">Try the free readiness check</a>{' '}
          <a className="btn btn--ghost" href="/">Back to home</a>
        </p>
      </div>
    </main>
  );
}
