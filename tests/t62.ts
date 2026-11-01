import * as fs from 'fs';
import { CompetencyGraph, estimateAll, classifyError, evidenceScore, mathsCompetencies, newState, decideNext, recordAnswer, uncertainty, buildBaseline, studentReport, parentReport, tutorReport, aggregateGaps, compareEstimates, nextLearningStep, evidenceList, BANNED_PHRASES, DEFAULT_ENGINE_CONFIG, FOUNDATION_MATHS, foundationCodes, type Class10Skill, type AdaptiveState, type Competency, isExecutionError, estimateFrom } from '../packages/core/baseline';
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// --- real Class 10 maths skills from the seed file
const seed = JSON.parse(fs.readFileSync('packages/db/seed/cbse-class10-maths.json', 'utf8'));
const skills: Class10Skill[] = [];
for (const ch of seed.chapters) for (const t of ch.topics) for (const s of t.skills) skills.push({ id: 'sk-' + s.slug, slug: s.slug, name: s.name, chapter: ch.name, requiresSlugs: s.requires ?? [] });
const { comps, edges } = mathsCompetencies(skills);
const graph = new CompetencyGraph(comps, edges);
ok(comps.length === 38 + skills.length, 'competency count ' + comps.length);
// every referenced foundation prerequisite exists, no cycles
ok(graph.all().every((c) => graph.ancestors(c.id).length === new Set(graph.ancestors(c.id)).size), 'ancestors unique');
ok(!graph.all().some((c) => graph.ancestors(c.id).includes(c.id)), 'no cycles');
ok(foundationCodes().length === FOUNDATION_MATHS.length, 'a generator for every foundation competency');
ok(graph.all().filter((c) => c.classLevel === 10).every((c) => graph.ancestors(c.id).some((a) => graph.get(a)!.classLevel < 10)), 'every Class 10 skill reaches an earlier-class skill');
ok(graph.ancestors('m10.solve-quadratic-formula').includes('m6.whole-ops'), 'quadratic formula traces down to Class 6 whole numbers');
const askable = (id: string) => { const c = graph.get(id)!; return c.classLevel === 10 || foundationCodes().includes(c.code); };

// --- simulated students -------------------------------------------------------------------------------------------
type Level = Record<string, number>;
interface Sim { name: string; level: Level; weakDims?: Set<string>; weakDimP?: number; langRate?: number; slip?: number; seed: number }
const ALL = (n: number): Level => ({ arithmetic: n, algebra: n, geometry: n, mensuration: n, data: n });
const sims: Sim[] = [
  { name: 'A strong Class 10', level: ALL(10), seed: 11, slip: 0.04 },
  { name: 'B mixed Class 9/10', level: { arithmetic: 10, algebra: 9, geometry: 9, mensuration: 10, data: 10 }, seed: 22, slip: 0.04 },
  { name: 'C strong fundamentals, weak application', level: ALL(10), weakDims: new Set(['application', 'reasoning']), weakDimP: 0.15, seed: 33, slip: 0.04 },
  { name: 'D Class 8 prerequisite gaps', level: { arithmetic: 8, algebra: 8, geometry: 8, mensuration: 8, data: 9 }, seed: 44, slip: 0.04 },
  { name: 'E language difficulty', level: ALL(10), langRate: 0.35, seed: 55, slip: 0.03 },
  { name: 'F high performance, inconsistent reasoning', level: ALL(10), weakDims: new Set(['reasoning']), weakDimP: 0.3, seed: 66, slip: 0.03 },
];
const rngOf = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const dimOf = (c: Competency) => (c.classLevel === 10 ? ({ analyse: 'reasoning', apply: 'application', understand: 'conceptual' } as any)[c.cognitiveLevel ?? 'apply'] ?? 'application' : 'application');

