import { createServiceClient } from '@/lib/supabase-server';
import { loadCurriculum } from '@adaptive-tutor/core';
import { MasteryArc } from '@/components/MasteryArc';

// Deliberately public: a parent opening this link has no account and no
// session, so this reads through the service-role client rather than the
// session-bound one (see dashboard/page.tsx for the equivalent authenticated
// version). Only ever shows mastery/progress — no email, no settings, no
// way to act on the student's behalf. The token itself
// (packages/db/migrations/0004_parent_token.sql) is the only thing gating
// access, same trust model as any "anyone with the link" share link.
export default async function ParentViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const service = createServiceClient();

  const { data: student } = await service.from('students').select('id, display_name').eq('parent_token', token).maybeSingle();

  if (!student) {
    return (
      <main className="page">
        <div className="shell shell--narrow">
          <div style={{ paddingTop: 'var(--space-4)' }}>
            <h1 style={{ fontSize: 'var(--step-2)' }}>Link not found</h1>
            <p style={{ color: 'var(--slate)' }}>This progress link isn't valid — ask the student for a fresh one.</p>
          </div>
        </div>
      </main>
    );
  }

  const { data: masteryRows } = await service.from('mastery_states').select('skill_id, score, band').eq('student_id', student.id);
  const masteryBySkill = new Map((masteryRows ?? []).map((r) => [r.skill_id, r]));

  const curriculum = await loadCurriculum(service, 'CBSE', '10');

  const { data: sessions } = await service
    .from('learning_sessions')
    .select('id, status, starting_mastery, ending_mastery, started_at, skills(name)')
    .eq('student_id', student.id)
    .order('started_at', { ascending: false })
    .limit(5);

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <p className="hero__eyebrow">Read-only progress view</p>
          <h1 style={{ fontSize: 'var(--step-3)' }}>{student.display_name}'s progress</h1>
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
            <p style={{ color: 'var(--slate)' }}>No sessions yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
