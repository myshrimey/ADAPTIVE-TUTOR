import { readFileSync } from 'fs';
import { selectEnrichment, selectStrategy, STRATEGY_INSTRUCTION, buildTutorPrompt, ENRICHMENT_ENABLED } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync('' + p, 'utf8');
const H = (k: number, hints = 0) => Array.from({ length: k }, () => ({ correct: true, hints }));
const base = { base: 'GUIDED_PRACTICE' as const, masteryScore: 60, finished: false, finalQuestion: false, gentler: false };
ok(ENRICHMENT_ENABLED === true, 'on by default');
ok(selectEnrichment({ ...base, history: H(2) }) === 'SELF_EXPLANATION', 'after 2 clean right answers');
ok(selectEnrichment({ ...base, history: H(1) }) === null && selectEnrichment({ ...base, history: H(3) }) === null && selectEnrichment({ ...base, history: H(4) }) === null, 'only on the 2nd, 6th, 10th answer');
ok(selectEnrichment({ ...base, history: H(6) }) === 'SELF_EXPLANATION' && selectEnrichment({ ...base, history: H(10) }) === 'SELF_EXPLANATION', 'every 4th answer after that');
ok(selectEnrichment({ ...base, history: [{ correct: true, hints: 0 }, { correct: false, hints: 0 }] }) === null, 'not after a wrong answer');
ok(selectEnrichment({ ...base, history: [{ correct: true, hints: 1 }, { correct: true, hints: 0 }] }) === null && selectEnrichment({ ...base, history: [{ correct: true, hints: 0 }, { correct: true, hints: 2 }] }) === null, 'not when hints were used');
for (const b of ['PREREQUISITE_REPAIR', 'REMEDIATION', 'REVIEW', 'INDEPENDENT_TEST', 'CHALLENGE', 'EXPLAIN', 'SIMPLIFY', 'HINT', 'EXAMPLE'] as const) ok(selectEnrichment({ ...base, base: b, history: H(2) }) === null, 'never replaces ' + b);
ok(selectEnrichment({ ...base, base: 'SOCRATIC', history: H(2) }) === 'SELF_EXPLANATION', 'Socratic ok');
ok(selectEnrichment({ ...base, history: H(2), masteryScore: 39 }) === null && selectEnrichment({ ...base, history: H(2), masteryScore: 90 }) === null, 'mastery window 40-89');
ok(selectEnrichment({ ...base, history: H(2), finished: true }) === null && selectEnrichment({ ...base, history: H(2), finalQuestion: true }) === null, 'never at the end of a session');
ok(selectEnrichment({ ...base, history: H(2), gentler: true }) === null, 'never on a gentler (recovery) turn');
ok(selectEnrichment({ ...base, history: H(2), goal: 'test_myself' }) === null, 'not when the student chose to test themselves');
// a whole session: it can never fire on two answers in a row
let fired: number[] = []; for (let k = 1; k <= 20; k++) if (selectEnrichment({ ...base, history: H(k) })) fired.push(k);
ok(fired.join() === '2,6,10,14,18', 'spacing over a session: ' + fired.join());
// existing rule engine untouched
ok(selectStrategy({ hasPrerequisiteGap: true, consecutiveMissesSameMisconception: 0, isFirstExposure: false, currentMasteryScore: 50, studentCommand: null, sessionObjectiveReached: false, masteredAndDueForReview: false }) === 'PREREQUISITE_REPAIR', 'existing rules unchanged');
ok(selectStrategy({ hasPrerequisiteGap: false, consecutiveMissesSameMisconception: 0, isFirstExposure: false, currentMasteryScore: 50, studentCommand: null, sessionObjectiveReached: false, masteredAndDueForReview: false }) === 'GUIDED_PRACTICE', 'selectStrategy itself never returns the new strategy');
// prompt carries the instruction, and only for the new strategy
const mk = (strategy: string) => buildTutorPrompt({ replyLanguage: 'en', skillName: 'S', learningObjective: 'O', strategy, difficulty: 2, masteryBand: 'developing', masteryScore: 60, lastMessages: [], studentMessage: 'x' } as any).user;
ok(/Strategy instruction: .*explain/.test(mk('SELF_EXPLANATION')) && /Do NOT ask a new question/.test(mk('SELF_EXPLANATION')), 'prompt tells the AI what to do');
ok(!/Strategy instruction/.test(mk('GUIDED_PRACTICE')), 'other strategies unchanged');
ok(!/give.*explanation yourself/i.test(STRATEGY_INSTRUCTION.SELF_EXPLANATION!) === false, 'AI told not to give the explanation');
// wiring
const o = R('packages/core/orchestrator/tutor.orchestrator.ts');
ok(/const enrich = selectEnrichment\(/.test(o) && /if \(enrich\) nextAction = enrich;/.test(o), 'wired in the answer turn');
ok(!/QUESTION_STRATEGIES: PedagogyStrategy\[\] = \[[^\]]*SELF_EXPLANATION/.test(o), 'self-explanation never poses a question');
ok(!/selectEnrichment/.test(o.split('async function handleMessageTurn')[1]?.split('async function handleAnswerTurn')[0] ?? ''), 'message turns (the typed explanation) are unaffected: not graded, no mastery change');
ok(/SELF_EXPLANATION: 'Explain in your own words'/.test(R('apps/web/app/admin/metrics/page.tsx')), 'admin metrics label');
console.log(`t86: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
