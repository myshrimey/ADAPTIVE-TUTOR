import { redirect } from 'next/navigation';
import { ReferralPanel } from '@/components/ReferralPanel';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { loadCurriculum, loadSubjectCatalogue, loadLearnerState, loadEngagement, planSession, t } from '@adaptive-tutor/core';
import { SubjectIcon } from '@/components/SubjectIcon';
import { CountUp } from '@/components/CountUp';
import { getServerLang } from '@/lib/language';
import { TodayCard } from '@/components/engagement/TodayCard';

// Short, varied study tips — picked by day of year so it changes daily
// without needing any client-side state, rather than always showing the
// same one. Generic and evergreen on purpose (no CBSE dates/numbers here —
// that stable factual content lives in the footer instead).
const TIPS = [
  'Re-doing a question you got wrong teaches you more than ten new ones you get right.',
  "A wrong answer with a clear reason why is more useful than a guess that happened to be correct.",
  'Short, frequent sessions beat one long cram — the sidebar progress bar is there so you can see steady movement.',
  'If a hint makes something click, try the next similar question without one — that\'s the real test.',
  'Reading a worked example once rarely sticks. Working through it with pen and paper does.',
  'Mixing question types (MCQ, numeric, short answer) on the same topic is exactly how CBSE papers are structured.',
  "Mistakes you understand are worth more than marks you don't.",
  'A skill you "mastered" last month is worth revisiting — that\'s what the retention part of your score tracks.',
];