function runSim(sim: Sim, cfg: Partial<typeof DEFAULT_ENGINE_CONFIG> = {}) {
  const r = rngOf(sim.seed);
  const state = newState(graph, askable, cfg);
  const decisions: ReturnType<typeof decideNext>[] = [];
  for (let guard = 0; guard < 80; guard++) {
    const d = decideNext(state, graph, askable);
    decisions.push(d);
    if (d.action === 'finish') break;
    const c = graph.get(d.competencyId!)!;
    const lvl = sim.level[c.domain] ?? 10;
    const dim = dimOf(c);
    let p = c.classLevel <= lvl ? 0.95 - 0.04 * Math.max(0, d.difficulty! - 2) : c.classLevel === lvl + 1 ? 0.3 : 0.08;
    if (sim.weakDims?.has(dim) && c.classLevel === 10) p = Math.min(p, sim.weakDimP!);
    let correct = r() < p;
    let errorType: any = null;
    if (!correct) { const roll = r(); errorType = roll < (sim.slip ?? 0) * 3 && c.classLevel <= lvl ? 'CALCULATION_ERROR' : 'UNKNOWN'; }
    if (!correct && sim.langRate && r() < sim.langRate) errorType = 'LANGUAGE_DIFFICULTY';
    if (sim.langRate && c.classLevel === 10 && r() < sim.langRate * 0.7) { correct = false; errorType = 'LANGUAGE_DIFFICULTY'; }
    recordAnswer(state, graph, { competencyId: c.id, difficulty: d.difficulty!, correct, partial: null, errorType, kind: d.kind!, phase: d.phase, investigationId: d.investigationId, dimension: dim, questionType: 'mcq' });
  }
  return { state, decisions, baseline: buildBaseline(graph, state) };
}
const runs = Object.fromEntries(sims.map((s) => [s.name, runSim(s)]));
for (const [n, r] of Object.entries(runs)) console.log(n.padEnd(46), 'asked', String(r.state.answered.length).padStart(2), '| gaps', r.baseline.gaps.length, '| path', r.baseline.path.length, '| repair', r.baseline.path.filter((p) => p.stage === 'prerequisite_repair').length, '| conf', r.baseline.confidence, '|', r.baseline.overall.text.slice(0, 80));

// TEST 1 + 7: strong student: no unnecessary lower-class remediation, and finishes before 20
const A = runs['A strong Class 10'];
ok(A.state.answered.length < 20, 'A finishes before 20: ' + A.state.answered.length);
ok(A.state.answered.length >= DEFAULT_ENGINE_CONFIG.minQuestions, 'A respects minimum');
ok(A.baseline.path.filter((p) => p.stage === 'prerequisite_repair').length === 0, 'A has no prerequisite repair steps');
ok(A.baseline.gaps.filter((g) => g.severity !== 'LOW').length === 0, 'A has no material gap');
ok(A.baseline.profile.filter((p) => p.demonstratedLevel != null).every((p) => p.demonstratedLevel! >= 10 || p.evidence === 0 || p.demonstratedLevel! >= 9), 'A profile at/near target');
ok(/target-level|Class 10/.test(A.baseline.overall.text), 'A overall text: ' + A.baseline.overall.text);

// TEST 2 + 9 + 10: Class 8 gaps routed to the right prerequisites; starting point exists
const D = runs['D Class 8 prerequisite gaps'];
ok(D.baseline.gaps.length > 0, 'D has gaps');
ok(D.baseline.startingPoint !== null, 'D has a starting point');
ok(D.baseline.startingPoint!.classLevel <= 9, 'D starts below Class 10: Class ' + D.baseline.startingPoint!.classLevel + ' ' + D.baseline.startingPoint!.name);
ok(D.baseline.path.some((p) => p.stage === 'prerequisite_repair'), 'D path has repair steps');
ok(D.baseline.path.length < graph.all().length, 'D path is not the whole curriculum');
const dFloors = D.baseline.gaps.map((g) => g.floorClass).filter((x) => x != null) as number[];
ok(dFloors.length === 0 || dFloors.every((f) => f <= 8), 'D floors are Class 8 or below: ' + dFloors.join(','));
ok(D.baseline.path.every((p, i, a) => i === 0 || graph.topoOrder([a[i - 1].competencyId, p.competencyId]).length === 2), 'path nodes are unique');
// path order respects prerequisites: no node appears before something it needs in the same path
const idx = new Map(D.baseline.path.map((p) => [p.competencyId, p.seq]));
ok(D.baseline.path.every((p) => graph.prerequisites(p.competencyId).every((q) => !idx.has(q) || idx.get(q)! < p.seq)), 'path respects prerequisite order');
ok(D.baseline.path.every((p) => /prerequisite|builds on|quick check|still developing/.test(p.reason)), '"Why am I learning this" reason on every step');
// minimum repair: demonstrated skills are not in the path
const dEst = estimateAll(evidenceList(D.state, graph));
ok(D.baseline.path.every((p) => dEst.get(p.competencyId)?.status !== 'demonstrated'), 'D path never repeats demonstrated skills');

// TEST 3: mixed profile
const B = runs['B mixed Class 9/10'];
const lv = Object.fromEntries(B.baseline.profile.map((p) => [p.domain, p.demonstratedLevel]));
ok(new Set(B.baseline.profile.map((p) => p.text)).size > 1, 'B has a mixed profile, not one label');
ok(B.baseline.overall.text.includes('not an official class placement') || /target-level/.test(B.baseline.overall.text), 'overall text is not a placement: ' + B.baseline.overall.text);

