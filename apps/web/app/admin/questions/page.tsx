import { createServiceClient } from '@/lib/supabase-server';
import { adminPageGate, AdminNav } from '@/lib/admin-page';
import { summariseQuestions, difficultyMismatch, MIN_ATTEMPTS, MISMATCH_GAP, type AttemptRow } from '@adaptive-tutor/core';

// Founder-only: how questions behave with real students compared with the difficulty they were
// written with (master prompt v3 sec. 26). Questions need MIN_ATTEMPTS answers before they are judged.
export const dynamic = 'force-dynamic';

async function pageAll(q: (a: number, b: number) => PromiseLike<{ data: any[] | null }>, max = 50000) {
  const out: any[] = [];
  for (let a = 0; a < max; a += 1000) {
    const { data } = await q(a, a + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export default async function AdminQuestionStatsPage() {
  const gate = await adminPageGate();
  if ('gate' in gate) return gate.gate;
  const service = createServiceClient();

  const [practice, diag, qs, dqs] = await Promise.all([
    pageAll((a, b) => service.from('question_attempts').select('question_id, is_correct, hints_used, time_taken_seconds').range(a, b)),
    pageAll((a, b) => service.from('diagnostic_answers').select('diagnostic_question_id, is_correct').range(a, b)),
    pageAll((a, b) => service.from('questions').select('id, difficulty, prompt, skills(name)').range(a, b), 20000),
    pageAll((a, b) => service.from('diagnostic_questions').select('id, difficulty, prompt, skills(name)').range(a, b), 20000),
  ]);

  const rows: AttemptRow[] = [
    ...practice.map((r) => ({ questionId: r.question_id, correct: !!r.is_correct, hintsUsed: r.hints_used, seconds: r.time_taken_seconds })),
    ...diag.map((r) => ({ questionId: r.diagnostic_question_id, correct: !!r.is_correct })),
  ];
  const stats = summariseQuestions(rows);
  const meta = new Map<string, { difficulty: number; prompt: string; skill: string }>();
  for (const q of [...qs, ...dqs]) meta.set(q.id, { difficulty: Number(q.difficulty), prompt: String(q.prompt ?? ''), skill: q.skills?.name ?? '' });

  const judged = [...stats.values()].filter((s) => s.enough && meta.has(s.questionId));
  const flagged = judged
    .map((s) => ({ s, m: meta.get(s.questionId)!, flag: difficultyMismatch(meta.get(s.questionId)!.difficulty, s) }))
    .filter((x) => x.flag)
    .sort((a, b) => Math.abs((b.s.observedDifficulty ?? 0) - b.m.difficulty) - Math.abs((a.s.observedDifficulty ?? 0) - a.m.difficulty))
    .slice(0, 50);

  return (
    <main className="page">
      <div className="shell">
        <div style={{ paddingTop: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 'var(--step-3)' }}>Question statistics</h1>
          <AdminNav />
          <p style={{ color: 'var(--slate)' }}>
            Written difficulty is a 1-5 estimate made when the question was created. Observed difficulty comes from how real students answered. A question is judged only after {MIN_ATTEMPTS} answers, and is listed here when the two differ by {MISMATCH_GAP} or more. This is for teachers to review; nothing changes automatically.
          </p>
          <div className="stat-tile-row">
            <div className="stat-tile"><div className="stat-tile__value">{rows.length}</div><div className="stat-tile__label">Answers recorded</div></div>
            <div className="stat-tile"><div className="stat-tile__value">{stats.size}</div><div className="stat-tile__label">Questions answered at least once</div></div>
            <div className="stat-tile"><div className="stat-tile__value">{judged.length}</div><div className="stat-tile__label">Questions with {MIN_ATTEMPTS}+ answers</div></div>
          </div>
        </div>

        {judged.length === 0 ? (
          <p style={{ marginTop: 'var(--space-3)' }}>Not enough answers yet. This fills in as students practise: insufficient evidence for every question so far.</p>
        ) : flagged.length === 0 ? (
          <p style={{ marginTop: 'var(--space-3)' }}>No question differs from its written difficulty by {MISMATCH_GAP} or more.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 'var(--space-3)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)' }}>
                  <th>Question</th><th>Skill</th><th>Written</th><th>Observed</th><th>Answers</th><th>Correct</th><th>Avg time</th><th>Used a hint</th><th>Check</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map(({ s, m, flag }) => (
                  <tr key={s.questionId} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ maxWidth: '22rem' }}>{m.prompt.slice(0, 110)}{m.prompt.length > 110 ? '…' : ''}</td>
                    <td>{m.skill}</td>
                    <td>{m.difficulty}</td>
                    <td>{s.observedDifficulty}</td>
                    <td>{s.attempts}</td>
                    <td>{s.percentCorrect}%</td>
                    <td>{s.avgSeconds === null ? '—' : `${s.avgSeconds}s`}</td>
                    <td>{s.hintPercent === null ? '—' : `${s.hintPercent}%`}</td>
                    <td>{flag === 'harder_than_written' ? 'Harder than written' : 'Easier than written'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
