import { scaffoldStage, scaffoldNote, SCAFFOLD_STAGES } from '../packages/core/pedagogy/scaffold';
import { buildTutorPrompt } from '../packages/core/prompts/tutor.prompt';
import { buildReviewPlan } from '../packages/core/revision/schedule';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };
const R = (c = true, h = 0) => ({ correct: c, hints: h });
const st = (score: number, history: any[] = [], strategy?: string, firstExposure?: boolean) => scaffoldStage({ masteryScore: score, history, strategy, firstExposure });

ok(st(0, [], 'EXPLAIN', true) === 'full_example', 'first time → full worked example');
ok(st(10) === 'full_example' && st(40) === 'partial_example' && st(60) === 'guided' && st(75) === 'hint_only' && st(90) === 'independent', 'mastery sets the starting level');
ok(st(40, [R(), R()]) === 'guided', 'two clean answers → one step less support (fading)');
ok(st(40, [R(), R(true, 1)]) === 'partial_example' || st(40, [R(), R(true, 1)]) === 'full_example', 'a hint was needed → no fading, one step back');
ok(st(60, [R(true), R(false)]) === 'partial_example', 'wrong answer → support returns: ' + st(60, [R(true), R(false)]));
ok(st(80, [R(false), R(false)]) === 'partial_example' || st(80, [R(false), R(false)]) === 'full_example', 'two wrong in a row → back to worked example');
ok(st(80, [R(false), R(false)]) !== 'independent', 'never independent right after two misses');
ok(st(95, [R(), R()]) === 'independent', 'cannot go past independent');
ok(st(0, [R(false)]) === 'full_example', 'cannot go below full example');
ok(st(30, [], 'REMEDIATION') === 'partial_example' && st(95, [], 'PREREQUISITE_REPAIR') === 'guided', 'repair strategies keep some support (not full, not none)');
ok(st(20, [], 'INDEPENDENT_TEST') === 'independent', 'a test is independent');
ok(st(40, [], 'CHALLENGE') === 'hint_only', 'challenge is at least hint-only');
// fading is monotonic: more clean answers never increases support
let prev = -1; let bad = false;
for (let n = 0; n <= 6; n++) { const idx = SCAFFOLD_STAGES.indexOf(st(45, Array(n).fill(R()))); if (idx < prev) bad = true; prev = idx; }
ok(!bad, 'more clean answers never add support');
// the prompt carries the instruction
const p = buildTutorPrompt({ skillName: 'x', learningObjective: 'y', strategy: 'GUIDED_PRACTICE', difficulty: 2, masteryBand: 'emerging', masteryScore: 30, lastMessages: [], studentMessage: 'hi', scaffoldNote: scaffoldNote({ masteryScore: 10, history: [] }) });
ok(/Support: Support level 1 of 5/.test(p.user), 'support instruction reaches the tutor prompt');
const q = buildTutorPrompt({ skillName: 'x', learningObjective: 'y', strategy: 'EXPLAIN', difficulty: 2, masteryBand: 'emerging', masteryScore: 30, lastMessages: [], studentMessage: 'hi' });
ok(!/Support:/.test(q.user), 'no note → prompt unchanged');
// mixed practice list
const mk = (id: string, due: string, chapter: string, mastery: number, lapses = 0) => ({ competencyId: id, name: id, chapter, rung: 2, intervalDays: 7, reps: 2, lapses, dueOn: due, lastDay: '2026-10-20', lastResult: 'pass' as const, lastEvidenceAt: '2026-10-20T00:00:00Z', importance: 3, mastery });
const plan = buildReviewPlan({ today: '2026-10-26', states: [mk('due', '2026-10-25', 'A', 0.9), mk('a1', '2026-11-02', 'A', 0.8), mk('a2', '2026-11-03', 'A', 0.8), mk('b1', '2026-11-04', 'B', 0.7), mk('weak', '2026-11-05', 'C', 0.3), mk('lapsed', '2026-11-05', 'C', 0.9, 1), mk('c1', '2026-11-06', 'C', 0.65)] });
const ids = plan.extra.map((x) => x.competencyId);
ok(!ids.includes('due') && !ids.includes('weak') && !ids.includes('lapsed'), 'mixed practice excludes due, weak and recently-forgotten skills: ' + ids);
ok(ids.length === 4 && plan.extra.filter((x, i) => i > 0 && x.chapter === plan.extra[i - 1].chapter).length <= 1, 'mixed across chapters');
ok(buildReviewPlan({ today: '2026-10-26', states: [] }).extra.length === 0, 'empty plan has no extras');
console.log('t70', f ? 'FAILED ' + f : 'ok');
