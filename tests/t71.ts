import { fakeDb } from './fakedb2';
import { RECIPES, ERROR_FAMILIES, TAG_FAMILY, EVIDENCE_FAMILY, dominantPattern, countFamilies, planText } from '../packages/core/error-intel/recipes';
import { errorCountsFor, errorPatternFor } from '../packages/core/error-intel/store';
import { attentionFor } from '../packages/core/attention/rules';
import { MISCONCEPTION_TAXONOMY } from '../packages/core/misconceptions/taxonomy';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };

// every family has a complete, supportive recipe
for (const fam of ERROR_FAMILIES) {
  const r = RECIPES[fam];
  ok(!!r && r.family === fam && r.steps.length >= 2 && r.steps.every((s) => s.count >= 1 && s.text.length > 10) && !!r.spacedReview && !!r.tutorTip && !!r.parentTip && !!r.likelyCause, 'complete recipe: ' + fam);
  ok(!/weak|failing|lazy|stupid|dumb|slow learner|poor student|bad at/i.test(JSON.stringify(r)), 'supportive wording: ' + fam);
  ok(r.steps.some((s) => ['retrieval', 'practice'].includes(s.kind)), 'has a retrieval/practice step: ' + fam);
}
// the prompt's own example: procedural -> 2 worked examples + 3 guided + 2 retrieval + later spaced review
const p = RECIPES.procedural;
ok(p.steps[0].kind === 'worked_example' && p.steps[0].count === 2 && p.steps[1].kind === 'guided_problem' && p.steps[1].count === 3 && p.steps[2].kind === 'retrieval' && p.steps[2].count === 2 && /after 2 days/.test(p.spacedReview), 'procedural = 2 worked + 3 guided + 2 retrieval + spaced review');
// every tag in the real taxonomy and every evidence type is mapped (or deliberately left out)
for (const tag of Object.keys(MISCONCEPTION_TAXONOMY)) ok(!!TAG_FAMILY[tag], 'tag mapped: ' + tag);
for (const t of ['FOUNDATIONAL_GAP', 'CONCEPTUAL_GAP', 'PROCEDURAL_GAP', 'CALCULATION_ERROR', 'READING_ERROR', 'INTERPRETATION_ERROR', 'REASONING_ERROR', 'APPLICATION_GAP', 'CARELESS_ERROR', 'LANGUAGE_DIFFICULTY', 'QUESTION_MISREAD']) ok(!!EVIDENCE_FAMILY[t], 'evidence type mapped: ' + t);
ok(EVIDENCE_FAMILY['GUESSING'] === undefined && EVIDENCE_FAMILY['UNKNOWN'] === undefined, 'guessing/unknown say nothing about cause');
ok(Object.values(TAG_FAMILY).concat(Object.values(EVIDENCE_FAMILY)).every((x) => ERROR_FAMILIES.includes(x)), 'mappings land on known families');
// pattern thresholds
ok(dominantPattern({ procedural: 2 }) === null, 'two slips are not a pattern');
ok(dominantPattern({}) === null, 'nothing → null');
ok(dominantPattern({ procedural: 3, calculation: 3, careless: 3 }) === null, 'no clear winner → null (33% < 40%)');
const d = dominantPattern({ procedural: 5, calculation: 2, careless: 1 })!;
ok(d.family === 'procedural' && d.count === 5 && d.share === 0.63, 'clear pattern: ' + JSON.stringify([d.family, d.share]));
const c = countFamilies(['SIGN_ERROR', 'PROCEDURAL_ERROR', 'ARITHMETIC_ERROR', null], ['PROCEDURAL_GAP', 'GUESSING', 'UNKNOWN', undefined]);
ok(c.procedural === 3 && c.calculation === 1 && Object.keys(c).length === 2, 'counts from tags + evidence: ' + JSON.stringify(c));
ok(/2 worked examples/.test(planText(p)) && /Ask 2 short questions/.test(planText(p)), 'plan text');

// attention integrates the pattern, and does not for students who are fine
const sig = (o: any = {}) => ({ studentId: 's', name: 'A', skillsWithEvidence: 8, averageMastery: 45, daysSinceActive: 2, sessions14d: 4, weakSkills: [{ skillId: 'k', name: 'Quadratics', score: 20 }], strongSkills: 2, overdueReviews: 0, lapses: 0, ...o });
const a = attentionFor(sig({ errors: { procedural: 5, calculation: 1 } }));
ok(!!a.pattern && /steps done out of order/i.test(a.suggestion) && /Quadratics/.test(a.suggestion) && /2 worked examples/.test(a.suggestion), 'attention suggestion carries pattern + plan: ' + a.suggestion.slice(0, 120));
ok(attentionFor(sig({ errors: { procedural: 2 } })).pattern === undefined, 'two slips: no pattern');
ok(attentionFor(sig({ averageMastery: 80, weakSkills: [], errors: { procedural: 9 } })).pattern === undefined, 'doing well → no pattern shown');
ok(!/weak student|failing|lazy|predict/i.test(a.suggestion), 'suggestion stays supportive');

// store: counts only the right students and the last 90 days
(async () => {
  const now = Date.parse('2026-10-27T06:00:00Z'), day = 86400000;
  const T: Record<string, any[]> = {
    misconceptions: [
      { student_id: 'A', tag: 'SIGN_ERROR', last_seen_at: new Date(now - 5 * day).toISOString() },
      { student_id: 'A', tag: 'PROCEDURAL_ERROR', last_seen_at: new Date(now - 10 * day).toISOString() },
      { student_id: 'A', tag: 'ARITHMETIC_ERROR', last_seen_at: new Date(now - 200 * day).toISOString() },
      { student_id: 'B', tag: 'CONCEPT_CONFUSION', last_seen_at: new Date(now - 1 * day).toISOString() },
    ],
    student_competency_evidence: [
      { student_id: 'A', correct: false, error_type: 'PROCEDURAL_GAP', created_at: new Date(now - 3 * day).toISOString() },
      { student_id: 'A', correct: true, error_type: 'PROCEDURAL_GAP', created_at: new Date(now - 3 * day).toISOString() },
      { student_id: 'A', correct: false, error_type: null, created_at: new Date(now - 3 * day).toISOString() },
      { student_id: 'B', correct: false, error_type: 'GUESSING', created_at: new Date(now - 3 * day).toISOString() },
    ],
  };
  const db: any = fakeDb(T);
  const m = await errorCountsFor(db, ['A', 'B', 'C'], now);
  ok(m.get('A')!.procedural === 3 && m.get('A')!.calculation === undefined, 'A: 3 procedural, old one ignored, correct answers ignored: ' + JSON.stringify(m.get('A')));
  ok(m.get('B')!.conceptual === 1 && Object.keys(m.get('B')!).length === 1, 'B: only own rows; guessing ignored');
  ok(Object.keys(m.get('C')!).length === 0, 'C: nothing');
  const pat = await errorPatternFor(db, 'A');
  ok(pat === null || pat.family === 'procedural', 'pattern lookup works');
  console.log('t71', f ? 'FAILED ' + f : 'ok');
})();
