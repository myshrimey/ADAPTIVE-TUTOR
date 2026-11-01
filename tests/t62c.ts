import { fakeDb } from './fakedb2';
import { cleanContribution, contributeQuestion, reviewQuestion, createQuestionRequest, setRequestStatus, listRegister, provenanceSummary, cleanRequest, requestBankGrowth, MIN_GROWTH_PER_SESSION } from '../packages/core';
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const SK = '11111111-1111-1111-1111-111111111111';
(async () => {
  const db = fakeDb({ skills: [{ id: SK, name: 'Quadratic formula', topics: null }], questions: [{ id: 'old1', skill_id: SK, prompt: 'Old seeded question here', origin: 'seed_import', content_status: 'verified' }], diagnostic_questions: [], diagnostic_tests: [], baseline_items: [], adult_profiles: [{ user_id: 'u-tutor', display_name: 'Asha Tutor' }, { user_id: 'u-centre', display_name: 'Bright Centre' }], teacher_profiles: [{ user_id: 'u-teach', display_name: 'Mr Rao' }], content_reviews: [], question_requests: [], question_bank_growth: [] }, { defaults: { question_requests: { fulfilled_count: 0 } } });
  const good = { skillId: SK, bank: 'practice', questionType: 'mcq', prompt: 'What is the discriminant of x^2 - 4x + 4?', options: ['0', '4', '8', '16'], answer: '0', difficulty: 3 };
  ok(!cleanContribution({ ...good, prompt: 'short' }).ok, 'short prompt refused');
  ok(!cleanContribution({ ...good, answer: '5' }).ok, 'answer must be an option');
  ok(!cleanContribution({ ...good, options: ['0', '0', '1'] }).ok, 'duplicate options refused');
  ok(!cleanContribution({ ...good, difficulty: 9 }).ok, 'difficulty range');
  ok(!cleanContribution({ ...good, questionType: 'numeric', answer: 'abc' }).ok, 'numeric answer must be a number');
  ok(!cleanContribution({ ...good, skillId: 'x' }).ok, 'skill id checked');
  const t = await contributeQuestion(db, { userId: 'u-tutor', role: 'tutor' }, good);
  const row = db._tables.questions.find((q: any) => q.id === t.id);
  ok(row.origin === 'tutor_upload' && row.contributed_by === 'u-tutor' && row.contributed_role === 'tutor' && row.content_status === 'needs_review' && row.validated === false, 'tutor upload tagged and unreviewed');
  let dup = false; try { await contributeQuestion(db, { userId: 'u-centre', role: 'centre', orgUserId: 'u-centre' }, good); } catch { dup = true; }
  ok(dup, 'same question twice refused');
  const c = await contributeQuestion(db, { userId: 'u-centre', role: 'centre', orgUserId: 'u-centre' }, { ...good, prompt: 'Find the discriminant of 2x^2 + 3x + 1.', answer: '1', options: ['1', '2', '3', '5'] });
  ok(db._tables.questions.find((q: any) => q.id === c.id).contributor_org === 'u-centre', 'centre recorded');
  let bad = false; try { await contributeQuestion(db, { userId: 'u-stu', role: 'student' as any }, { ...good, prompt: 'Another question about discriminants?' }); } catch { bad = true; }
  ok(bad, 'student cannot upload');
  const tv = await contributeQuestion(db, { userId: 'u-teach', role: 'teacher' }, { ...good, prompt: 'Teacher asks: root of x^2 = 49 positive?', answer: '7', questionType: 'numeric', options: undefined, markVerified: true });
  ok(db._tables.questions.find((q: any) => q.id === tv.id).content_status === 'needs_review', 'a teacher cannot self-verify');
  const av = await contributeQuestion(db, { userId: null, role: 'admin', email: 'boss@x.in' }, { ...good, prompt: 'Admin question: value of 3 squared?', answer: '9', questionType: 'numeric', options: undefined, markVerified: true });
  const ar = db._tables.questions.find((q: any) => q.id === av.id);
  ok(ar.content_status === 'verified' && ar.reviewed_by === 'boss@x.in', 'admin can mark verified with reviewer recorded');
  await reviewQuestion(db, 'boss@x.in', 'questions', t.id, 'approve', 'looks right');
  ok(db._tables.questions.find((q: any) => q.id === t.id).content_status === 'verified' && db._tables.questions.find((q: any) => q.id === t.id).reviewed_by === 'boss@x.in', 'review approves and records reviewer');
  await reviewQuestion(db, 'boss@x.in', 'questions', c.id, 'reject', 'wrong key');
  ok(db._tables.questions.find((q: any) => q.id === c.id).content_status === 'rejected', 'review rejects');
  let unk = false; try { await reviewQuestion(db, 'a', 'users', 'x', 'approve'); } catch { unk = true; }
  ok(unk, 'review limited to the three question tables');
  db._tables.content_reviews.push({ item_id: t.id, verdict: 'approve', teacher_user_id: 'u-teach' });
  const reg = await listRegister(db, {});
  const rt = reg.find((r) => r.id === t.id)!;
  ok(rt.contributorName === 'Asha Tutor' && rt.contributorRole === 'tutor' && rt.reviewedBy === 'boss@x.in' && rt.teacherReviews[0]?.name === 'Mr Rao', 'register shows who uploaded, who reviewed, teacher feedback');
  ok(reg.find((r) => r.id === 'old1')!.origin === 'seed_import', 'old questions show as original bank');
  ok((await listRegister(db, { role: 'centre' })).every((r) => r.contributorRole === 'centre'), 'filter by uploader role');
  const sum = await provenanceSummary(db);
  ok(sum.total === 5 && sum.byContributor.some((x) => x.name === 'Asha Tutor' && x.verified === 1) && sum.byContributor.some((x) => x.name === 'Bright Centre' && x.rejected === 1), 'summary counts per uploader');
  // requests
  ok(!cleanRequest({ wantedCount: 10 }).ok && !cleanRequest({ topicText: 'x', wantedCount: 999 }).ok, 'request validation');
  const rq = await createQuestionRequest(db, { userId: 'u-centre', role: 'centre', orgUserId: 'u-centre' }, { skillId: SK, wantedCount: 2 });
  db._tables.question_requests[0].id = '22222222-2222-2222-2222-222222222222'; rq.id = '22222222-2222-2222-2222-222222222222';
  const q1 = await contributeQuestion(db, { userId: 'u-centre', role: 'centre' }, { ...good, prompt: 'Request answer one: discriminant of x^2+1?', answer: '-4', questionType: 'numeric', options: undefined, requestId: rq.id });
  ok(db._tables.question_requests[0].fulfilled_count === 1 && db._tables.question_requests[0].status === 'in_progress', 'request progresses');
  await contributeQuestion(db, { userId: 'u-centre', role: 'centre' }, { ...good, prompt: 'Request answer two: discriminant of x^2-1?', answer: '4', questionType: 'numeric', options: undefined, requestId: rq.id });
  ok(db._tables.question_requests[0].status === 'fulfilled', 'request fulfilled when enough');
  ok(db._tables.questions.find((q: any) => q.id === q1.id).request_id === rq.id, 'question linked to its request');
  await setRequestStatus(db, 'boss@x.in', rq.id, 'declined');
  ok(db._tables.question_requests[0].handled_by === 'boss@x.in', 'admin handling recorded');
  for (let i = 0; i < 10; i++) await createQuestionRequest(db, { userId: 'u-tutor', role: 'tutor' }, { topicText: 'topic ' + i, wantedCount: 5 });
  let cap = false; try { await createQuestionRequest(db, { userId: 'u-tutor', role: 'tutor' }, { topicText: 'one more', wantedCount: 5 }); } catch { cap = true; }
  ok(cap, 'at most 10 open requests per person');
  // minimum growth per session
  await requestBankGrowth(db, 'sub1', 3);
  ok(db._tables.question_bank_growth[0].pending === MIN_GROWTH_PER_SESSION && MIN_GROWTH_PER_SESSION === 10, 'a session owes at least 10 even if asked for less');
  await requestBankGrowth(db, 'sub1');
  ok(db._tables.question_bank_growth[0].pending === 10 + 50, 'default session start still owes 50');
  console.log(`\nt62c: ${pass} passed, ${fail} failed`);
})();
