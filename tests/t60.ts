import { inputKindOf, filterTyped, validateAnswer, gradeAnswer, buildPlanSlots, DIAGNOSTIC_LENGTH, NUMBER_PAD, MATH_KEYPAD } from '../packages/core/index';
let ok = 0, bad = 0; const t = (n: string, c: boolean) => { c ? ok++ : (bad++, console.log('FAIL', n)); };
// kinds
t('mcq choice', inputKindOf('mcq', 'A') === 'choice');
t('number', inputKindOf('short_answer', '12') === 'number' && inputKindOf('numeric', '-3.5') === 'number' && inputKindOf('short_answer', '2/3') === 'number' && inputKindOf('short_answer', '45%') === 'number');
t('text', inputKindOf('short_answer', 'Photosynthesis') === 'text' && inputKindOf('short_answer', 'carbon dioxide') === 'text');
t('expression', inputKindOf('short_answer', 'x^2+3x') === 'expression' && inputKindOf('short_answer', 'H2O') === 'expression' && inputKindOf('short_answer', { value: 'x=2, 3' }) === 'expression');
t('no expected', inputKindOf('numeric') === 'number' && inputKindOf('short_answer') === 'expression');
// typing filter
let r = filterTyped('number', 'a12b'); t('number blocks letters', r.text === '12' && !!r.warning);
r = filterTyped('number', '-3.5'); t('number keeps', r.text === '-3.5' && !r.warning);
r = filterTyped('text', 'abc123'); t('text blocks digits', r.text === 'abc' && !!r.warning);
r = filterTyped('expression', 'x² + √3 ≤ π'); t('expression allows symbols', !r.warning && r.text.includes('√'));
r = filterTyped('expression', 'a<script>😀'); t('emoji removed', !r.text.includes('😀'));
r = filterTyped('number', 'x'.repeat(5)); t('hi warning', filterTyped('number', 'x', 'hi').warning!.includes('संख्या'));
r = filterTyped('expression', 'a'.repeat(300)); t('length cap', r.text.length === 200 && !!r.warning);
t('multiline newline', filterTyped('expression', 'a\nb', 'en', true).text === 'a\nb' && filterTyped('expression', 'a\nb').text === 'a b');
// validation
t('empty', validateAnswer('number', '  ') !== null);
t('valid numbers', ['12', '-3.5', '2/3', '1,200', '45%', '−7', '(2+3)*4'].every((x) => validateAnswer('number', x) === null));
t('invalid numbers', ['abc', '1.2.3x', '--', '/'].every((x) => validateAnswer('number', x) !== null));
t('brackets', validateAnswer('expression', '(x+1') !== null && validateAnswer('expression', '(x+1)') === null);
t('choice empty', validateAnswer('choice', '') !== null);
// grading with keypad symbols
t('x² = x^2', gradeAnswer('x^2', 'x²') && gradeAnswer('x²', 'x^2'));
t('minus sign', gradeAnswer('-5', '−5'));
t('pi', gradeAnswer('2pi', '2π') && gradeAnswer('2π', '2pi'));
t('sqrt', gradeAnswer('sqrt(3)', '√3') && gradeAnswer('√3', 'sqrt3') && gradeAnswer('sqrt(3)', '√(3)'));
t('subscripts', gradeAnswer('H2O', 'H₂O'));
t('divide', gradeAnswer('3/4', '3÷4'));
t('wrong stays wrong', !gradeAnswer('x^2', 'x^3') && !gradeAnswer('12', '13') && !gradeAnswer('sqrt(3)', '√5'));
t('earlier behaviours', gradeAnswer('x=2,3', 'x=3, 2') && gradeAnswer('2x+3', '3+2x') && gradeAnswer('Delhi', ' delhi '));
// keypads
t('keypad', NUMBER_PAD.length >= 12 && MATH_KEYPAD.length === 3 && MATH_KEYPAD.every((k) => k.keys.length > 8));
// plan slots
const ch = (n: number, per: number) => Array.from({ length: n }, (_, i) => Array.from({ length: per }, (_, j) => `c${i}s${j}`));
let s = buildPlanSlots(ch(5, 3), 20); t('20 slots from 5 chapters', s.length === 20 && s.slice(0, 5).every((x) => !x.filler) && s.slice(5).every((x) => x.filler));
t('anchors first skill each chapter', s.slice(0, 5).map((x) => x.skillId).join() === 'c0s0,c1s0,c2s0,c3s0,c4s0');
t('fillers prefer other skills', s[5].skillId === 'c0s1' && s[6].skillId === 'c1s1');
s = buildPlanSlots(ch(30, 2), 20); t('spread when >20 chapters', s.length === 20 && new Set(s.map((x) => x.skillId)).size === 20 && s.every((x) => !x.filler));
s = buildPlanSlots(ch(2, 1), 20); t('repeat skill if none left', s.length === 20 && s.filter((x) => x.filler).length === 18);
t('no chapters', buildPlanSlots([], 20).length === 0 && DIAGNOSTIC_LENGTH === 20);
console.log(`t60a: ${ok} ok, ${bad} failed`);
import { hasDroppableFiller, dropLastFiller } from '../packages/core/index';
{
  // 20-question plan: q1..q20, last 15 are fillers; student answered q1 wrong and a prerequisite is inserted after it
  const plan = Array.from({ length: 20 }, (_, i) => 'q' + (i + 1));
  const st: any = { plan: [...plan], answers: [{ questionId: 'q1', skillId: 's', correct: false }], insertedForSkill: {}, review: [], target: 20, optional: plan.slice(5) };
  t('has filler', hasDroppableFiller(st));
  st.plan.splice(1, 0, 'pre1'); dropLastFiller(st);
  t('length stays 20 after a miss', st.plan.length === 20 && !st.plan.includes('q20') && st.plan[1] === 'pre1');
  // many misses: each insertion removes one filler, never an anchor or an answered question
  for (let i = 0; i < 40; i++) { if (!hasDroppableFiller(st)) break; st.plan.splice(2, 0, 'p' + i); dropLastFiller(st); }
  t('anchors survive', ['q1', 'q2', 'q3', 'q4', 'q5'].every((q) => st.plan.includes(q)));
  t('no filler left -> stop inserting', !hasDroppableFiller(st) && st.plan.length === 20);
  const st2: any = { plan: ['a', 'b'], answers: [{ questionId: 'a' }, { questionId: 'b' }], optional: ['a', 'b'] };
  t('answered fillers are not dropped', !hasDroppableFiller(st2));
}
console.log(`t60a+: ${ok} ok, ${bad} failed`);
