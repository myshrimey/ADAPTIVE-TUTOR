import * as fs from 'fs';
import { fakeDb } from './fakedb2';
import { startBaseline, answerBaseline, loadItem, loadStoredBaseline, asBaseline, studentReport, parentReport, tutorReport, practiceStep, recordCompetencyEvidence, saveEngineSettings, loadEngineSettings, clearGraphCache, BANNED_PHRASES } from '../packages/core/baseline';
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rngOf = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const seed = JSON.parse(fs.readFileSync('packages/db/seed/cbse-class10-maths.json', 'utf8'));
function world() {
  const t: Record<string, any[]> = { subjects: [{ id: 'sub1', slug: 'maths', name: 'Mathematics' }], chapters: [], topics: [], skills: [], prerequisites: [], questions: [], diagnostic_questions: [], students: [{ id: 'stu1' }, { id: 'stu2' }] };
  const slugToId = new Map<string, string>();
  for (const ch of seed.chapters) { t.chapters.push({ id: 'ch-' + ch.slug, subject_id: 'sub1', name: ch.name });
    for (const tp of ch.topics) { t.topics.push({ id: 'tp-' + tp.slug, chapter_id: 'ch-' + ch.slug, name: tp.name });
      for (const s of tp.skills) { slugToId.set(s.slug, 'sk-' + s.slug); t.skills.push({ id: 'sk-' + s.slug, topic_id: 'tp-' + tp.slug, name: s.name, slug: s.slug, retired: false });
        [2, 3, 4].forEach((d, i) => t.questions.push({ id: `q-${s.slug}-${i}`, skill_id: 'sk-' + s.slug, difficulty: d, question_type: 'numeric', prompt: `Q${i} for ${s.name}`, options: null, expected_answer: { value: String(10 + i) }, explanation: 'because', content_status: 'needs_review' })); } } }
  for (const ch of seed.chapters) for (const tp of ch.topics) for (const s of tp.skills) for (const r of s.requires ?? []) if (slugToId.has(r)) t.prerequisites.push({ skill_id: 'sk-' + s.slug, requires_skill_id: slugToId.get(r) });
  return fakeDb(t, { rels: { learning_path_nodes: { competencies: { table: 'competencies', fk: 'competency_id' }, learning_paths: { table: 'learning_paths', fk: 'path_id' } } }, unique: { competencies: [['code']], student_competency_mastery: [['student_id', 'competency_id']] }, defaults: { baseline_items: { quality_status: 'DRAFT' } } });
}
async function wrongFor(item: any, comp: any) { if (item.options?.length) return item.options.find((o: string) => o !== String(item.expected.value)) ?? 'x'; return String(Number(item.expected.value) + 3); }
async function run(db: any, studentId: string, level: Record<string, number>, seedN: number, mini = false, maxSteps = 80) {
  const r = rngOf(seedN);
  let st = await startBaseline(db, studentId, 'sub1', { mini });
  const sid = st.sessionId; let q = st.question; let fin = st.finished; let n = 0; const items: string[] = [];
  while (q && n < maxSteps) {
    n++;
    const comp = db._tables.competencies.find((c: any) => c.id === q!.competencyId);
    const item: any = await loadItem(db, q.itemTable, q.itemId);
    items.push(q.itemId);
    const lvl = level[comp.domain] ?? 10;
    const p = comp.class_level <= lvl ? 0.95 : comp.class_level === lvl + 1 ? 0.3 : 0.06;
    const correct = r() < p;
    const ans = correct ? String(item.expected.value) : await wrongFor(item, comp);
    const res = await answerBaseline(db, studentId, sid, ans);
    q = res.question; fin = res.finished;
  }
  return { sid, fin, items, n, db };
}