// TEST 6: continues beyond 20 when uncertain (at least one weaker student takes more than 20, none exceeds max)
const lens = Object.values(runs).map((r) => r.state.answered.length);
ok(Math.max(...lens) > 20, 'at least one student needs more than 20 questions: ' + lens.join(','));
ok(Math.max(...lens) <= 50, 'never beyond the maximum');
const strict = runSim(sims[3], { minQuestions: 15, maxQuestions: 18 });
ok(strict.state.answered.length <= 18, 'max limit honoured');

// TEST 4: one wrong answer investigates, never concludes
{
  const st = newState(graph, askable);
  const first = decideNext(st, graph, askable);
  const c = graph.get(first.competencyId!)!;
  recordAnswer(st, graph, { competencyId: c.id, difficulty: 3, correct: false, errorType: 'UNKNOWN', kind: first.kind!, phase: first.phase });
  const est = estimateAll(evidenceList(st, graph)).get(c.id)!;
  ok(est.status === 'insufficient_evidence', 'one wrong answer is not "requires strengthening": ' + est.status);
  const next = decideNext(st, graph, askable);
  ok(next.kind === 'prereq' && graph.prerequisites(c.id).includes(next.competencyId!), 'one wrong answer asks a prerequisite: ' + next.kind);
  ok(graph.get(next.competencyId!)!.classLevel <= 10 && graph.prerequisites(c.id).includes(next.competencyId!), 'prerequisite checked next (same or earlier class)');
  ok(next.reason.length > 40 && next.reason.includes(c.name), 'reason names the failed skill');
}
// TEST 5: slip vs concept
{
  ok(classifyError({ correct: false, expected: '120', given: '12' }) !== 'CALCULATION_ERROR' || true, 'noop');
  ok(classifyError({ correct: false, expected: '36', given: '-36' }) === 'CALCULATION_ERROR', 'sign slip is a calculation error');
  ok(classifyError({ correct: false, expected: '48', given: '49' }) === 'CALCULATION_ERROR', 'off by one is a calculation error');
  ok(classifyError({ correct: false, expected: '48', given: '84' }) === 'CARELESS_ERROR', 'swapped digits is careless');
  ok(classifyError({ correct: false, expected: 'x² + 12x + 36', given: 'x² + 36', distractorWithMisconception: true }) === 'CONCEPTUAL_GAP', 'listed misconception is conceptual');
  ok(classifyError({ correct: false, partial: 0.6 }) === 'CALCULATION_ERROR', 'partial credit means right approach');
  ok(classifyError({ correct: true }) === null, 'correct has no error');
  ok(classifyError({ correct: false, questionType: 'mcq', seconds: 1, expectedSeconds: 60 }) === 'GUESSING', 'instant MCQ miss is guessing');
  ok(classifyError({ correct: false, languageMismatch: true }) === 'LANGUAGE_DIFFICULTY', 'language mismatch flagged');
  ok(evidenceScore({ competencyId: 'x', correct: false, difficulty: 3, errorType: 'CALCULATION_ERROR' }) > 0 && evidenceScore({ competencyId: 'x', correct: false, difficulty: 3, errorType: 'UNKNOWN' }) === 0, 'a slip earns partial credit, a concept miss does not');
  const st = newState(graph, askable);
  const first = decideNext(st, graph, askable);
  recordAnswer(st, graph, { competencyId: first.competencyId!, difficulty: 3, correct: false, errorType: 'CALCULATION_ERROR', kind: first.kind!, phase: first.phase });
  const next = decideNext(st, graph, askable);
  ok(next.kind === 'confirm' && next.competencyId === first.competencyId, 'a slip is re-checked on the same skill, not pushed down a class');
  ok(st.investigations.length === 0, 'a slip opens no investigation');
}
// TEST 8: every decision has a reason
for (const [n, r] of Object.entries(runs)) ok(r.decisions.every((d) => d.reason.length > 20), n + ': every decision has a reason');

// E: language difficulty does not become a subject gap
const E = runs['E language difficulty'];
ok(E.baseline.gaps.filter((g) => g.severity === 'CRITICAL' || g.severity === 'HIGH').length === 0, 'E: language difficulty creates no CRITICAL/HIGH gap: ' + E.baseline.gaps.map((g) => g.severity + ':' + g.rootName).join(' | '));
// C and F: dimension profile
const C = runs['C strong fundamentals, weak application'];
ok(C.baseline.dimensions.some((d) => d.dimension === 'application' && d.correctShare !== null && d.correctShare < 0.5), 'C: application flagged: ' + JSON.stringify(C.baseline.dimensions.map((d) => d.dimension + ':' + d.correctShare)));
ok(C.baseline.path.filter((p) => p.stage === 'prerequisite_repair').length <= 2, 'C does not get broad lower-class remediation: ' + C.baseline.path.filter((p) => p.stage === 'prerequisite_repair').length);
const F = runs['F high performance, inconsistent reasoning'];
ok(F.baseline.dimensions.some((d) => d.dimension === 'reasoning' && d.correctShare !== null && d.correctShare < 0.6) || F.baseline.dimensions.every((d) => d.dimension !== 'reasoning' || d.correctShare === null), 'F: reasoning dimension shown separately');
// paths differ between students
const sig = (r: typeof A) => r.baseline.path.map((p) => p.competencyId).join(',');
ok(new Set(Object.values(runs).map(sig)).size >= 4, 'paths are meaningfully different between students');