export default async function DashboardOverviewPage() {
  let studentId: string;
  try {
    studentId = await getCurrentStudentId();
  } catch (e: any) {
    redirect(e?.message === 'device_limit' ? '/device-limit' : '/');
  }

  const supabase = await createServerClient();
  const lang = await getServerLang();

  const [{ data: student }, { data: masteryRows }, curriculum, { data: sessions }, completedCountResult, catalogue] = await Promise.all([
    supabase.from('students').select('display_name').eq('id', studentId).single(),
    supabase.from('mastery_states').select('skill_id, score').eq('student_id', studentId),
    loadCurriculum(supabase, 'CBSE', '10'),
    supabase
      .from('learning_sessions')
      .select('id, status, started_at, skills(name)')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })
      .limit(3),
    supabase.from('learning_sessions').select('id', { count: 'exact', head: true }).eq('student_id', studentId).eq('status', 'completed'),
    loadSubjectCatalogue(supabase, studentId),
  ]);
  const registeredIds = new Set(catalogue.filter((c) => c.registered).map((c) => c.id));
  const activeSubjectId = catalogue.find((c) => c.active)?.id ?? null;

  const masteryBySkill = new Map((masteryRows ?? []).map((r) => [r.skill_id, r.score as number]));
  const overallMastery = masteryRows && masteryRows.length > 0 ? masteryRows.reduce((sum, r) => sum + Number(r.score), 0) / masteryRows.length : 0;
  const skillsTouched = masteryRows?.length ?? 0;
  const sessionsCompleted = completedCountResult.count ?? 0;

  // Show only the subjects this student registered for or has already worked
  // in — not every subject in the catalogue — and never a coming-soon one.
  const visibleSubjects = curriculum.subjects.filter((subject) => {
    const usable = subject.status === 'ready' || subject.status === 'pilot';
    if (!usable) return false;
    const started = subject.chapters.some((c) => c.topics.some((t) => t.skills.some((s) => masteryBySkill.has(s.id))));
    return registeredIds.has(subject.id) || started;
  });
  const subjectAverages = visibleSubjects.map((subject) => {
    const scores = subject.chapters.flatMap((c) => c.topics.flatMap((t) => t.skills)).map((s) => masteryBySkill.get(s.id) ?? null);
    const touched = scores.filter((s) => s !== null) as number[];
    const avg = touched.length ? touched.reduce((a, b) => a + b, 0) / touched.length : 0;
    return { id: subject.id, name: subject.name, slug: subject.slug, status: subject.status, avg, started: touched.length > 0, active: subject.id === activeSubjectId };
  });

  // Today's recommended session: the skill the learner model says to work on next, sized to the
  // study time the student gave at sign-up. Falls back quietly if anything is missing.
  let todaySkill: { name: string; subject: string; mastery: number | null } | null = null;
  let todayQuestions: number | null = null;
  let streak = 0;
  try {
    const [state, engagement, { data: profile }] = await Promise.all([
      masteryRows && masteryRows.length > 0 ? loadLearnerState(supabase, studentId) : Promise.resolve(null),
      loadEngagement(supabase, studentId, 30),
      supabase.from('learning_profiles').select('daily_study_minutes').eq('student_id', studentId).maybeSingle(),
    ]);
    streak = engagement.currentStreakDays;
    todayQuestions = planSession({ availableMinutes: profile?.daily_study_minutes ?? null, goal: null, recoveryMode: false }).targetQuestions;
    const objectiveId = state?.currentObjective?.skillId;
    if (objectiveId) {
      for (const subject of curriculum.subjects) {
        for (const ch of subject.chapters) for (const tp of ch.topics) for (const sk of tp.skills) {
          if (sk.id === objectiveId) todaySkill = { name: sk.name, subject: subject.name, mastery: masteryBySkill.has(sk.id) ? Math.round(masteryBySkill.get(sk.id)!) : null };
        }
      }
    }
  } catch {
    // The dashboard still works without the recommendation.
  }

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];

  return (
    <main className="page">
      <div className="shell">
        <div className="hero-banner fade-slide-in" style={{ marginTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">Dashboard</p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>
            {student?.display_name ? t('dashboard.welcomeBack', lang, { name: student.display_name }) : t('dashboard.welcomeBackPlain', lang)}
          </h1>
          <p className="hero__lede" style={{ marginBottom: 0 }}>
            {skillsTouched > 0 ? "Here's where things stand today." : 'Start a session or take a diagnostic to get going.'}
          </p>
        </div>

        <TodayCard lang={lang} />
        <ReferralPanel compact />

        <section className="tip-card fade-slide-in" style={{ marginTop: 'var(--space-3)' }}>
          <span className="tip-card__eyebrow">Today&apos;s session{streak > 0 ? ` · ${streak}-day streak` : ''}</span>
          {todaySkill ? (
            <p className="tip-card__body">
              Suggested: <strong>{todaySkill.name}</strong> ({todaySkill.subject}
              {todaySkill.mastery !== null ? `, currently ${todaySkill.mastery}%` : ''}).
              {todayQuestions ? ` About ${todayQuestions} questions fit the study time you chose.` : ''}{' '}
              <a href="/learn">Start today&apos;s session</a>
            </p>
          ) : (
            <p className="tip-card__body">
              {skillsTouched === 0 ? 'Take a short diagnostic first so Sahayak can suggest where to begin.' : 'Open a session to carry on where you left off.'}{' '}
              <a href={skillsTouched === 0 ? '/diagnostic' : '/learn'}>{skillsTouched === 0 ? 'Start the diagnostic' : 'Start a session'}</a>
            </p>
          )}
        </section>

        <div className="stat-tile-row fade-slide-in" style={{ animationDelay: '0.05s' }}>
          <div className="stat-tile stat-tile--gradient">
            <span className="stat-tile__value">
              <CountUp value={Math.round(overallMastery)} suffix="%" />
            </span>
            <span className="stat-tile__label">{t('dashboard.overallMastery', lang)}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile__value">
              <CountUp value={sessionsCompleted} />
            </span>
            <span className="stat-tile__label">{t('dashboard.sessionsCompleted', lang)}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile__value">
              <CountUp value={skillsTouched} />
            </span>
            <span className="stat-tile__label">{t('dashboard.skillsInProgress', lang)}</span>
          </div>
        </div>

        <div className="quick-actions fade-slide-in" style={{ animationDelay: '0.1s' }}>
          <a href="/learn" className="quick-action-card quick-action-card--accent">
            <span className="quick-action-card__title">Continue learning</span>
            <span className="quick-action-card__body">Jump back into your next adaptive session.</span>
          </a>
          <a href="/diagnostic" className="quick-action-card">
            <span className="quick-action-card__title">Take a diagnostic test</span>
            <span className="quick-action-card__body">Check where you stand on a subject, any time.</span>
          </a>
          <a href="/progress" className="quick-action-card">
            <span className="quick-action-card__title">View full progress</span>
            <span className="quick-action-card__body">See every chapter and skill, tracked individually.</span>
          </a>
          <a href="/papers" className="quick-action-card">
            <span className="quick-action-card__title">Browse past papers</span>
            <span className="quick-action-card__body">Previous year question papers and solutions, shared by students.</span>
          </a>
          <a href="/profile" className="quick-action-card">
            <span className="quick-action-card__title">Complete your profile</span>
            <span className="quick-action-card__body">Add your school and a bit of background — just a couple of minutes.</span>
          </a>
          <a href="/report" className="quick-action-card">
            <span className="quick-action-card__title">{t('nav.report', lang)}</span>
            <span className="quick-action-card__body">
              {lang === 'hi' ? 'एक सारांश जो आप अपने माता-पिता के साथ साझा कर सकते हैं।' : 'A summary you can share with your parents.'}
            </span>
          </a>
        </div>

        {subjectAverages.length > 0 && (
          <section className="fade-slide-in" style={{ marginTop: 'var(--space-4)', animationDelay: '0.15s' }}>
            <h2 style={{ fontSize: 'var(--step-1)', marginBottom: '0.6rem' }}>
              Your subjects <a href="/subjects" style={{ fontSize: '0.85rem', fontWeight: 400, marginLeft: '0.6rem' }}>{t('subject.manageLink', lang)}</a>
            </h2>
            <div className="subject-chip-row">
              {subjectAverages.map((s) => (
                <a key={s.id} href="/progress" className="subject-chip">
                  <SubjectIcon slug={s.slug} size={34} />
                  <span className="subject-chip__name">{s.name}{s.status === 'pilot' ? ` · ${t('subject.status.pilot', lang)}` : ''}{s.active ? ' ●' : ''}</span>
                  <span className="subject-chip__score">{s.started ? `${Math.round(s.avg)}%` : 'Not started'}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="tip-card fade-slide-in pop-in" style={{ marginTop: 'var(--space-4)', animationDelay: '0.2s' }}>
          <span className="tip-card__eyebrow">Did you know?</span>
          <p className="tip-card__body">{tip}</p>
        </section>

        <section style={{ marginTop: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ fontSize: 'var(--step-1)' }}>Recent sessions</h2>
            <a href="/progress" style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>
              See full history
            </a>
          </div>
          {sessions && sessions.length > 0 ? (
            <div>
              {sessions.map((s: any, i: number) => (
                <div key={s.id} className="chapter-row fade-slide-in" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="chapter-row__body">
                    <div className="chapter-row__title">{s.skills?.name ?? 'Skill'}</div>
                    <div className="chapter-row__skills">{s.status}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--slate)' }}>No sessions yet — start one above.</p>
          )}
        </section>
      </div>
    </main>
  );
}
