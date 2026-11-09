// t114: interleaving rules are correct, safe, and still switched off (v114).
import { readFileSync } from 'fs';
import { shouldInterleave, pickInterleaveSkill, INTERLEAVE_ENABLED, INTERLEAVE_EVERY, type InterleaveSkill } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const sk = (id: string, o: Partial<InterleaveSkill> = {}): InterleaveSkill => ({ id, name: id, chapterId: 'c1', retired: false, mastery: 75, lastSeenAt: '2026-10-01T00:00:00Z', ...o });
const cur = { id: 'cur', chapterId: 'c1' };

// ---- picking the skill
ok(pickInterleaveSkill([], cur) === null, 'no skills: nothing to mix in');
ok(pickInterleaveSkill([sk('cur')], cur) === null, 'never the current skill');
ok(pickInterleaveSkill([sk('a', { retired: true })], cur) === null, 'never a retired skill');
ok(pickInterleaveSkill([sk('a', { mastery: 59 })], cur) === null && pickInterleaveSkill([sk('a', { mastery: 60 })], cur)?.id === 'a', 'mastery 60 is the line');
ok(pickInterleaveSkill([sk('a', { mastery: null })], cur) === null, 'no recorded mastery: no interleaving (no evidence)');
ok(pickInterleaveSkill([sk('a', { lastSeenAt: null })], cur) === null, 'never seen: not chosen');
ok(pickInterleaveSkill([sk('same', { chapterId: 'c1' }), sk('other', { chapterId: 'c2' })], cur)?.id === 'other', 'a different chapter is preferred');
ok(pickInterleaveSkill([sk('new', { chapterId: 'c2', lastSeenAt: '2026-10-20T00:00:00Z' }), sk('old', { chapterId: 'c3', lastSeenAt: '2026-09-01T00:00:00Z' })], cur)?.id === 'old', 'then the one seen longest ago');
ok(pickInterleaveSkill([sk('b'), sk('a')], cur)?.id === 'a', 'ties are broken by id (repeatable)');
const pool = [sk('x', { chapterId: 'c2' }), sk('y', { chapterId: 'c3' })]; const snapshot = JSON.stringify(pool); pickInterleaveSkill(pool, cur);
ok(JSON.stringify(pool) === snapshot, 'does not change its input');

// ---- when to interleave
const good = (len: number, last = { correct: true, hints: 0 }) => Array.from({ length: len }, (_, i) => (i === len - 1 ? last : { correct: true, hints: 0 }));
const base = { base: 'GUIDED_PRACTICE', masteryScore: 70, history: good(3), finished: false, finalQuestion: false, gentler: false, goal: null as string | null, candidate: sk('a') };
ok(!INTERLEAVE_ENABLED, 'the real switch is OFF (not connected to the tutor)');
ok(!shouldInterleave(base), 'with the real switch off, nothing happens');
const on = (o: any = {}) => shouldInterleave({ ...base, ...o }, true);
ok(on(), 'happy case: 3rd answer, right, no hint, practising');
ok(on({ base: 'SOCRATIC' }), 'also while Socratic');
for (const b of ['PREREQUISITE_REPAIR', 'REMEDIATION', 'EXPLAIN', 'REVIEW', 'INDEPENDENT_TEST', 'CHALLENGE', 'HINT', 'SIMPLIFY', 'EXAMPLE', 'SELF_EXPLANATION']) ok(!on({ base: b }), `never on ${b}`);
ok(!on({ finished: true }) && !on({ finalQuestion: true }) && !on({ gentler: true }) && !on({ goal: 'test_myself' }), 'not at the end, not when gentler, not in a self-test');
ok(!on({ candidate: null }), 'no candidate, no interleave');
ok(!on({ masteryScore: 49 }) && on({ masteryScore: 50 }) && on({ masteryScore: 89 }) && !on({ masteryScore: 90 }), 'only while mastery is 50 to 89');
ok(!on({ history: good(3, { correct: false, hints: 0 }) }) && !on({ history: good(3, { correct: true, hints: 1 }) }), 'never right after a miss or a hint');
ok(!on({ history: good(2) }) && !on({ history: good(4) }) && !on({ history: good(5) }) && on({ history: good(8) }) && on({ history: good(13) }), 'rhythm: 3rd, 8th, 13th answer');
ok(INTERLEAVE_EVERY === 5, 'rhythm constant is 5');

// ---- not connected, and honest
const orch = R('packages/core/orchestrator/tutor.orchestrator.ts');
ok(!/interleave/i.test(orch), 'the tutor loop does not use it yet');
const doc = R('docs/INTERLEAVING_DESIGN.md');
ok(/NOT connected to the tutor/.test(doc) && /nothing below has been seen working with a real student/i.test(doc), 'design says it is not connected and not seen working');
ok(/Where it would be wired/.test(doc) && /next turn is the dangerous part/i.test(doc), 'design names the wiring points and the main risk');
console.log(`t114: ${n - f}/${n} passed`); if (f) process.exit(1);
