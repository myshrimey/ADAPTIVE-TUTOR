import { fakeDb } from './fakedb2';
import { reportedQuestions } from '../packages/core/feedback-intel/extras-store';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };
(async () => {
  const db: any = fakeDb({ feedback: [
    { id: 1, context: { questionId: 'q1' }, kind: 'question', message: 'Answer key wrong', created_at: '2026-10-27T00:00:00Z' },
    { id: 2, context: { questionId: 'q1' }, kind: 'question', message: 'Same', created_at: '2026-10-28T00:00:00Z' },
    { id: 3, context: { questionId: 'q2' }, kind: null, message: 'Typo', created_at: '2026-10-28T01:00:00Z' },
    { id: 4, context: { device: 'mobile' }, kind: null, message: 'No question id', created_at: '2026-10-28T02:00:00Z' },
    { id: 5, context: null, kind: null, message: 'No context', created_at: '2026-10-28T03:00:00Z' },
  ] });
  const r = await reportedQuestions(db);
  ok(r.length === 2 && r[0].questionId === 'q1' && r[0].reports === 2 && r[0].kinds.join() === 'question' && r[0].latest.startsWith('2026-10-28') && r[1].questionId === 'q2', 'ranked by reports, ignores rows without a question id');
  ok((await reportedQuestions(fakeDb({ feedback: [] }))).length === 0, 'empty is empty');
  console.log('t74', f ? 'FAILED ' + f : 'ok');
})();
