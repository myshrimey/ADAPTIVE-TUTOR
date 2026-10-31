import { redirect } from 'next/navigation';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { logEvent, buildParentReport, formatReportForWhatsApp, bandForScore, t } from '@adaptive-tutor/core';
import { getReportLang } from '@/lib/language';
import { MasteryArc } from '@/components/MasteryArc';
import { ConfidenceChart } from '@/components/ConfidenceChart';
import { PrintButton } from '@/components/reports/PrintButton';
import { UpgradeCta } from '@/components/commerce/UpgradeCta';
import { ReportExtras } from '@/components/ReportExtras';

// Parent-facing progress summary. Built only from real mastery/diagnostic
// data already in the database — no invented percentages. When a subject
// doesn't have both a diagnostic baseline and live mastery data, we say so
// plainly and show a starting point + next step instead (brief Section 9).
export default async function ReportPage() {
  let studentId: string;
  try {
    studentId = await getCurrentStudentId();
  } catch (e: any) {
    redirect(e?.message === 'device_limit' ? '/device-limit' : '/');
  }

  const supabase = await createServerClient();
  const lang = await getReportLang(studentId);
  const report = await buildParentReport(supabase, studentId);
  // Counted for the funnel (distinct students who looked at their report). Never blocks the page.
  void logEvent({ studentId, eventType: 'report_viewed' });
  const shareText = formatReportForWhatsApp(report);
  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{t('report.title', lang)}</h1>
          <PrintButton fileName="sahayak-progress-report" title="Progress report" kind="progress-report" />
          <p style={{ color: 'var(--slate)' }}>{t('report.noGuarantee', lang)}</p>
        </div>

        {report.subjects.length === 0 && (
          <p style={{ color: 'var(--slate)', marginTop: 'var(--space-3)' }}>
            No diagnostic or learning activity recorded yet — take a diagnostic or start a learning session first.
          </p>
        )}

        <section className="chapter-row" style={{ marginTop: 'var(--space-3)', alignItems: 'flex-start' }}>
          <div className="chapter-row__body">
            <div className="chapter-row__title">{t('report.confidenceTitle', lang)}</div>
            <p style={{ margin: '0.2rem 0', color: 'var(--slate)', fontSize: '0.88rem' }}>{t('report.confidenceIntro', lang)}</p>
            {report.confidence.count === 0 ? (
              <p style={{ margin: '0.4rem 0', color: 'var(--slate)' }}>{t('report.confNone', lang)}</p>
            ) : (
              <>
                <div className="stat-tile-row" style={{ marginTop: '0.4rem' }}>
                  <div className="stat-tile">
                    <span className="stat-tile__value">{report.confidence.current}/10</span>
                    <span className="stat-tile__label">{t('report.confLatest', lang)}</span>
                  </div>
                  {report.confidence.lastSession !== null && (
                    <div className="stat-tile">
                      <span className="stat-tile__value">{report.confidence.lastSession}/10</span>
                      <span className="stat-tile__label">{t('report.confLast', lang)}</span>
                    </div>
                  )}
                  {report.confidence.avg7Days !== null && (
                    <div className="stat-tile">
                      <span className="stat-tile__value">{report.confidence.avg7Days}/10</span>
                      <span className="stat-tile__label">{t('report.conf7', lang)}</span>
                    </div>
                  )}
                  {report.confidence.avg30Days !== null && (
                    <div className="stat-tile">
                      <span className="stat-tile__value">{report.confidence.avg30Days}/10</span>
                      <span className="stat-tile__label">{t('report.conf30', lang)}</span>
                    </div>
                  )}
                </div>
                <p style={{ margin: '0.3rem 0' }}>
                  <strong>{t('report.confTrend', lang)}:</strong> {t(`report.trend.${report.confidence.direction}` as any, lang)}
                </p>
                <ConfidenceChart series={report.confidence.series} />
                {report.confidence.avgChangeInSession !== null && (
                  <p style={{ margin: '0.3rem 0', fontSize: '0.88rem' }}>
                    {t('report.confChange', lang)}: {report.confidence.avgChangeInSession > 0 ? '+' : ''}
                    {report.confidence.avgChangeInSession}
                  </p>
                )}
                {report.confidence.bySubject.length > 0 && (
                  <ul style={{ margin: '0.3rem 0', paddingLeft: '1.1rem', fontSize: '0.9rem' }}>
                    {report.confidence.bySubject.map((b) => (
                      <li key={b.subjectId}>
                        {b.subjectName}: {b.first} → {b.latest}{' '}
                        {b.direction === 'improving' ? '↑' : b.direction === 'declining' ? '↓' : b.direction === 'steady' ? '→' : ''}
                        <span style={{ color: 'var(--slate)' }}> ({b.count} check-in{b.count === 1 ? '' : 's'})</span>
                      </li>
                    ))}
                  </ul>
                )}
                {report.confidence.mismatchNote && <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>{report.confidence.mismatchNote}</p>}
              </>
            )}
          </div>
        </section>

        {report.subjects.length > 0 && (
          <section className="chapter-row" style={{ marginTop: 'var(--space-3)', alignItems: 'flex-start' }}>
            <div className="chapter-row__body">
              <div className="chapter-row__title">{t('readiness.title', lang)}</div>
              <p style={{ margin: '0.2rem 0', color: 'var(--slate)', fontSize: '0.88rem' }}>{t('readiness.intro', lang)}</p>
              <p style={{ margin: '0.3rem 0', fontWeight: 600 }}>
                {report.readinessSummary.assessed === 0
                  ? t('readiness.summaryNone', lang)
                  : t('readiness.summary', lang, { n: report.readinessSummary.onTrackOrAbove, assessed: report.readinessSummary.assessed, total: report.readinessSummary.total })}
              </p>
              <div className="subject-chip-row">
                {report.subjects.map((s) => (
                  <span key={s.subjectId} className="subject-chip" data-band={s.readiness.band}>
                    <span className="subject-chip__name">{s.subjectName}</span>
                    <span className="subject-chip__score">{t(`readiness.band.${s.readiness.band}` as any, lang)}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        <ReportExtras report={report} />
        <p className="no-print" style={{ marginTop: 'var(--space-3)' }}><a href="/board-readiness">Board Readiness report</a> · <a href="/exam-rescue">Exam Rescue</a> · <a href="/board-programme">Preparation Programme</a></p>
        <UpgradeCta kind="readiness" source="parent_report" />

        {report.subjects.map((s) => (
          <section key={s.subjectId} className="chapter-row" style={{ marginTop: 'var(--space-3)', alignItems: 'flex-start' }}>
            <div className="chapter-row__body">
              <div className="chapter-row__title">
                {s.subjectName}
                {s.subjectStatus === 'pilot' && <span className="subject-chip__score" style={{ marginLeft: '0.5rem' }}>{t('subject.status.pilot', lang)}</span>}
              </div>
              {s.subjectStatus === 'pilot' && (
                <p style={{ margin: '0.2rem 0', color: 'var(--slate)', fontSize: '0.85rem' }}>{t('report.pilotSubjectNote', lang)}</p>
              )}

              {s.hasEnoughDataForComparison ? (
                <div className="score-gauge-row">
                  <MasteryArc score={s.baselineAvgPercent!} band={bandForScore(s.baselineAvgPercent!)} label="Diagnostic baseline" size={100} />
                  <MasteryArc score={s.currentAvgPercent!} band={bandForScore(s.currentAvgPercent!)} label="Current mastery" size={100} />
                </div>
              ) : s.hasCurrentMastery ? (
                <div className="score-gauge-row">
                  <MasteryArc score={s.currentAvgPercent!} band={bandForScore(s.currentAvgPercent!)} label="Current mastery" size={100} />
                  <p style={{ margin: 0, color: 'var(--slate)', fontSize: '0.88rem' }}>No diagnostic baseline on record.</p>
                </div>
              ) : s.hasBaseline ? (
                <div className="score-gauge-row">
                  <MasteryArc score={s.baselineAvgPercent!} band={bandForScore(s.baselineAvgPercent!)} label="Diagnostic baseline" size={100} />
                  <p style={{ margin: 0, color: 'var(--slate)', fontSize: '0.88rem' }}>{t('report.baselineNote', lang)}</p>
                </div>
              ) : (
                <p style={{ margin: '0.4rem 0', color: 'var(--slate)' }}>{t('report.baselineNote', lang)}</p>
              )}

              {s.skillsTotal > 0 && (
                <p style={{ margin: '0.3rem 0' }}>
                  <strong>{t('report.coverage', lang)}:</strong> {Math.round(s.coveragePercent)}% ({s.skillsAssessed}/{s.skillsTotal}) ·{' '}
                  <strong>{t('report.evidence', lang)}:</strong> {t(`report.evidence.${s.evidence}` as any, lang)}
                </p>
              )}
              <p style={{ margin: '0.3rem 0' }}>
                <strong>{t('readiness.title', lang)}:</strong> {t(`readiness.band.${s.readiness.band}` as any, lang)}
                {s.mockCount > 0 && s.latestMockPercent !== null && <span style={{ color: 'var(--slate)' }}> · {t('report.mockLine', lang, { n: s.mockCount, percent: s.latestMockPercent })}</span>}
              </p>
              <ul style={{ margin: '0.2rem 0', paddingLeft: '1.1rem', fontSize: '0.88rem', color: 'var(--slate)' }}>
                {s.readiness.reasons.map((r, i) => (
                  <li key={i}>{t(`readiness.reason.${r.code}` as any, lang, r.params)}</li>
                ))}
              </ul>
              <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>{t(`readiness.next.${s.readiness.nextStep}` as any, lang)}</p>
              {!s.hasBaseline && !s.hasCurrentMastery && (
                <p style={{ margin: '0.3rem 0', color: 'var(--slate)' }}>{t('report.diagnosticNeeded', lang)}</p>
              )}
              {s.topicsStudied.length > 0 && (
                <p style={{ margin: '0.3rem 0' }}>
                  <strong>{t('report.topicsStudied', lang)}:</strong> {s.topicsStudied.join(', ')}
                </p>
              )}
              {s.needsPractice.length > 0 && (
                <p style={{ margin: '0.3rem 0' }}>
                  <strong>{t('report.needsPractice', lang)}:</strong> {s.needsPractice.join(', ')}
                </p>
              )}
              {s.likelyCauses.length > 0 && (
                <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
                  <strong>Patterns we are watching in wrong answers:</strong> {s.likelyCauses.join(' ')} <span style={{ color: 'var(--slate)' }}>(These are possibilities from the answers given, not a finding about your child.)</span>
                </p>
              )}
              {s.nextRecommendedSkillName && (
                <p style={{ margin: '0.3rem 0' }}>
                  <strong>{t('report.nextStep', lang)}:</strong> {s.nextRecommendedSkillName}
                </p>
              )}
              <p style={{ margin: '0.3rem 0', color: 'var(--slate)', fontSize: '0.88rem' }}>
                {s.sessionsCompleted} learning session{s.sessionsCompleted === 1 ? '' : 's'} completed.
              </p>
            </div>
          </section>
        ))}

        <p style={{ color: 'var(--slate)', fontSize: '0.85rem', marginTop: 'var(--space-3)' }}>{t('report.evidenceNote', lang)}</p>

        {report.subjects.length > 0 && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn btn--accent">
              {t('report.shareOnWhatsApp', lang)}
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
