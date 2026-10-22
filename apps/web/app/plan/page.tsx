import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { getServerLang } from '@/lib/language';
import { buildParentReport, composeStudyPlan, loadWeakSkills, loadSettings } from '@adaptive-tutor/core';

// "What should I do this week?" Built from recorded evidence only (see packages/core/planning/study-plan.ts).
export default async function PlanPage() {
  let studentId: string;
  try {
    studentId = await getCurrentStudentId();
  } catch (e: any) {
    redirect(e?.message === 'device_limit' ? '/device-limit' : '/');
  }
  const lang = await getServerLang();
  const hi = lang === 'hi';
  const supabase = await createServerClient();
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const [report, weak, { data: profile }, { count }, boardSettings] = await Promise.all([
    buildParentReport(supabase, studentId),
    loadWeakSkills(supabase, studentId),
    supabase.from('learning_profiles').select('daily_study_minutes').eq('student_id', studentId).maybeSingle(),
    supabase.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('student_id', studentId).gte('started_at', since),
    loadSettings(createServiceClient()),
  ]);

  const plan = composeStudyPlan({
    today: new Date(),
    examStart: boardSettings.boards.board1_date ?? undefined,
    dailyMinutes: profile?.daily_study_minutes ?? null,
    sessionsLast14Days: count ?? 0,
    lang: hi ? 'hi' : 'en',
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

  const phaseText = (hi ? { build: 'नींव मज़बूत करें', strengthen: 'मज़बूत करें और परखें', revise: 'दोहराएँ और समय में अभ्यास करें' } : { build: 'Build the base', strengthen: 'Strengthen and test', revise: 'Revise and practise under time' })[plan.phase];

  return (
    <main className="page">
      <div className="shell shell--narrow">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{hi ? 'आपकी अध्ययन योजना' : 'Your study plan'}</h1>
          <p style={{ color: 'var(--slate)' }}>
            {hi
              ? <>{plan.datesSet ? `लगभग ${plan.weeksLeft} सप्ताह बचे हैं (परीक्षा की तिथि ${plan.examStart})।` : `परीक्षा की तिथि अभी दर्ज नहीं है, इसलिए अगले 12 सप्ताह की योजना दिखाई गई है।`} चरण: <strong>{phaseText}</strong>। सप्ताह में लगभग {plan.weeklyMinutes} मिनट, पाँच दिन; दो दिन छुट्टी।</>
              : <>{plan.datesSet ? `About ${plan.weeksLeft} weeks to go (exam date ${plan.examStart}).` : 'The exam date has not been entered yet, so this shows the next 12 weeks.'} Stage: <strong>{phaseText}</strong>. About {plan.weeklyMinutes} minutes a week, five days, two days free.</>}
          </p>
          <p style={{ color: 'var(--slate)', fontSize: '0.88rem' }}>
            {hi ? 'यह योजना हर बार आपके ताज़ा अभ्यास से दोबारा बनती है। यह एक मार्गदर्शन है, अंकों की भविष्यवाणी नहीं।' : 'This plan is rebuilt from your latest practice every time you open it. It is a guide, not a prediction of marks.'}
          </p>
        </div>

        {plan.notes.map((n) => (
          <p key={n} className="plan-note">{n}</p>
        ))}

        {plan.subjects.length === 0 && (
          <p style={{ color: 'var(--slate)', marginTop: 'var(--space-3)' }}>
            {hi ? 'अभी कोई विषय नहीं है। पहले डायग्नोस्टिक दें ताकि सहायक के पास योजना बनाने का प्रमाण हो।' : 'No subjects yet. Take a diagnostic first so Sahayak has evidence to plan from.'}
          </p>
        )}

        {plan.subjects.map((s) => (
          <section key={s.subjectId} className="chapter-row" style={{ marginTop: 'var(--space-3)', alignItems: 'flex-start' }}>
            <div className="chapter-row__body">
              <div className="chapter-row__title">
                {s.name} <span style={{ color: 'var(--slate)', fontWeight: 400 }}>· {hi ? `सप्ताह में लगभग ${s.minutesPerWeek} मिनट` : `about ${s.minutesPerWeek} min a week`}</span>
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
          <a className="btn btn--primary" href="/learn">{hi ? 'आज का अभ्यास शुरू करें' : "Start today's practice"}</a>
        </p>
      </div>
    </main>
  );
}
