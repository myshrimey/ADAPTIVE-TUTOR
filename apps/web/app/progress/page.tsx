import { redirect } from 'next/navigation';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { loadCurriculum, t } from '@adaptive-tutor/core';
import { MasteryArc } from '@/components/MasteryArc';
import { SubjectIcon } from '@/components/SubjectIcon';
import { ParentLinkButton } from '@/components/ParentLinkButton';
import { getServerLang } from '@/lib/language';

// The detailed, skill-by-skill progress view — previously this WAS
// /dashboard. Split out so /dashboard can be a quick "what should I do
// right now" overview instead, with this page as its "see everything"
// destination (linked from there, from the header nav, and from the
// post-session summary).
export default async function ProgressPage() {
  let studentId: string;
  try {
    studentId = await getCurrentStudentId();
  } catch {
    redirect('/');
  }

  const supabase = await createServerClient();
  const lang = await getServerLang();

  const [{ data: student }, { data: masteryRows }, curriculum, { data: sessions }] = await Promise.all([
    supabase.from('students').select('display_name, parent_token').eq('id', studentId).single(),
    supabase.from('mastery_states').select('skill_id, score, band').eq('student_id', studentId),
    loadCurriculum(supabase, 'CBSE', '10'),
    supabase
      .from('learning_sessions')
      .select('id, status, starting_mastery, ending_mastery, started_at, skills(name)')
      .eq('student_id', studentId)
      .order('started_at', { ascending: false })
      .limit(5),
  ]);

  const masteryBySkill = new Map((masteryRows ?? []).map((r) => [r.skill_id, r]));

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="hero__eyebrow">{t('progress.skillBySkill', lang)}</p>
            <h1 style={{ fontSize: 'var(--step-3)' }}>{student?.display_name ? `${student.display_name}'s progress` : 'Progress'}</h1>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            {student?.parent_token && <ParentLinkButton parentToken={student.parent_token} />}
            <a href="/learn" className="btn btn--accent">
              Continue learning
            </a>
          </div>
        </div>

        {curriculum.subjects.map((subject, subjectIdx) => {
          const subjectScores = subject.chapters.flatMap((c) => c.topics.flatMap((t) => t.skills)).map((s) => masteryBySkill.get(s.id)?.score ?? 0);
          const subjectAvg = subjectScores.length ? subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length : 0;
          const subjectBand = subjectAvg >= 90 ? 'mastered' : subjectAvg >= 60 ? 'developing' : 'needs_foundation';

          return (
            <section key={subject.id} className="fade-slide-in" style={{ marginTop: 'var(--space-4)', animationDelay: `${subjectIdx * 0.08}s` }}>
              <div className={`subject-banner subject-banner--${subject.slug}`}>
                <SubjectIcon slug={subject.slug} size={52} />
                <MasteryArc score={subjectAvg} band={subjectBand} label={subject.name} size={104} />
                <div>
                  <h2 style={{ marginBottom: '0.2rem' }}>{subject.name}</h2>
                  <p style={{ color: 'var(--slate)', margin: 0 }}>{subject.chapters.length} chapters</p>
                </div>
              </div>

              {subject.chapters.map((chapter, i) => {
                const skills = chapter.topics.flatMap((t) => t.skills);
                const started = skills.some((s) => masteryBySkill.has(s.id));

                return (
                  <div key={chapter.id} className="chapter-row fade-slide-in" style={{ animationDelay: `${i * 0.03}s` }}>
                    <div className="chapter-row__body">
                      <div className="chapter-row__title">{chapter.name}</div>
                      <div className="chapter-row__skills">
                        {skills.map((skill) => {
                          const m = masteryBySkill.get(skill.id);
                          return m ? (
                            <span key={skill.id} className={`band band--${m.band}`} style={{ marginRight: '0.4rem' }}>
                              {skill.name.length > 28 ? skill.name.slice(0, 28) + '…' : skill.name}
                            </span>
                          ) : null;
                        })}
                        {!started && t('progress.notStarted', lang)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}

        <section style={{ marginTop: 'var(--space-5)' }}>
          <h2>{t('progress.recentSessions', lang)}</h2>
          {sessions && sessions.length > 0 ? (
            <div>
              {sessions.map((s: any, i: number) => (
                <div key={s.id} className="chapter-row fade-slide-in" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="chapter-row__body">
                    <div className="chapter-row__title">{s.skills?.name ?? 'Skill'}</div>
                    <div className="chapter-row__skills">
                      {s.status}
                      {s.starting_mastery != null && s.ending_mastery != null && (
                        <span style={{ fontFamily: 'var(--font-mono)' }}>
                          {' '}
                          · {Math.round(s.starting_mastery)} → {Math.round(s.ending_mastery)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--slate)' }}>{t('progress.noSessionsYet', lang)}</p>
          )}
        </section>
      </div>
    </main>
  );
}
