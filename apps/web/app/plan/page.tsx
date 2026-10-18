import { redirect } from 'next/navigation';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { buildParentReport, composeStudyPlan, loadWeakSkills } from '@adaptive-tutor/core';

// "What should I do this week?" Built from recorded evidence only (see packages/core/planning/study-plan.ts).
export default async function PlanPage() {
  let studentId: string;
  try {
    studentId = await getCurrentStudentId();
  } catch (e: any) {
    redirect(e?.message === 'device_limit' ? '/device-limit' : '/');
  }
  const supabase = await createServerClient();
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const [report, weak, { data: profile }, { count }] = await Promise.all([
    buildParentReport(supabase, studentId),
    loadWeakSkills(supabase, studentId),
    supabase.from('learning_profiles').select('daily_study_minutes').eq('student_id', studentId).maybeSingle(),
    supabase.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('student_id', studentId).gte('started_at', since),
  ]);

  const plan = composeStudyPlan({
    today: new Date(),
    dailyMinutes: profile?.daily_study_minutes ?? null,
    sessionsLast14Days: count ?? 0,
    subjects: report.subjects.map((s) => ({
      subjectId: s.subjectId,
      name: s.subjectName,
      priority: s.priority,
      hasBaseline: s.hasBaseline,
      coveragePercent: s.coveragePercent,
      mockCount: s.mockCount,
      weakSkills: weak.get(s.subjectId) ?? [],
    })),
  });

  const phaseText = { build: 'Build the base', strengthen: 'Strengthen and test', revise: 'Revise and practise under time' }[plan.phase];

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Your study plan</h1>
          <p style={{ color: 'var(--slate)' }}>
            About {plan.weeksLeft} weeks to go (planning date {plan.examStart}; it will be updated when CBSE publishes the date sheet).
            Stage: <strong>{phaseText}</strong>. About {plan.weeklyMinutes} minutes a week, five days, two days free.
          </p>
          <p style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>
            This plan is rebuilt from your latest practice every time you open it. It is a guide, not a prediction of marks.
          </p>
        </div>

        {plan.notes.map((n) => (
          <p key={n} className="plan-note">{n}</p>
        ))}

        {plan.subjects.length === 0 && (
          <p style={{ color: 'var(--slate)', marginTop: 'var(--space-3)' }}>
            No subjects yet. Take a diagnostic first so Sahayak has evidence to plan from.
          </p>
        )}

        {plan.subjects.map((s) => (
          <section key={s.subjectId} className="chapter-row" style={{ marginTop: 'var(--space-3)', alignItems: 'flex-start' }}>
            <div className="chapter-row__body">
              <div className="chapter-row__title">
                {s.name} <span style={{ color: 'var(--slate)', fontWeight: 400 }}>· about {s.minutesPerWeek} min a week</span>
              </div>
              <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                {s.steps.map((st, i) => (
                  <li key={i}>{st.text}</li>
                ))}
              </ol>
            </div>
          </section>
        ))}

        <p style={{ marginTop: 'var(--space-3)' }}>
          <a className="btn btn--primary" href="/learn">Start today&apos;s practice</a>
        </p>
      </div>
    </main>
  );
}
