import type { ParentReport } from '@adaptive-tutor/core';

const KIND_LABEL: Record<string, string> = {
  diagnostic: 'Diagnostic',
  chapter_check: 'Chapter check',
  subject_check: 'Subject check',
  full_mock: 'Full mock',
  board_style: 'Board-style paper',
};
const PRIORITY_LABEL: Record<string, string> = {
  start: 'Start here: no diagnostic yet',
  focus: 'Give this the most attention',
  steady: 'Keep going',
  insufficient: 'Not enough evidence yet',
};
const BAND_LABEL: Record<string, string> = {
  insufficient_evidence: 'Not enough evidence yet',
  building: 'Building',
  developing: 'Developing',
  on_track: 'On track',
  well_prepared: 'Well prepared',
};

function day(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

// Subject matrix, engagement and assessment history for the parent report. Everything here
// is a count or a date taken from what the student did; nothing describes the child.
export function ReportExtras({ report }: { report: ParentReport }) {
  const e = report.engagement;
  return (
    <>
      {report.subjects.length > 0 && (
        <section className="chapter-row" style={{ marginTop: 'var(--space-3)', display: 'block' }}>
          <div className="chapter-row__title">All subjects at a glance</div>
          <p style={{ margin: '0.2rem 0', color: 'var(--slate)', fontSize: '0.88rem' }}>
            Where each subject stands and where effort helps most right now. This is about the plan, not about your child.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '0.3rem' }}>Subject</th>
                  <th style={{ padding: '0.3rem' }}>Syllabus assessed</th>
                  <th style={{ padding: '0.3rem' }}>Preparation</th>
                  <th style={{ padding: '0.3rem' }}>Last assessed</th>
                  <th style={{ padding: '0.3rem' }}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {report.subjects.map((s) => (
                  <tr key={s.subjectId} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '0.3rem' }}>
                      {s.subjectName}
                      {s.subjectStatus === 'pilot' ? ' (Pilot)' : ''}
                    </td>
                    <td style={{ padding: '0.3rem' }}>{s.skillsTotal ? `${Math.round(s.coveragePercent)}%` : '—'}</td>
                    <td style={{ padding: '0.3rem' }}>{BAND_LABEL[s.readiness.band]}</td>
                    <td style={{ padding: '0.3rem' }}>{day(s.lastAssessmentAt)}</td>
                    <td style={{ padding: '0.3rem', fontWeight: s.priority === 'focus' ? 700 : 400 }}>{PRIORITY_LABEL[s.priority]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="chapter-row" style={{ marginTop: 'var(--space-3)', display: 'block' }}>
        <div className="chapter-row__title">What changed in the last 30 days</div>
        <p style={{ margin: '0.2rem 0', color: 'var(--slate)', fontSize: '0.85rem' }}>The last 30 days against the 30 before, from real answers and papers. A comparison is shown only where there is enough to compare fairly.</p>
        <ul style={{ margin: '0.3rem 0', paddingLeft: '1.1rem' }}>
          {report.change.headline.map((h, i) => (<li key={i}>{h}</li>))}
        </ul>
        {report.change.subjects.map((s) => (
          <div key={s.subjectName} style={{ margin: '0.5rem 0' }}>
            <strong>{s.subjectName}</strong>
            <ul style={{ margin: '0.1rem 0', paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
              {s.statements.map((x, i) => (<li key={i}>{x}</li>))}
            </ul>
          </div>
        ))}
        <p style={{ margin: '0.4rem 0 0.1rem' }}><strong>What to do next</strong></p>
        <ul style={{ margin: '0.1rem 0', paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
          {report.change.whatNext.map((x, i) => (<li key={i}>{x}</li>))}
        </ul>
      </section>

      <section className="chapter-row" style={{ marginTop: 'var(--space-3)', display: 'block' }}>
        <div className="chapter-row__title">How study has gone in the last {e.days} days</div>
        {e.sessionsStarted === 0 ? (
          <p style={{ margin: '0.3rem 0', color: 'var(--slate)' }}>No learning sessions yet in this period.</p>
        ) : (
          <div className="stat-tile-row" style={{ marginTop: '0.4rem' }}>
            <div className="stat-tile"><span className="stat-tile__value">{e.currentStreakDays}</span><span className="stat-tile__label">day streak</span></div>
            <div className="stat-tile"><span className="stat-tile__value">{e.activeDays}</span><span className="stat-tile__label">study days ({e.daysPerWeek} a week)</span></div>
            <div className="stat-tile"><span className="stat-tile__value">{e.sessionsCompleted}/{e.sessionsStarted}</span><span className="stat-tile__label">sessions finished</span></div>
            {e.medianAnswerSeconds !== null && (
              <div className="stat-tile"><span className="stat-tile__value">{e.medianAnswerSeconds}s</span><span className="stat-tile__label">typical time to answer</span></div>
            )}
          </div>
        )}
        {e.sessionsUnfinished > 0 && (
          <p style={{ margin: '0.3rem 0', fontSize: '0.88rem' }}>
            {e.sessionsUnfinished} of {e.sessionsStarted} sessions were left before the end. Shorter sessions can help on busy days.
          </p>
        )}
        {e.slowShare !== null && e.timedAnswers >= 10 && (
          <p style={{ margin: '0.3rem 0', fontSize: '0.88rem' }}>
            {Math.round(e.slowShare * 100)}% of timed answers took more than twice the planning time for the question. Practice with timed papers can help with pace.
          </p>
        )}
        {report.gentlerSessions > 0 && (
          <p style={{ margin: '0.3rem 0', fontSize: '0.88rem' }}>
            {report.gentlerSessions} session{report.gentlerSessions === 1 ? '' : 's'} switched to a gentler pace (after a harder day, or after several misses in a row).
          </p>
        )}
      </section>

      {report.assessmentHistory.length > 0 && (
        <section className="chapter-row" style={{ marginTop: 'var(--space-3)', display: 'block' }}>
          <div className="chapter-row__title">Assessment history</div>
          <ul style={{ margin: '0.3rem 0', paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
            {report.assessmentHistory.map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                {day(h.at)} · {h.subjectName} · {KIND_LABEL[h.kind] ?? h.kind}
                {h.percent !== null ? ` · ${h.inMarks ? `${h.score} of ${h.total} marks` : `${h.score} of ${h.total}`} (${h.percent}%)` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
