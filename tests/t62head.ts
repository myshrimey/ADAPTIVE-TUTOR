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


const C = runs['C strong fundamentals, weak application'];
console.log(C.baseline.gaps.map(g=>g.severity+' '+g.rootName+' c'+g.rootClass+' floor '+g.floorName+' aff '+g.affectedTargetIds.length));
console.log(C.baseline.path.filter(p=>p.stage==='prerequisite_repair').map(p=>p.name+' c'+p.classLevel));
const A = runs['A strong Class 10'];
console.log(A.baseline.profile.map(p=>p.domain+' dem '+p.demonstratedLevel+' ev '+p.evidence+' '+p.assessedLevels));
console.log('--- A answers');
for (const a of A.state.answered) { const c = graph.get(a.competencyId)!; console.log(a.step, c.domain, 'c'+c.classLevel, c.name.slice(0,40), a.kind, 'd'+a.difficulty, a.correct, a.errorType); }
import { estimates } from '../packages/core/baseline';
const est = estimates(A.state, graph);
for (const [id,e] of est) { const c = graph.get(id)!; if (c.domain==='algebra') console.log(c.classLevel, c.name.slice(0,40), e.mastery, e.status, e.evidenceCount, e.inferredCount); }
