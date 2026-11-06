// t104: the question files added in v104 are well formed, sit on real skills, and respect the syllabus choices made (v104).
import { readFileSync, readdirSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const SEED = 'packages/db/seed';
const J = (p: string) => JSON.parse(readFileSync(`${SEED}/${p}`, 'utf8'));
const TAGS = new Set(['CONCEPT_CONFUSION', 'PREREQUISITE_GAP', 'TERMINOLOGY_CONFUSION', 'INCOMPLETE_REASONING', 'PROCEDURAL_ERROR', 'COMPREHENSION_GAP', 'GRAMMAR_RULE', 'VOCABULARY_GAP', 'STRUCTURE_FORMAT']);
const files = readdirSync(SEED).filter((x) => x.endsWith('-v104-diagnostic.json')).sort();
ok(files.length === 3, `three v104 question files (${files.join(', ')})`);
const EXPECT: Record<string, { subject: string; min: number }> = {
  'cbse-class10-computer-applications-v104-diagnostic.json': { subject: 'computer-applications', min: 70 },
  'cbse-class10-english-v104-diagnostic.json': { subject: 'english', min: 60 },
  'cbse-class10-social-science-v104-diagnostic.json': { subject: 'social-science', min: 70 },
};
const SKIPPED = ['explain-social-difference-politics', 'identify-democracy-challenges', 'explain-consumer-rights-protection'];
const OFFICIAL_CA = ['syl-networking', 'syl-html', 'syl-cyber-ethics'];
let total = 0;
for (const file of files) {
  const j = J(file), e = EXPECT[file]; if (!e) { ok(false, `unexpected file ${file}`); continue; }
  const cur = J(`cbse-class10-${e.subject}.json`);
  const skills = new Set<string>(); cur.chapters.forEach((c: any) => c.topics.forEach((t: any) => t.skills.forEach((s: any) => skills.add(s.slug))));
  const old = J(`cbse-class10-${e.subject}-diagnostic.json`).questions.map((q: any) => q.prompt);
  ok(j.subject_slug === e.subject, `${file}: declares subject ${e.subject}`);
  ok(j.questions.length >= e.min, `${file}: has at least ${e.min} questions (${j.questions.length})`);
  total += j.questions.length;
  const seen = new Set<string>(); const pos = [0, 0, 0, 0];
  let bad = 0;
  for (const q of j.questions) {
    const why: string[] = [];
    if (!skills.has(q.skill_slug)) why.push('skill not in curriculum');
    if (SKIPPED.includes(q.skill_slug)) why.push('skill is on the skipped (deleted/project-only) list');
    if (typeof q.prompt !== 'string' || q.prompt.trim().length < 15) why.push('prompt too short');
    if (seen.has(q.prompt) || old.includes(q.prompt)) why.push('duplicate prompt'); seen.add(q.prompt);
    if (![1, 2, 3, 4, 5].includes(q.difficulty)) why.push('difficulty');
    if (!Array.isArray(q.misconception_tags) || q.misconception_tags.length < 1 || !q.misconception_tags.every((t: string) => TAGS.has(t))) why.push('tag');
    if (typeof q.explanation !== 'string' || q.explanation.trim().length < 20) why.push('explanation missing');
    if (q.question_type === 'mcq') {
      const o = q.options;
      if (!Array.isArray(o) || o.length !== 4) why.push('needs exactly 4 options');
      else {
        if (new Set(o.map((x: string) => x.trim().toLowerCase())).size !== 4) why.push('options repeat');
        const i = o.indexOf(q.expected_answer?.value);
        if (i < 0) why.push('answer is not one of the options'); else pos[i]++;
        if (o.some((x: string) => !x || x.length > 160)) why.push('option empty or too long');
      }
    } else why.push('only mcq is used in v104');
    if (why.length) { bad++; console.log('  ', file, '|', q.prompt.slice(0, 60), '|', why.join(', ')); }
  }
  ok(bad === 0, `${file}: every question is well formed`);
  ok(Math.max(...pos) / j.questions.length <= 0.4 && Math.min(...pos) > 0, `${file}: the right answer is spread over all four positions (${pos.join('/')})`);
  const per: Record<string, number> = {}; j.questions.forEach((q: any) => (per[q.skill_slug] = (per[q.skill_slug] || 0) + 1));
  ok(Object.values(per).every((c) => c >= 2), `${file}: every skill used has at least 2 new questions`);
  if (e.subject === 'english') ok(skills.size === Object.keys(per).length && [...skills].every((s) => per[s] === 3), 'english: all 21 skills got exactly 3 questions');
  if (e.subject === 'social-science') ok([...skills].filter((s) => !SKIPPED.includes(s)).every((s) => per[s] === 2), 'social science: every on-syllabus skill got exactly 2 questions');
  if (e.subject === 'computer-applications') {
    const slugs = cur.chapters.map((c: any) => c.slug);
    ok(OFFICIAL_CA.every((s) => slugs.includes(s)), 'computer applications: the three official units (Networking, HTML, Cyber Ethics) are in the curriculum');
    const newSkills = new Set<string>(); cur.chapters.filter((c: any) => OFFICIAL_CA.includes(c.slug)).forEach((c: any) => c.topics.forEach((t: any) => t.skills.forEach((s: any) => newSkills.add(s.slug))));
    ok(newSkills.size === 17 && [...newSkills].every((s) => per[s] >= 4), 'computer applications: all 17 syllabus skills have at least 4 questions');
    const html = [...newSkills].filter((s) => s.startsWith('ca-html') || s.startsWith('ca-css')); const htmlQ = html.reduce((a, s) => a + (per[s] || 0), 0);
    ok(htmlQ / j.questions.length >= 0.4, 'computer applications: HTML (25 of 50 marks) has the biggest share of questions');
  }
}
// the loader picks these files up and keeps them in review
const loader = readFileSync('packages/db/seed-diagnostic.js', 'utf8');
ok(/endsWith\('-diagnostic\.json'\)/.test(loader) && /needs_review/.test(loader), 'the loader reads every *-diagnostic.json file and keeps non-ready subjects in needs_review');
// honesty in the docs
const doc = readFileSync('docs/CONTENT_V104.md', 'utf8');
ok(/needs_review/.test(doc) && /not copied/i.test(doc) && /teacher/i.test(doc), 'doc says: needs_review, written not copied, teacher review needed');
ok(!/teacher[- ]verified|CBSE[- ]approved|official question/i.test(doc.replace(/not (a |an )?(teacher[- ]verified|CBSE[- ]approved|official question)/gi, '')), 'doc does not claim teacher verification or CBSE approval');
console.log(`t104: ${n - f}/${n} passed (${total} new questions)`); if (f) process.exit(1);
