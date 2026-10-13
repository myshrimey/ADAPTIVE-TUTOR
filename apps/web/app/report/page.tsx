import { redirect } from 'next/navigation';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { buildParentReport, formatReportForWhatsApp, t } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';

// Parent-facing progress summary. Built only from real mastery/diagnostic
// data already in the database — no invented percentages. When a subject
// doesn't have both a diagnostic baseline and live mastery data, we say so
// plainly and show a starting point + next step instead (brief Section 9).
export default async function ReportPage() {
  let studentId: string;
  try {
    studentId = await getCurrentStudentId();
  } catch {
    redirect('/');
  }

  const supabase = await createServerClient();
  const lang = await getServerLang();
  const report = await buildParentReport(supabase, studentId);
  const shareText = formatReportForWhatsApp(report);
  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{t('report.title', lang)}</h1>
          <p style={{ color: 'var(--slate)' }}>{t('report.noGuarantee', lang)}</p>
        </div>

        {report.subjects.length === 0 && (
          <p style={{ color: 'var(--slate)', marginTop: 'var(--space-3)' }}>
            No diagnostic or learning activity recorded yet — take a diagnostic or start a learning session first.
          </p>
        )}

        {report.subjects.map((s) => (
          <section key={s.subjectId} className="chapter-row" style={{ marginTop: 'var(--space-3)', alignItems: 'flex-start' }}>
            <div className="chapter-row__body">
              <div className="chapter-row__title">{s.subjectName}</div>

              {s.hasEnoughDataForComparison ? (
                <p style={{ margin: '0.4rem 0', fontFamily: 'var(--font-mono)' }}>
                  {Math.round(s.baselineAvgPercent!)}% (diagnostic baseline) → {Math.round(s.currentAvgPercent!)}% (current mastery)
                </p>
              ) : s.hasCurrentMastery ? (
                <p style={{ margin: '0.4rem 0', fontFamily: 'var(--font-mono)' }}>
                  {Math.round(s.currentAvgPercent!)}% current mastery (no diagnostic baseline on record)
                </p>
              ) : s.hasBaseline ? (
                <p style={{ margin: '0.4rem 0' }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(s.baselineAvgPercent!)}%</span> diagnostic baseline.{' '}
                  {t('report.baselineNote', lang)}
                </p>
              ) : (
                <p style={{ margin: '0.4rem 0', color: 'var(--slate)' }}>{t('report.baselineNote', lang)}</p>
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