(async () => {
  const db = world();
  // settings
  const d0 = await loadEngineSettings(db);
  ok(d0.minQuestions === 15 && d0.maxQuestions === 50 && d0.enabled, 'default settings');
  const s1 = await saveEngineSettings(db, { minQuestions: 3, maxQuestions: 2, confidenceThreshold: 5, enabled: true });
  ok(s1.minQuestions >= 5 && s1.maxQuestions >= s1.minQuestions && s1.confidenceThreshold === 0.8, 'settings are cleaned: ' + JSON.stringify(s1));
  await saveEngineSettings(db, { ...d0 });

  // start + no answer key
  const st = await startBaseline(db, 'stu1', 'sub1');
  ok(!!st.question && !('expected' in (st.question as any)) && !JSON.stringify(st.question).includes('"value"'), 'question carries no answer key');
  ok(st.question!.why.length > 10, 'student sees why: ' + st.question!.why);
  // resume returns the same open question
  const again = await startBaseline(db, 'stu1', 'sub1');
  ok(again.sessionId === st.sessionId && again.question!.itemId === st.question!.itemId, 'resume gives the same question');
  // wrong format is refused without losing the question
  const bad = await answerBaseline(db, 'stu1', st.sessionId, 'abc');
  ok(!!bad.feedback?.formatProblem && bad.question!.itemId === st.question!.itemId, 'wrong format refused, same question kept');
  // someone else cannot answer
  let blocked = false; try { await answerBaseline(db, 'stu2', st.sessionId, '10'); } catch { blocked = true; }
  ok(blocked, 'another student cannot answer');
  const cur = db._tables.baseline_sessions[0]; cur.status = 'abandoned'; // drop it, start fresh for the real run
  clearGraphCache();

  // Student A: strong
  const A = await run(db, 'stu1', { arithmetic: 10, algebra: 10, geometry: 10, mensuration: 10, data: 10 }, 11);
  ok(!!A.fin, 'A finished');
  ok(A.n < 20 && A.n >= 15, 'A finished between 15 and 20: ' + A.n);
  ok(new Set(A.items).size === A.items.length, 'no question repeated in the session');
  const dec = db._tables.adaptive_decisions.filter((d: any) => d.attempt_id === A.sid);
  ok(dec.length >= A.n && dec.every((d: any) => d.reason.length > 20), 'every decision stored with a reason: ' + dec.length);
  ok(db._tables.student_competency_evidence.filter((e: any) => e.attempt_id === A.sid).length === A.n, 'one evidence row per answer');
  const bA = await loadStoredBaseline(db, 'stu1', 'sub1');
  ok(!!bA && bA.version === 1 && bA.path.length > 0, 'baseline v1 saved with a path');
  ok(bA!.path.filter((p) => p.stage === 'prerequisite_repair').length === 0, 'A: no prerequisite repair');
  ok(db._tables.learning_paths.filter((l: any) => l.status === 'active').length === 1, 'one active path');
  ok(db._tables.student_competency_mastery.length > 0, 'mastery rows written');
  const all = [...studentReport(asBaseline(bA!), 'Mathematics'), ...parentReport(asBaseline(bA!), 'Mathematics'), ...tutorReport(asBaseline(bA!), 'Mathematics')].join(' ').toLowerCase();
  ok(BANNED_PHRASES.every((p) => !all.includes(p)), 'reports use no banned wording');

  // Student B (stu2): class 8 gaps
  const D = await run(db, 'stu2', { arithmetic: 8, algebra: 8, geometry: 8, mensuration: 8, data: 9 }, 44);
  const bD = await loadStoredBaseline(db, 'stu2', 'sub1');
  ok(!!D.fin && !!bD, 'D finished and saved');
  ok(bD!.path.some((p) => p.stage === 'prerequisite_repair' && p.classLevel < 10), 'D routed to earlier-class prerequisite skills');
  ok(bD!.gaps.some((g: any) => g.severity !== 'LOW' && g.severity !== 'NO_MATERIAL_GAP'), 'D has a material gap');
  ok(bD!.overall.text.includes('prerequisite skills') && !bD!.overall.text.toLowerCase().includes('class 8 student'), 'D overall wording: ' + bD!.overall.text);
  const baseItems = db._tables.baseline_items;
  ok(baseItems.length > 0 && baseItems.every((b: any) => b.origin === 'code_generated'), 'code-written foundation items saved with origin: ' + baseItems.length);

  // practice on a repair step moves it toward done
  const node = db._tables.learning_path_nodes.find((n: any) => n.path_id === db._tables.learning_paths.find((l: any) => l.student_id === 'stu2' && l.status === 'active').id && ['prerequisite_repair'].includes(n.stage));
  let ps: any = await practiceStep(db, 'stu2', node.id);
  ok(!!ps.item, 'practice serves an item');
  let guard = 0;
  while (ps.item && !ps.done && guard++ < 12) {
    const it: any = await loadItem(db, ps.item.itemTable, ps.item.itemId);
    ps = await practiceStep(db, 'stu2', node.id, { itemTable: ps.item.itemTable, itemId: ps.item.itemId, answer: String(it.expected.value) });
  }
  ok(ps.done === true, 'step marked done after enough correct practice answers');
  ok(db._tables.learning_path_nodes.find((n: any) => n.id === node.id).status === 'done', 'node status saved as done');
  let wrongOwner = false; try { await practiceStep(db, 'stu1', node.id); } catch { wrongOwner = true; }
  ok(wrongOwner, 'practice of another student refused');

  // continuous: external evidence updates mastery
  const compSkill = db._tables.competencies.find((c: any) => c.skill_id);
  const before = { mastery: db._tables.student_competency_mastery.find((m: any) => m.student_id === 'stu1' && m.competency_id === compSkill.id)?.mastery ?? 0.5 };
  await recordCompetencyEvidence(db, 'stu1', { skillId: compSkill.skill_id, correct: false, source: 'quiz' });
  await recordCompetencyEvidence(db, 'stu1', { skillId: compSkill.skill_id, correct: false, source: 'quiz' });
  const after = db._tables.student_competency_mastery.find((m: any) => m.student_id === 'stu1' && m.competency_id === compSkill.id);
  ok(!!after && after.mastery < before.mastery && db._tables.student_competency_evidence.some((e: any) => e.source === 'quiz'), 'quiz evidence updates mastery');

  // mini re-assessment for D: fewer questions, version 2, changes recorded
  const M = await run(db, 'stu2', { arithmetic: 10, algebra: 10, geometry: 10, mensuration: 10, data: 10 }, 77, true);
  ok(!!M.fin && M.n <= 18 && M.n < D.n, 'mini check is shorter: ' + M.n + ' vs ' + D.n);
  const b2 = await loadStoredBaseline(db, 'stu2', 'sub1');
  ok(b2!.version === 2, 'baseline version 2');
  ok(db._tables.learning_paths.filter((l: any) => l.student_id === 'stu2' && l.status === 'active').length === 1, 'old path superseded');
  console.log('A', A.n, 'D', D.n, 'mini', M.n, 'changes', b2!.changes.length, b2!.changes.slice(0, 2).map((c: any) => c.text));
  // mini for a student who never did the full check
  let noFull = false; try { await startBaseline(db, 'stu1x', 'sub1', { mini: true }); } catch { noFull = true; }
  ok(noFull, 'mini needs a full check first');
  console.log(`\nt62b: ${pass} passed, ${fail} failed`);
})();
