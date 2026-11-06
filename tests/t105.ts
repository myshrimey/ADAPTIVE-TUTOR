// t105: the Maths and Science questions added in v105 are well formed, computed correctly, and never labelled "verified" (v105).
import { readFileSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8'); const J = (p: string) => JSON.parse(R(`packages/db/seed/${p}`));
const TAGS = new Set(['CONCEPT_CONFUSION', 'PREREQUISITE_GAP', 'TERMINOLOGY_CONFUSION', 'INCOMPLETE_REASONING', 'PROCEDURAL_ERROR', 'FORMULA_MISUSE', 'ARITHMETIC_ERROR', 'SIGN_ERROR', 'ALGEBRAIC_MANIPULATION', 'APPLICATION_GAP']);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const files: [string, string, number][] = [['cbse-class10-maths-v105-diagnostic.json', 'maths', 130], ['cbse-class10-science-v105-diagnostic.json', 'science', 60]];
let total = 0;
for (const [file, subject, min] of files) {
  const j = J(file), cur = J(`cbse-class10-${subject}.json`);
  const skills = new Set<string>(); cur.chapters.forEach((c: any) => c.topics.forEach((t: any) => t.skills.forEach((s: any) => skills.add(s.slug))));
  const old = new Set(J(`cbse-class10-${subject}-diagnostic.json`).questions.map((q: any) => q.prompt.trim()));
  ok(j.subject_slug === subject, `${file}: subject`); ok(j.questions.length >= min, `${file}: at least ${min} questions (${j.questions.length})`); total += j.questions.length;
  const seen = new Set<string>(); let bad = 0; const pos = [0, 0, 0, 0]; let mcqs = 0;
  for (const q of j.questions) {
    const why: string[] = [];
    if (!skills.has(q.skill_slug)) why.push('skill not in curriculum');
    if (q.content_status !== 'needs_review') why.push('must say needs_review (never verified)');
    if (seen.has(q.prompt.trim()) || old.has(q.prompt.trim())) why.push('duplicate'); seen.add(q.prompt.trim());
    if (![1, 2, 3, 4].includes(q.difficulty)) why.push('difficulty');
    if (!q.misconception_tags?.length || !q.misconception_tags.every((t: string) => TAGS.has(t))) why.push('tag');
    if (!q.explanation || q.explanation.length < 15) why.push('explanation');
    if (typeof q.expected_answer?.value !== 'string' || !q.expected_answer.value.trim()) why.push('answer');
    if (q.question_type === 'mcq') { mcqs++; const o = q.options; if (!Array.isArray(o) || o.length < 4 || new Set(o.map((x: string) => x.trim())).size !== o.length) why.push('options'); else { const i = o.indexOf(q.expected_answer.value); if (i < 0) why.push('answer not in options'); else if (o.length === 4) pos[i]++; } }
    else if (!['numeric', 'short_answer'].includes(q.question_type)) why.push('type');
    if (q.question_type === 'numeric' && !/^-?\d+(\.\d+)?$/.test(q.expected_answer.value)) why.push('numeric answer is not a number');
    if (why.length) { bad++; console.log('  ', file, '|', q.prompt.slice(0, 70), '|', why.join(', ')); }
  }
  ok(bad === 0, `${file}: every question is well formed`);
  if (subject === 'science') { ok(mcqs === j.questions.length && Math.max(...pos) / mcqs <= 0.4 && Math.min(...pos) > 0, `science: all multiple choice, answers spread (${pos.join('/')})`); }
  if (subject === 'maths') {
    const d: Record<number, number> = {}; j.questions.forEach((q: any) => (d[q.difficulty] = (d[q.difficulty] || 0) + 1));
    ok((d[4] ?? 0) >= 60 && (d[1] ?? 0) >= 40, `maths: fills the two thin levels (difficulty 1: ${d[1]}, difficulty 4: ${d[4]})`);
    const per: Record<string, number> = {}; j.questions.forEach((q: any) => (per[q.skill_slug] = (per[q.skill_slug] || 0) + 1));
    ok(Object.keys(per).length >= 30, `maths: spread over at least 30 skills (${Object.keys(per).length})`);
    // answers re-computed in a second language from the prompt text (independent of the Python generator)
    let rc = 0, rbad = 0;
    const tell = (q: any, expect: number) => { rc++; if (Number(q.expected_answer.value) !== expect) { rbad++; console.log('  recompute mismatch:', q.prompt.slice(0, 80), q.expected_answer.value, '!=', expect); } };
    for (const q of j.questions) {
      let m: RegExpMatchArray | null;
      if ((m = q.prompt.match(/find the HCF of (\d+) and (\d+)/))) tell(q, gcd(+m[1], +m[2]));
      else if ((m = q.prompt.match(/a = (\d+) and b = (\d+), find r/))) tell(q, +m[1] % +m[2]);
      else if ((m = q.prompt.match(/HCF of two numbers is (\d+) and their LCM is (\d+)\. If one number is (\d+)/))) tell(q, (+m[1] * +m[2]) / +m[3]);
      else if ((m = q.prompt.match(/Find the (\d+)th term of the AP (-?\d+), (-?\d+),/))) tell(q, +m[2] + (+m[1] - 1) * (+m[3] - +m[2]));
      else if ((m = q.prompt.match(/Which term of the AP (\d+), (\d+), .* is (\d+)\?/))) tell(q, (+m[3] - +m[1]) / (+m[2] - +m[1]) + 1);
      else if ((m = q.prompt.match(/discriminant of (.*) = 0/))) { const e = m[1].replace(/\s/g, '').replace(/\^2/g, ''); const mm = e.match(/^(\d*)x(?:([+-]\d*)x)?([+-]\d+)?$/); if (mm) { const a = mm[1] === '' ? 1 : +mm[1]; const b = mm[2] === undefined ? 0 : mm[2] === '+' ? 1 : mm[2] === '-' ? -1 : +mm[2]; const c = mm[3] ? +mm[3] : 0; tell(q, b * b - 4 * a * c); } }
      else if ((m = q.prompt.match(/legs of a right triangle are (\d+) cm and (\d+) cm/))) tell(q, Math.sqrt(Number(m[1]) ** 2 + Number(m[2]) ** 2));
      else if ((m = q.prompt.match(/area of a circle of radius (\d+) cm/))) tell(q, (22 * +m[1] * +m[1]) / 7);
      else if ((m = q.prompt.match(/Find the distance between \((-?\d+), (-?\d+)\) and \((-?\d+), (-?\d+)\)/))) tell(q, Math.hypot(+m[3] - +m[1], +m[4] - +m[2]));
      else if ((m = q.prompt.match(/tangent from P to the circle/)) && (m = q.prompt.match(/is (\d+) cm from the centre of a circle of radius (\d+) cm/))) tell(q, Math.sqrt(Number(m[1]) ** 2 - Number(m[2]) ** 2));
      else if ((m = q.prompt.match(/volume of a cylinder of radius (\d+) cm and height (\d+) cm/))) tell(q, (22 * Number(m[1]) ** 2 * +m[2]) / 7);
      else if ((m = q.prompt.match(/area of a QUADRANT .* radius (\d+) cm/))) tell(q, (22 * Number(m[1]) ** 2) / 28);
      else if ((m = q.prompt.match(/radii (\d+) cm and (\d+) cm\. Find the area of the ring/))) tell(q, (22 * (Number(m[1]) ** 2 - Number(m[2]) ** 2)) / 7);
      else if ((m = q.prompt.match(/Find the remainder when x\^3 ([+-] \d*)x\^2 ([+-] \d*)x ([+-] \d+) is divided by \(x ([+-]) (\d+)\)/))) { const g = (s: string) => { const t = s.replace(/\s/g, ''); return t === '+' ? 1 : t === '-' ? -1 : +t; }; const k = m[4] === '-' ? +m[5] : -+m[5]; tell(q, k ** 3 + g(m[1]) * k * k + g(m[2]) * k + g(m[3])); }
    }
    ok(rc >= 40, `maths: ${rc} answers were re-computed independently in TypeScript`);
    ok(rbad === 0, 'maths: every re-computed answer matches');
  }
}
// the loader keeps unreviewed questions out of "verified"
const loader = R('packages/db/seed-diagnostic.js');
ok(/\['verified', 'needs_review', 'rejected'\]\.includes\(q\.content_status\)/.test(loader), 'loader honours a question\'s own content_status');
ok(/const contentStatus = subject\.status && subject\.status !== 'ready' \? 'needs_review' : 'verified'/.test(loader), 'loader default for ready subjects is unchanged');
const doc = R('docs/CONTENT_V105.md');
ok(/needs_review/.test(doc) && /not copied/i.test(doc) && /teacher/i.test(doc), 'doc: needs_review, written not copied, teacher review');
ok(!/teacher[- ]verified|CBSE[- ]approved|official question/i.test(doc.replace(/not (a |an )?(teacher[- ]verified|CBSE[- ]approved|official question)/gi, '')), 'doc does not claim teacher verification or CBSE approval');
console.log(`t105: ${n - f}/${n} passed (${total} new questions)`); if (f) process.exit(1);
