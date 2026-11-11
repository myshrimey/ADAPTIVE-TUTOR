// t125: the question files added in v125 (all subjects) are well formed, sit on real skills and are not repeats (v125).
import { readFileSync, readdirSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const SEED = 'packages/db/seed';
const J = (p: string) => JSON.parse(readFileSync(`${SEED}/${p}`, 'utf8'));
const TAGS = new Set(['CONCEPT_CONFUSION', 'PREREQUISITE_GAP', 'TERMINOLOGY_CONFUSION', 'INCOMPLETE_REASONING', 'PROCEDURAL_ERROR', 'COMPREHENSION_GAP', 'GRAMMAR_RULE', 'VOCABULARY_GAP', 'STRUCTURE_FORMAT', 'WRITTEN_EXPRESSION', 'INCOMPLETE_ANSWER']);
const files = readdirSync(SEED).filter((x) => x.endsWith('-v125-diagnostic.json')).sort();
const MIN: Record<string, number> = { 'computer-applications': 76, english: 42, hindi: 64, 'hindi-b': 52, maths: 30, science: 40, 'social-science': 80 };
ok(files.length === 7, `seven v125 files (${files.length})`);
let total = 0;
for (const file of files) {
  const j = J(file); const sub = j.subject_slug; ok(!!MIN[sub], `${file}: known subject ${sub}`);
  ok(file === `cbse-class10-${sub}-v125-diagnostic.json`, `${file}: name matches its subject`);
  const cur = J(`cbse-class10-${sub}.json`); const skills = new Set<string>(); cur.chapters.forEach((c: any) => c.topics.forEach((t: any) => t.skills.forEach((s: any) => skills.add(s.slug))));
  const old = new Set<string>();
  for (const o of readdirSync(SEED).filter((x) => x.endsWith('diagnostic.json') && !x.endsWith('-v125-diagnostic.json'))) { const oj = J(o); if (oj.subject_slug === sub) oj.questions.forEach((q: any) => old.add(String(q.prompt).trim())); }
  ok(j.questions.length >= (MIN[sub] || 1), `${sub}: at least ${MIN[sub]} questions (${j.questions.length})`); total += j.questions.length;
  const seen = new Set<string>(); const pos = [0, 0, 0, 0]; let bad = 0; const per: Record<string, number> = {};
  for (const q of j.questions) {
    const why: string[] = [];
    if (!skills.has(q.skill_slug)) why.push('skill not in curriculum'); else per[q.skill_slug] = (per[q.skill_slug] || 0) + 1;
    if (q.content_status !== 'needs_review') why.push('must be needs_review');
    if (String(q.prompt).trim().length < 15) why.push('prompt short');
    if (seen.has(q.prompt) || old.has(String(q.prompt).trim())) why.push('duplicate prompt'); seen.add(q.prompt);
    if (![1, 2, 3, 4, 5].includes(q.difficulty)) why.push('difficulty');
    if (!q.misconception_tags?.length || !q.misconception_tags.every((t: string) => TAGS.has(t))) why.push('tag');
    if (String(q.explanation || '').trim().length < 20) why.push('explanation');
    const o = q.options;
    if (q.question_type !== 'mcq' || !Array.isArray(o) || o.length !== 4 || new Set(o.map((x: string) => x.trim().toLowerCase())).size !== 4) why.push('options');
    else { const i = o.indexOf(q.expected_answer?.value); if (i < 0) why.push('answer not in options'); else pos[i]++; if (o.some((x: string) => !x || x.length > 160)) why.push('option length'); }
    if (why.length) { bad++; console.log('  ', file, '|', String(q.prompt).slice(0, 50), '|', why.join(', ')); }
  }
  ok(bad === 0, `${sub}: every question is well formed`);
  ok(Math.min(...pos) > 0 && Math.max(...pos) / j.questions.length <= 0.45, `${sub}: right answers spread over four positions (${pos.join('/')})`);
  if (sub === 'maths') ok(Object.keys(per).length >= 8, 'maths: new questions are spread over at least 8 skills'); else if (sub !== 'social-science') ok([...skills].every((s) => per[s] >= 1), `${sub}: every skill got at least one new question`);
  else ok([...skills].filter((s) => !['explain-social-difference-politics', 'identify-democracy-challenges', 'explain-consumer-rights-protection'].includes(s)).every((s) => per[s] >= 2), 'social-science: every on-syllabus skill got at least 2');
}
ok(total >= 450, `at least 450 new questions in all (${total})`);
console.log(`t125: ${n - f}/${n} passed`); if (f) process.exit(1);
