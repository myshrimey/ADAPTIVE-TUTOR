import { fakeDb } from './fakedb2';
import { foldEvidence, intervalFor, capToExam, buildReviewPlan, mixOrder, priorityOf, istDayStr, addDaysStr, LADDER } from '../packages/core/revision/schedule';
import { syncReviewSchedule, loadReviewPlan } from '../packages/core/revision/store';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };
const at = (day: string, h = 10) => `${day}T${String(h).padStart(2, '0')}:00:00+05:30`;
const ev = (day: string, c: boolean[], h = 10) => c.map((x, i) => ({ at: at(day, h + (i % 5)), correct: x }));

ok(istDayStr('2026-10-01T20:00:00Z') === '2026-10-02', 'IST day rolls over at 18:30 UTC');
ok(addDaysStr('2026-10-30', 3) === '2026-11-02', 'addDays');
// first day: due next day
let s = foldEvidence(null, ev('2026-10-01', [true, true, false]))!;
ok(s.dueOn === '2026-10-02' && s.rung === 0 && s.lastResult === 'first', 'first sight → due tomorrow');
// ten questions in one day do not push it out
s = foldEvidence(s, ev('2026-10-01', Array(10).fill(true), 12))!;
ok(s.dueOn === '2026-10-02' && s.rung === 0 && s.reps === 0, 'same-day practice does not advance');
// pass on due day → rung 1 (3 days)
s = foldEvidence(s, ev('2026-10-02', [true, true, true]))!;
ok(s.rung === 1 && s.dueOn === '2026-10-05' && s.lastResult === 'pass' && s.reps === 1, 'pass moves up: ' + JSON.stringify(s));
// early pass: no change
const early = foldEvidence(s, ev('2026-10-03', [true, true]))!;
ok(early.rung === 1 && early.dueOn === '2026-10-05' && early.lastResult === 'early', 'early pass changes nothing');
// early miss counts as forgetting
const em = foldEvidence(s, ev('2026-10-03', [false, false, true]))!;
ok(em.rung === 0 && em.lapses === 1 && em.dueOn === '2026-10-04', 'early miss → sooner');
// climb the whole ladder
let t = foldEvidence(null, ev('2026-10-01', [true]))!; let day = '2026-10-02';
for (let k = 0; k < 8; k++) { t = foldEvidence(t, ev(day, [true, true]))!; day = t.dueOn; }
ok(t.rung === LADDER.length - 1 && t.intervalDays === 60, 'tops out at 60 days: ' + t.rung + '/' + t.intervalDays);
// miss on due day resets
const f1 = foldEvidence(t, ev(t.dueOn, [false, false, true]))!;
ok(f1.rung === 0 && f1.lapses === 1 && f1.lastResult === 'fail', 'miss resets to step 1');
// idempotent: same evidence twice
const once = foldEvidence(null, [...ev('2026-10-01', [true]), ...ev('2026-10-02', [true, true])])!;
const twice = foldEvidence(once, [...ev('2026-10-01', [true]), ...ev('2026-10-02', [true, true])])!;
ok(JSON.stringify(once) === JSON.stringify(twice), 'folding the same evidence again changes nothing');
ok(intervalFor(2, 0) === 7 && intervalFor(2, 2) === 5 && intervalFor(0, 5) === 1, 'lapses shorten, never below 1 day');
// exam cap
ok(capToExam('2026-12-01', '2026-11-20', '2026-10-26') === '2026-11-19', 'never due after the exam starts');
ok(capToExam('2026-12-01', '2026-10-01', '2026-10-26') === '2026-12-01', 'exam date in the past is ignored');
ok(capToExam('2026-12-01', null) === '2026-12-01' && capToExam('2026-12-01', 'garbage') === '2026-12-01', 'no/invalid exam date ignored');
// plan
const mk = (id: string, due: string, rung: number, chapter: string, lapses = 0) => ({ competencyId: id, name: id, chapter, rung, intervalDays: 1, reps: 0, lapses, dueOn: due, lastDay: '2026-10-01', lastResult: 'pass' as const, lastEvidenceAt: '2026-10-01T00:00:00Z', importance: 3, mastery: 0.5 });
const states = [mk('a', '2026-10-20', 0, 'Algebra'), mk('b', '2026-10-25', 0, 'Algebra'), mk('c', '2026-10-26', 4, 'Geometry'), mk('d', '2026-10-28', 1, 'Geometry'), mk('e', '2026-11-20', 2, 'Stats'), mk('g', '2026-10-26', 0, 'Algebra', 2)];
const p = buildReviewPlan({ states, today: '2026-10-26', examDate: null });
ok(p.mode === 'daily' && p.dueTotal === 4 && p.overdueTotal === 2, 'due counts: ' + p.dueTotal);
ok(p.weekly.count === 1 && p.cumulative === 1, 'weekly + cumulative');
ok(p.daily.filter((x, i) => i > 0 && x.chapter === p.daily[i - 1].chapter).length <= 1, 'chapters mixed as far as the data allows (3 Algebra + 1 Geometry → at most one same-chapter pair)');
ok(p.daily.length <= 6 && p.minutes === p.daily.length * 2, 'capped');
ok(p.daily[0].competencyId === 'a' || p.daily[0].competencyId === 'g', 'most overdue / most lapsed first');
const pre = buildReviewPlan({ states, today: '2026-10-26', examDate: '2026-11-05' });
ok(pre.mode === 'pre_exam' && pre.daysToExam === 10 && /10 days/.test(pre.note), 'pre-exam mode');
ok(buildReviewPlan({ states: [], today: '2026-10-26' }).note.startsWith('Nothing to revise yet'), 'empty note');
ok(priorityOf(5, 0, 3, 0.5) > priorityOf(0, 0, 3, 0.5) && priorityOf(0, 3, 3, 0.5) > priorityOf(0, 0, 3, 0.5) && priorityOf(0, 0, 5, 0.5) > priorityOf(0, 0, 1, 0.5), 'priority orders sensibly');
ok(mixOrder([{ chapter: 'A', priority: 3 }, { chapter: 'A', priority: 2 }, { chapter: 'B', priority: 1 }]).map((x) => x.chapter).join('') === 'ABA', 'mix puts B between As');