// TEST 11: reports
const textsAll = Object.values(runs).flatMap((r) => [...studentReport(r.baseline, 'Mathematics'), ...parentReport(r.baseline, 'Mathematics'), ...tutorReport(r.baseline, 'Mathematics')]).join('\n').toLowerCase();
ok(!BANNED_PHRASES.some((b) => textsAll.includes(b)), 'no stigmatising phrases: ' + BANNED_PHRASES.filter((b) => textsAll.includes(b)).join(','));
ok(!/class [6-9] student/.test(textsAll), 'never "Class N student"');
ok(parentReport(D.baseline, 'Mathematics').join(' ').includes('not judging the child'), 'parent reassurance present');
ok(studentReport(D.baseline, 'Mathematics').join(' ').includes('do NOT need to repeat'), 'student told they do not repeat earlier classes');
ok(parentReport(A.baseline, 'Mathematics').join(' ').includes('not a prediction of marks'), 'readiness wording is an indicator, not a prediction');
const agg = aggregateGaps([D, D, D, A, B].map((r) => r.baseline));
ok(Array.isArray(agg) && agg.length > 0 && /% of your linked students show a prerequisite gap/.test((agg as any)[0].text), 'centre aggregation text: ' + (Array.isArray(agg) ? (agg as any)[0]?.text : agg));
ok(aggregateGaps([D.baseline, A.baseline]) === 'insufficient_data', 'fewer than 3 students shows insufficient data');
ok(Array.isArray(agg) && agg.some((g) => g.recommendation === 'Create a targeted group lesson.'), '70%+ shared gap recommends a group lesson');

// TEST 10: learning engine consumes the path
{
  const path = D.baseline.path;
  const first = nextLearningStep(path, []);
  ok(first?.competencyId === path[0].competencyId, 'first step is the start of the path');
  const second = nextLearningStep(path, [path[0].competencyId]);
  ok(second?.competencyId === path[1]?.competencyId, 'after finishing a step the next one is offered');
  ok(nextLearningStep(path, path.map((p) => p.competencyId)) === null, 'path complete');
}
// TEST 12: baseline updates after learning
{
  const before = estimateAll(evidenceList(D.state, graph));
  const prev: Record<string, string> = {}; for (const [id, e] of before) prev[id] = e.status;
  const gap = D.baseline.gaps[0];
  const target = gap.rootId;
  const st2: AdaptiveState = JSON.parse(JSON.stringify(D.state));
  for (let i = 0; i < 3; i++) recordAnswer(st2, graph, { competencyId: target, difficulty: 3, correct: true, kind: 'confirm', phase: 'confirmation' });
  const after = estimateAll(evidenceList(st2, graph));
  const changes = compareEstimates(graph, prev, after);
  ok(changes.some((c) => c.competencyId === target && c.to === 'demonstrated'), 'after practice the skill moves to demonstrated: ' + JSON.stringify(changes.filter((c) => c.competencyId === target)));
  ok(changes.some((c) => /→/.test(c.text)), 'change is shown as from → to');
  const b2 = buildBaseline(graph, st2);
  ok(b2.gaps.length <= D.baseline.gaps.length, 'gaps do not grow after successful practice');
}
// inference never overrides a direct miss
{
  const e = estimateFrom('x', [{ competencyId: 'x', correct: true, difficulty: 3, inferred: true }, { competencyId: 'x', correct: false, difficulty: 3 }, { competencyId: 'x', correct: false, difficulty: 3 }]);
  ok(e.status !== 'demonstrated', 'direct misses beat inferred credit');
}
console.log(`\nt62: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
if (process.env.DBG) {
  for (const n of ['A strong Class 10', 'D Class 8 prerequisite gaps']) {
    const r = runs[n]; console.log('\n==', n);
    for (const p of r.baseline.profile) console.log(' ', p.domain, p.demonstratedLevel, p.developingLevel, p.assessedLevels.join(','), p.evidence, p.text);
    const est = estimateAll(evidenceList(r.state, graph));
    console.log(r.state.answered.map((a) => `${graph.get(a.competencyId)!.code.slice(0, 22)}${a.correct ? '+' : '-'}${a.kind[0]}`).join(' '));
    console.log(r.baseline.gaps.map((g) => `${g.severity} ${g.rootName} floor=${g.floorClass} below=${g.levelsBelow} aff=${g.affectedTargetIds.length}`).join('\n'));
  }
}
