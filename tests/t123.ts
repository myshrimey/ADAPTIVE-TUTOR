// t123: the French subject (curriculum, question bank, accented answers, blueprint, home list) is consistent (v123).
import { readFileSync, readdirSync } from 'fs';
import { gradeAnswer, inputKindOf, filterTyped, FRENCH_KEYS, blueprintFor, HINDI_MEDIUM_EXCLUDED_SUBJECTS, causeFamily } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const SEED = 'packages/db/seed';
const J = (p: string) => JSON.parse(readFileSync(`${SEED}/${p}`, 'utf8'));
const R = (p: string) => readFileSync(p, 'utf8');

// --- curriculum
const cur = J('cbse-class10-french.json');
ok(cur.subject.slug === 'french' && cur.subject.status === 'pilot', 'french is a pilot subject');
const chapters: string[] = cur.chapters.map((c: any) => c.slug);
const skills: string[] = []; cur.chapters.forEach((c: any) => c.topics.forEach((t: any) => t.skills.forEach((s: any) => skills.push(s.slug))));
ok(chapters.length === 19 && skills.length === 71, `19 chapters and 71 skills (${chapters.length}/${skills.length})`);
ok(new Set(skills).size === skills.length, 'skill slugs are unique inside French');
const others = new Set<string>();
for (const fl of readdirSync(SEED).filter((x) => /^cbse-class10-.*\.json$/.test(x) && !x.endsWith('-diagnostic.json') && x !== 'cbse-class10-french.json')) {
  const o = J(fl); (o.chapters || []).forEach((c: any) => c.topics.forEach((t: any) => t.skills.forEach((s: any) => others.add(s.slug))));
}
ok(skills.every((s) => !others.has(s)), 'no French skill slug is used by another subject (the loader looks skills up by slug alone)');
const all = new Set(skills);
let badReq = 0; cur.chapters.forEach((c: any) => c.topics.forEach((t: any) => t.skills.forEach((s: any) => (s.requires || []).forEach((r: string) => { if (!all.has(r)) badReq++; }))));
ok(badReq === 0, 'every prerequisite is a French skill');

// --- blueprint
const bp: any = blueprintFor('french');
ok(bp && /french/.test(bp.id || bp.slug || ''), 'a French blueprint exists');
const w = bp.chapterWeights || {};
ok(Object.keys(w).length > 0 && Object.keys(w).every((k) => chapters.includes(k)), 'blueprint chapter weights only name real French chapters');
ok(chapters.every((c) => w[c] > 0), 'every French chapter has a weight');

// --- question files
const files = ['cbse-class10-french-diagnostic.json', 'cbse-class10-french-v123-diagnostic.json'];
const TAGS = new Set(['COMPREHENSION_GAP', 'GRAMMAR_RULE', 'VOCABULARY_GAP', 'STRUCTURE_FORMAT', 'WRITTEN_EXPRESSION', 'INCOMPLETE_ANSWER']);
const per: Record<string, number> = {}; const seen = new Set<string>(); const pos = [0, 0, 0, 0]; let total = 0, bad = 0;
for (const file of files) {
  const j = J(file);
  ok(j.subject_slug === 'french', `${file}: declares french`);
  for (const q of j.questions) {
    total++; const why: string[] = [];
    if (!all.has(q.skill_slug)) why.push('unknown skill'); else per[q.skill_slug] = (per[q.skill_slug] || 0) + 1;
    const key = q.skill_slug + '|' + q.prompt; if (seen.has(key)) why.push('duplicate'); seen.add(key);
    if (q.content_status !== 'needs_review') why.push('must be needs_review');
    if (![1, 2, 3, 4, 5].includes(q.difficulty)) why.push('difficulty');
    if (!q.misconception_tags?.length || !q.misconception_tags.every((t: string) => TAGS.has(t))) why.push('tag');
    if (typeof q.explanation !== 'string' || q.explanation.length < 15) why.push('explanation');
    if (q.question_type === 'mcq') {
      const o = q.options;
      if (!Array.isArray(o) || o.length !== 4 || new Set(o.map((x: string) => x.trim().toLowerCase())).size !== 4) why.push('options');
      else { const i = o.indexOf(q.expected_answer.value); if (i < 0) why.push('answer not in options'); else pos[i]++; }
      if (!gradeAnswer(q.expected_answer, q.expected_answer.value)) why.push('answer does not grade as itself');
      const wrong = (o || []).filter((x: string) => x !== q.expected_answer.value);
      if (wrong.some((x: string) => gradeAnswer(q.expected_answer, x))) why.push('a wrong option also grades as correct');
    } else {
      const v = q.expected_answer.value as string;
      if (/[,=+]/.test(v)) why.push('short answer has , = or +');
      if (!gradeAnswer(q.expected_answer, v)) why.push('short answer does not grade');
    }
    if (why.length) { bad++; console.log('  ', file, '|', String(q.prompt).slice(0, 60), '|', why.join(', ')); }
  }
}
ok(bad === 0, 'every French question is well formed');
ok(total >= 300, `at least 300 questions (${total})`);
ok(skills.every((s) => per[s] >= 4), 'every French skill has at least 4 questions');
ok(Math.min(...pos) > 0 && Math.max(...pos) / total <= 0.4, `right answers are spread over all four positions (${pos.join('/')})`);
ok(J(files[0]).questions.length === 71 && new Set(J(files[0]).questions.map((q: any) => q.skill_slug)).size === 71, 'the diagnostic file has one question per skill');

// --- accented answers
ok(inputKindOf('short_answer', 'écoutent') === 'accented', 'a word answer with an accent uses the accented input');
ok(inputKindOf('short_answer', 'parlent') === 'text', 'a plain word answer stays text');
ok(filterTyped('accented', 'été à ça').text === 'été à ça', 'accented letters can be typed');
ok(FRENCH_KEYS.some((k) => k.insert === 'é') && FRENCH_KEYS.some((k) => k.insert === 'ç') && FRENCH_KEYS.length >= 15, 'the French keypad has the accented letters');
ok(gradeAnswer({ value: "j'ai mangé" }, 'J’ai mangé'), 'a curly apostrophe is accepted');
ok(gradeAnswer({ value: 'été' }, 'été'), 'a decomposed accent is accepted');
ok(!gradeAnswer({ value: 'été' }, 'ete'), 'a missing accent is still wrong');
ok(!gradeAnswer({ value: 'cet' }, 'cette'), 'a different word is wrong');

// --- wiring
ok(HINDI_MEDIUM_EXCLUDED_SUBJECTS.includes('french'), 'French is left out of Hindi-medium translation');
ok(causeFamily('French') === 'language', 'French uses the language misconception family');
ok(/slug:\s*'french'/.test(R('apps/web/components/HomeClient.tsx')), 'French is on the home subject list');
ok(/french/.test(R('apps/web/components/SubjectIcon.tsx')), 'French has an icon');

console.log(`t123: ${n - f}/${n} passed`); if (f) process.exit(1);