// store on a fake DB
(async () => {
  const T: Record<string, any[]> = {
    competencies: [{ id: 'c1', name: 'Linear equations', chapter: 'Algebra', skill_id: 's1', importance: 3 }, { id: 'c2', name: 'Triangles', chapter: 'Geometry', skill_id: 's2', importance: 4 }],
    student_competency_evidence: [], review_schedule: [], student_competency_mastery: [{ student_id: 'st', competency_id: 'c1', mastery: 0.4 }],
  };
  const today = istDayStr(Date.now());
  const d1 = addDaysStr(today, -3), d2 = addDaysStr(today, -1);
  const push = (cid: string, day: string, c: boolean) => T.student_competency_evidence.push({ student_id: 'st', competency_id: cid, correct: c, hint_used: false, created_at: at(day) });
  push('c1', d1, true); push('c1', d1, true); push('c2', d2, false);
  const db: any = fakeDb(T, { rels: { review_schedule: { competencies: { table: 'competencies', fk: 'competency_id' } } } });
  const r1 = await syncReviewSchedule(db, 'st');
  ok(!r1.error && r1.updated === 2 && T.review_schedule.length === 2, 'sync creates 2 rows: ' + JSON.stringify(r1));
  ok(T.review_schedule.find((x) => x.competency_id === 'c1').due_on === addDaysStr(d1, 1), 'c1 due the day after first sight');
  const r2 = await syncReviewSchedule(db, 'st');
  ok(r2.updated === 0, 'second sync changes nothing');
  const plan = await loadReviewPlan(db, 'st');
  ok(plan.dueTotal === 2 && plan.daily.length === 2, 'both due: ' + JSON.stringify([plan.dueTotal, plan.daily.length]));
  ok(plan.daily.some((x) => x.name === 'Linear equations' && x.mastery === 0.4), 'names and mastery joined');
  // student answers c1 correctly today → advances
  push('c1', today, true);
  await loadReviewPlan(db, 'st');
  const row = T.review_schedule.find((x) => x.competency_id === 'c1');
  ok(row.rung === 1 && row.last_result === 'pass', 'review answer advances c1');
  const plan2 = await loadReviewPlan(db, 'st');
  ok(!plan2.daily.some((x) => x.competencyId === 'c1'), 'c1 no longer due today');
  console.log('t68', f ? 'FAILED ' + f : 'ok');
})();
