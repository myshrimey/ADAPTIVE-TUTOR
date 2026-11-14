// t127: the 500+ Social Science questions added in v127 are well formed and cover every skill (v127).
import { readFileSync, readdirSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const SEED = 'packages/db/seed'; const J = (p: string) => JSON.parse(readFileSync(`${SEED}/${p}`, 'utf8'));
const TAGS = new Set(['CONCEPT_CONFUSION', 'PREREQUISITE_GAP', 'TERMINOLOGY_CONFUSION', 'INCOMPLETE_REASONING', 'PROCEDURAL_ERROR']);
const files = readdirSync(SEED).filter((x) => /^cbse-class10-social-science-v127[a-d]-diagnostic\.json$/.test(x)).sort();
ok(files.length === 4, `four v127 files (${files.length})`);
const cur = J('cbse-class10-social-science.json'); const skills = new Set<string>(); cur.chapters.forEach((c: any) => c.topics.forEach((t: any) => t.skills.forEach((s: any) => skills.add(s.slug))));
const old = new Set<string>();
for (const o of readdirSync(SEED).filter((x) => x.endsWith('diagnostic.json') && !/-v127[a-d]-diagnostic/.test(x))) { const oj = J(o); if (oj.subject_slug === 'social-science') oj.questions.forEach((q: any) => old.add(String(q.prompt).trim())); }
const seen = new Set<string>(); const per: Record<string, number> = {}; const pos = [0, 0, 0, 0]; const dif: Record<number, number> = {}; let total = 0, bad = 0;
for (const file of files) {
  const j = J(file); ok(j.subject_slug === 'social-science', `${file}: subject`);
  for (const q of j.questions) {
    total++; const why: string[] = [];
    if (!skills.has(q.skill_slug)) why.push('skill'); else per[q.skill_slug] = (per[q.skill_slug] || 0) + 1;
    if (q.content_status !== 'needs_review') why.push('status');
    const p = String(q.prompt).trim(); if (p.length < 15) why.push('short'); if (seen.has(p) || old.has(p)) why.push('duplicate'); seen.add(p);
    if (![1, 2, 3, 4, 5].includes(q.difficulty)) why.push('difficulty'); else dif[q.difficulty] = (dif[q.difficulty] || 0) + 1;
    if (!q.misconception_tags?.length || !q.misconception_tags.every((t: string) => TAGS.has(t))) why.push('tag');
    if (String(q.explanation || '').trim().length < 20) why.push('explanation');
    const o = q.options;
    if (q.question_type !== 'mcq' || !Array.isArray(o) || o.length !== 4 || new Set(o.map((x: string) => x.trim().toLowerCase())).size !== 4) why.push('options');
    else { const i = o.indexOf(q.expected_answer?.value); if (i < 0) why.push('answer not in options'); else pos[i]++; if (o.some((x: string) => !x || x.length > 160)) why.push('option length'); }
    if (why.length) { bad++; console.log('  ', file, '|', p.slice(0, 50), '|', why.join(', ')); }
  }
}
ok(bad === 0, 'every question is well formed');
ok(total >= 500, `at least 500 new questions (${total})`);
ok((()=>{ const on=[...skills].filter((s)=>!['explain-social-difference-politics','identify-democracy-challenges','explain-consumer-rights-protection'].includes(s)); return on.length===40 && on.every((s)=>per[s]>=13); })(), 'all 40 on-syllabus skills have at least 13 new questions');
ok(Math.min(...pos) > 0 && Math.max(...pos) / total <= 0.4, `right answers spread over four positions (${pos.join('/')})`);
ok((dif[1] || 0) + (dif[2] || 0) >= total * 0.1 && (dif[4] || 0) + (dif[5] || 0) >= total * 0.05, `a spread of difficulties (${[1,2,3,4,5].map((d) => dif[d] || 0).join('/')})`);
console.log(`t127: ${n - f}/${n} passed`); if (f) process.exit(1);
