import { redirect } from 'next/navigation';
import { createServerClient, getCurrentStudentId } from '@/lib/supabase-server';
import { loadCurriculum } from '@adaptive-tutor/core';
import { MasteryArc } from '@/components/MasteryArc';

export default async function DashboardPage() {
  let studentId: string;
  try {
    studentId = await getCurrentStudentId();
  } catch {
    redirect('/');
  }

  const supabase = await createServerClient();

  const { data: student } = await supabase.from('students').select('display_name').eq('id', studentId).single();

  const { data: masteryRows } = await supabase.from('mastery_states').select('skill_id, score, band').eq('student_id', studentId);
  const masteryBySkill = new Map((masteryRows ?? []).map((r) => [r.skill_id, r]));

  const curriculum = await loadCurriculum(supabase, 'CBSE', '10');

  const { data: sessions } = await supabase
    .from('learning_sessions')
    .select('id, status, starting_mastery, ending_mastery, started_at, skills(name)')
    .eq('student_id', studentId)
    .order('started_at', { ascending: false })
    .limit(5);

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'var(--step-3)' }}>{student?.display_name ? `${student.display_name}'s progress` : 'Progress'}</h1>
          </div>
          <a href="/learn" className="btn btn--accent">
            Continue learning
          </a>
        </div>

        {curriculum.subjects.map((subject) => {
          const subjectScores = subject.chapters.flatMap((c) => c.topics.flatMap((t) => t.skills)).map((s) => masteryBySkill.get(s.id)?.score ?? 0);
          const subjectAvg = subjectScores.length ? subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length : 0;
          const subjectBand = subjectAvg >= 90 ? 'mastered' : subjectAvg >= 60 ? 'developing' : 'needs_foundation';

          return (
            <section key={subject.id} style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <MasteryArc score={subjectAvg} band={subjectBand} label={subject.name} size={104} />
                <div>
                  <h2 style={{ marginBottom: '0.2rem' }}>{subject.name}</h2>
                  <p style={{ color: 'var(--slate)', margin: 0 }}>{subject.chapters.length} chapters</p>
                </div>
              </div>

              {subject.chapters.map((chapter) => {
                const skills = chapter.topics.flatMap((t) => t.skills);
                const started = skills.some((s) => masteryBySkill.has(s.id));

                return (
                  <div key={chapter.id} className="chapter-row">
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
                        {!started && 'Not started yet'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}

        <section style={{ marginTop: 'var(--space-5)' }}>
          <h2>Recent sessions</h2>
          {sessions && sessions.length > 0 ? (
            <div>
              {sessions.map((s: any) => (
                <div key={s.id} className="chapter-row">
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
            <p style={{ color: 'var(--slate)' }}>No sessions yet — start one above.</p>
          )}
        </section>
      </div>
    </main>
  );
}
