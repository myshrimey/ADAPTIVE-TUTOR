import { redirect } from 'next/navigation';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { loadCurriculum } from '@adaptive-tutor/core';
import { SubjectIcon } from '@/components/SubjectIcon';
import { CountUp } from '@/components/CountUp';

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
  } catch {
    redirect('/');
  }

  const supabase = await createServerClient();

  const [{ data: student }, { data: masteryRows }, curriculum, { data: sessions }, completedCountResult] = await Promise.all([
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
  ]);

  const masteryBySkill = new Map((masteryRows ?? []).map((r) => [r.skill_id, r.score as number]));
  const overallMastery = masteryRows && masteryRows.length > 0 ? masteryRows.reduce((sum, r) => sum + Number(r.score), 0) / masteryRows.length : 0;
  const skillsTouched = masteryRows?.length ?? 0;
  const sessionsCompleted = completedCountResult.count ?? 0;

  const subjectAverages = curriculum.subjects.map((subject) => {
    const scores = subject.chapters.flatMap((c) => c.topics.flatMap((t) => t.skills)).map((s) => masteryBySkill.get(s.id) ?? null);
    const touched = scores.filter((s) => s !== null) as number[];
    const avg = touched.length ? touched.reduce((a, b) => a + b, 0) / touched.length : 0;
    return { id: subject.id, name: subject.name, slug: subject.slug, avg, started: touched.length > 0 };
  });

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];

  return (
    <main className="page">
      <div className="shell">
        <div className="fade-slide-in" style={{ paddingTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">Dashboard</p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{student?.display_name ? `Welcome back, ${student.display_name}` : 'Welcome back'}</h1>
        </div>

        <div className="stat-tile-row fade-slide-in" style={{ animationDelay: '0.05s' }}>
          <div className="stat-tile stat-tile--gradient">
            <span className="stat-tile__value">
              <CountUp value={Math.round(overallMastery)} suffix="%" />
            </span>
            <span className="stat-tile__label">Overall mastery</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile__value">
              <CountUp value={sessionsCompleted} />
            </span>
            <span className="stat-tile__label">Sessions completed</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile__value">
              <CountUp value={skillsTouched} />
            </span>
            <span className="stat-tile__label">Skills in progress</span>
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
        </div>

        {subjectAverages.length > 0 && (
          <section className="fade-slide-in" style={{ marginTop: 'var(--space-4)', animationDelay: '0.15s' }}>
            <h2 style={{ fontSize: 'var(--step-1)', marginBottom: '0.6rem' }}>Your subjects</h2>
            <div className="subject-chip-row">
              {subjectAverages.map((s) => (
                <a key={s.id} href="/progress" className="subject-chip">
                  <SubjectIcon slug={s.slug} size={34} />
                  <span className="subject-chip__name">{s.name}</span>
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
