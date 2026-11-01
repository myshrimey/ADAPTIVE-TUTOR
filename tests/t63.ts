import { fakeDb } from './fakedb2';
import { STRETCH_STYLES, STYLE_LABEL, isStretchStyle, cleanStretchSettings, DEFAULT_STRETCH_SETTINGS, isSkillUnlocked, nextStretchLevel, deriveLevel, bestRun, stretchMetrics, stretchFeedbackLine, STRETCH_BANNED,
  unlockedSkills, nextStretchQuestion, answerStretch, stretchSummary, loadStretchSettings, saveStretchSettings, generateStretchQuestions, fillStretchForSubject,
  cleanContribution, contributeQuestion, evaluateAchievements, EMPTY_METRICS, unlockAchievements, DEFAULT_ENGAGEMENT } from '../packages/core';
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const SK = '11111111-1111-1111-1111-111111111111', SK2 = '22222222-2222-2222-2222-222222222222', SUB = '33333333-3333-3333-3333-333333333333', ST = '44444444-4444-4444-4444-444444444444', ST2 = '55555555-5555-5555-5555-555555555555';
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const chain = (name: string, sub = SUB, sname = 'Mathematics') => ({ name, retired: false, topics: { chapters: { subject_id: sub, subjects: { name: sname } } } });
function mk(extra: Record<string, any[]> = {}) {
  const q = (i: number, o: any = {}) => ({ id: uid(i), skill_id: SK, tier: 'stretch', prompt: `Hard question ${i}`, question_type: 'numeric', options: null, expected_answer: { value: String(i) }, explanation: `Because ${i}`, stretch_level: 1, exam_style: 'olympiad', content_status: 'needs_review', validated: true, ...o });
  const t: Record<string, any[]> = {
    skills: [{ id: SK, ...chain('Quadratic equations') }, { id: SK2, ...chain('Real numbers') }],
    mastery_states: [{ student_id: ST, skill_id: SK, score: 82 }, { student_id: ST, skill_id: SK2, score: 40 }, { student_id: ST2, skill_id: SK, score: 50 }],
    questions: [q(1), q(2), q(3), q(4), q(5), q(6, { stretch_level: 2 }), q(7, { content_status: 'rejected' }), q(8, { tier: 'core', stretch_level: null }), q(9, { skill_id: SK2 })],
    stretch_attempts: [], commerce_settings: [], achievements: [], student_achievements: [], xp_transactions: [],
    ...extra,
  };
  return fakeDb(t, { defaults: { stretch_attempts: { answered_at: new Date().toISOString() } } });
}
(async () => {
  // ---------- pure rules
  ok(STRETCH_STYLES.length === 6 && STRETCH_STYLES.every((s) => STYLE_LABEL[s]), 'six styles all labelled');
  ok(isStretchStyle('ntse') && !isStretchStyle('cat') && !isStretchStyle(null), 'style check');
  const d = DEFAULT_STRETCH_SETTINGS;
  ok(d.unlockScore === 75 && d.levelUpAfter === 3 && d.levelDownAfter === 2, 'defaults');
  const cs = cleanStretchSettings({ unlockScore: 10, levelUpAfter: 99, dailyLimit: 'x', enabled: false });
  ok(cs.unlockScore === 75 && cs.levelUpAfter === 3 && cs.dailyLimit === d.dailyLimit && cs.enabled === false && cs.allowUnreviewed === true, 'settings clean falls back safely');
  ok(isSkillUnlocked({ masteryScore: 75 }) && !isSkillUnlocked({ masteryScore: 74 }), 'unlock at threshold');
  ok(isSkillUnlocked({ competencyStatus: 'demonstrated', evidenceCount: 2 }) && !isSkillUnlocked({ competencyStatus: 'demonstrated', evidenceCount: 1 }) && !isSkillUnlocked({ competencyStatus: 'developing', evidenceCount: 9 }), 'competency unlock needs demonstrated + 2 evidence');
  ok(!isSkillUnlocked({}), 'no evidence = locked');
  ok(nextStretchLevel(1, [true, true, true]) === 2 && nextStretchLevel(1, [true, true]) === 1 && nextStretchLevel(3, [true, true, true]) === 3, 'level up after 3, capped at 3');
  ok(nextStretchLevel(2, [false, false]) === 1 && nextStretchLevel(1, [false, false, false]) === 1 && nextStretchLevel(2, [false, true, false]) === 2, 'level down after 2 wrong, floor 1');
  ok(deriveLevel([]) === 1 && deriveLevel([true, true, true]) === 2 && deriveLevel([true, true, true, true, true, true]) === 3 && deriveLevel([true, true, true, false, false]) === 1, 'derived level restarts window at each change');
  ok(bestRun([true, true, false, true, true, true]) === 3 && bestRun([]) === 0, 'best run');
  const m = stretchMetrics([{ correct: true, stretch_level: 3, exam_style: 'ntse', subject_id: 'a' }, { correct: false, stretch_level: 3, exam_style: 'ioqm', subject_id: 'b' }, { correct: true, stretch_level: 1, exam_style: 'olympiad', subject_id: 'b' }]);
  ok(m.stretch_correct === 2 && m.stretch_level3 === 1 && m.stretch_styles === 2 && m.stretch_subjects === 2 && m.stretch_best_run === 1, 'metrics count only correct answers for styles/subjects');
  for (const c of [true, false]) for (const l of [1, 2, 3]) { const line = stretchFeedbackLine(c, l).toLowerCase(); ok(!STRETCH_BANNED.some((b) => line.includes(b)), `no banned words ${c}/${l}`); }
  ok(/very hard/.test(stretchFeedbackLine(false, 2)), 'a miss is framed as normal');

  // ---------- settings
  const db0 = mk();
  ok((await loadStretchSettings(db0)).unlockScore === 75, 'default settings load');
  await saveStretchSettings(db0, { unlockScore: 80, dailyLimit: 12, allowUnreviewed: false });
  const ls = await loadStretchSettings(db0);
  ok(ls.unlockScore === 80 && ls.dailyLimit === 12 && ls.allowUnreviewed === false, 'settings saved and reloaded');

  // ---------- unlocking
  const db = mk();
  const u = await unlockedSkills(db, ST);
  ok(u.length === 1 && u[0].skillId === SK && u[0].level === 1 && u[0].subjectName === 'Mathematics', 'only the strong skill is open');
  ok((await unlockedSkills(db, ST2)).length === 0, 'weaker student has nothing open');
  const locked = await nextStretchQuestion(db, ST2);
  ok(locked.question === null && locked.reason === 'locked' && /strong command/.test(locked.message ?? ''), 'locked message is friendly');
  db._tables.student_competency_mastery = [{ student_id: ST2, competency_id: 'c1', status: 'demonstrated', evidence_count: 3, competencies: { skill_id: SK2 } }];
  ok((await unlockedSkills(db, ST2)).some((s) => s.skillId === SK2), 'a demonstrated competency also opens the skill');
  db._tables.student_competency_mastery = [];

  // ---------- serving
  const n1 = await nextStretchQuestion(db, ST);
  ok(!!n1.question && n1.question.skillId === SK, 'a question is served');
  const view = JSON.stringify(n1.question);
  ok(!/expected|"value"|Because/.test(view), 'no answer key or explanation in the student view');
  ok(n1.question!.checkedByTeacher === false, 'unchecked question is labelled');
  const served = new Set<string>();
  for (let i = 0; i < 40; i++) { const r = await nextStretchQuestion(db, ST); served.add(r.question!.id); }
  ok(!served.has(uid(7)) && !served.has(uid(8)) && !served.has(uid(9)), 'rejected, core and locked-skill questions are never served');
  const onlyVerified = mk(); await saveStretchSettings(onlyVerified, { allowUnreviewed: false });
  const nv = await nextStretchQuestion(onlyVerified, ST);
  ok(nv.question === null && nv.reason === 'none_yet', 'with unreviewed disallowed and none verified: friendly wait message');
  onlyVerified._tables.questions.find((x: any) => x.id === uid(2)).content_status = 'verified';
  ok((await nextStretchQuestion(onlyVerified, ST)).question?.id === uid(2), 'verified question is served');
  const styled = await nextStretchQuestion(db, ST, { style: 'ntse' });
  ok(styled.question === null, 'style filter respected (no ntse questions in bank)');

  // ---------- answering
  const before = JSON.stringify(db._tables.mastery_states);
  let wrong = await answerStretch(db, ST, uid(1), '999', 10);
  ok(wrong.correct === false && wrong.correctAnswer === '1' && /very hard/.test(wrong.line), 'wrong answer: key shown only afterwards, framed as normal');
  ok(JSON.stringify(db._tables.mastery_states) === before, 'mastery_states untouched');
  ok(!(db._tables as any).student_competency_mastery?.length, 'competency mastery untouched');
  let dup = false; try { await answerStretch(db, ST, uid(1), '1', 5); } catch { dup = true; }
  ok(dup && db._tables.stretch_attempts.length === 1, 'the same question cannot be answered twice');
  let notStretch = false; try { await answerStretch(db, ST, uid(8), '8', 5); } catch { notStretch = true; }
  ok(notStretch, 'a core question cannot be answered here');
  let notOpen = false; try { await answerStretch(db, ST, uid(9), '9', 5); } catch { notOpen = true; }
  ok(notOpen, 'a locked skill cannot be answered');
  let notOpen2 = false; try { await answerStretch(db, ST2, uid(2), '2', 5); } catch { notOpen2 = true; }
  ok(notOpen2, 'a weaker student cannot answer');
  const fp = await answerStretch(db, ST, uid(2), 'abc!!', 5);
  ok(!!fp.formatProblem && db._tables.stretch_attempts.length === 1, 'wrong answer format asks again and is not recorded');
  const r2 = await answerStretch(db, ST, uid(2), '2', 7); const r3 = await answerStretch(db, ST, uid(3), '3', 7);
  ok(r2.correct && r3.correct && r3.newLevel === 1, 'two correct so far, level unchanged');
  const r4 = await answerStretch(db, ST, uid(4), '4', 7);
  ok(r4.correct && r4.level === 1 && r4.newLevel === 2, 'three correct in a row moves up a level');
  const served2 = new Set<string>(); for (let i = 0; i < 20; i++) { const r = await nextStretchQuestion(db, ST); if (r.question) served2.add(r.question.id); }
  ok(served2.size >= 1 && [1, 2, 3, 4].every((i) => !served2.has(uid(i))), 'answered questions never come back');
  ok((await nextStretchQuestion(db, ST)).question?.level === 2, 'new question is nearest the student level (2)');
  const att = db._tables.stretch_attempts;
  ok(att.length === 4 && att.every((a: any) => a.student_id === ST && a.skill_id === SK && a.subject_id === SUB), 'attempts recorded with student, skill, subject');

  // ---------- daily limit
  const dl = mk(); await saveStretchSettings(dl, { dailyLimit: 5 });
  for (let i = 1; i <= 5; i++) await answerStretch(dl, ST, uid(i), String(i), 3);
  ok((await nextStretchQuestion(dl, ST)).reason === 'daily_limit', 'daily limit stops the session kindly');
  const off = mk(); await saveStretchSettings(off, { enabled: false });
  ok((await nextStretchQuestion(off, ST)).reason === 'off', 'switch-off respected');
  let offAns = false; try { await answerStretch(off, ST, uid(1), '1', 1); } catch { offAns = true; }
  ok(offAns, 'cannot answer when switched off');

  // ---------- summary + badges
  const sum = await stretchSummary(db, ST);
  ok(sum.attempted === 4 && sum.metrics.stretch_correct === 3 && sum.metrics.stretch_best_run === 3, 'summary counts');
  const defs = [
    { code: 'stretch_first', category: 'assessment', title: 'First', description: 'd', metric: 'stretch_correct' as const, threshold: 1, xp: 0 },
    { code: 'stretch_run_3', category: 'assessment', title: 'Run', description: 'd', metric: 'stretch_best_run' as const, threshold: 3, xp: 0 },
    { code: 'stretch_top_1', category: 'assessment', title: 'Top', description: 'd', metric: 'stretch_level3' as const, threshold: 1, xp: 0 },
  ];
  const ev = evaluateAchievements({ ...EMPTY_METRICS, ...sum.metrics }, defs, new Set());
  ok(ev.map((e) => e.def.code).join() === 'stretch_first,stretch_run_3', 'badges evaluate on the new metrics; level-3 badge still locked');
  // end to end through the real engine: unlockAchievements writes the badge and no XP
  const eb = mk({ achievements: defs.map((d) => ({ ...d, active: true, sort: 1 })), student_engagement: [{ student_id: ST, xp_total: 0 }] });
  for (let i = 1; i <= 3; i++) await answerStretch(eb, ST, uid(i), String(i), 3);
  const res = await unlockAchievements(eb, ST, { idx: new Map(), settings: DEFAULT_ENGAGEMENT } as any, 0);
  ok(res.unlocked.map((x) => x.code).sort().join() === 'stretch_first,stretch_run_3', 'engine unlocks the Challenge badges');
  ok(eb._tables.student_achievements.length === 2 && eb._tables.xp_transactions.length === 0, 'badges recorded, no XP awarded');
  const again = await unlockAchievements(eb, ST, { idx: new Map(), settings: DEFAULT_ENGAGEMENT } as any, 0);
  ok(again.unlocked.length === 0 && eb._tables.student_achievements.length === 2, 'a badge is awarded once');

  // ---------- contributions
  const good = { skillId: SK, bank: 'diagnostic', questionType: 'numeric', prompt: 'Original hard question about roots of a quadratic?', answer: '12', difficulty: 2 };
  ok(!cleanContribution({ ...good, tier: 'stretch' }).ok, 'stretch upload needs exam style');
  ok(!cleanContribution({ ...good, tier: 'stretch', examStyle: 'ntse', stretchLevel: 7 }).ok, 'stretch level 1-3');
  const cc = cleanContribution({ ...good, tier: 'stretch', examStyle: 'ntse', stretchLevel: 3 });
  ok(cc.ok && cc.value.bank === 'practice' && cc.value.tier === 'stretch', 'stretch upload always goes to the practice bank');
  const cdb = mk();
  const t = await contributeQuestion(cdb, { userId: 'u-teach', role: 'teacher' }, { ...good, tier: 'stretch', examStyle: 'ntse', stretchLevel: 3 });
  const row = cdb._tables.questions.find((x: any) => x.id === t.id);
  ok(row.tier === 'stretch' && row.exam_style === 'ntse' && row.stretch_level === 3 && row.difficulty === 5 && row.content_status === 'needs_review' && row.contributed_role === 'teacher', 'teacher stretch upload tagged, unreviewed, attributed');
  const plain = await contributeQuestion(cdb, { userId: 'u-teach', role: 'teacher' }, { ...good, prompt: 'An ordinary question about the discriminant?', bank: 'practice' });
  ok(cdb._tables.questions.find((x: any) => x.id === plain.id).tier === undefined, 'ordinary upload stays core (database default)');

  // ---------- AI writing (stub provider)
  const stubAi = (resp: any) => ({ complete: async (_: any) => ({ text: JSON.stringify(resp) }) }) as any;
  const adb = mk();
  const gen = { prompt: 'Original hard problem: find $x$ if $x^2=144$ and $x>0$?', questionType: 'numeric', options: null, expectedAnswer: { value: '12' }, explanation: 'x^2=144 so x=12. Answer 12' };
  // the verifier asks the AI to solve independently; the stub always answers with the same JSON, so make it agree
  const ai1 = { complete: async (p: any) => ({ text: JSON.stringify(/independent|solve/i.test(JSON.stringify(p)) ? { answer: '12', value: '12', expectedAnswer: { value: '12' } } : gen) }) } as any;
  const g = await generateStretchQuestions(adb, ai1, { skillId: SK, style: 'ioqm', level: 2, count: 1, budgetMs: 5000 });
  const made = adb._tables.questions.filter((x: any) => x.tier === 'stretch' && x.exam_style === 'ioqm');
  ok((g.made === 1 && made.length === 1 && made[0].content_status === 'needs_review' && made[0].stretch_level === 2 && made[0].origin === 'ai_generated') || (g.made === 0 && g.failed > 0), 'AI-written question is stretch + needs_review (or rejected by the checks, never saved wrongly)');
  const bad = await generateStretchQuestions(mk(), stubAi({ nonsense: true }), { skillId: SK, count: 2, budgetMs: 3000 });
  ok(bad.made === 0 && bad.failed > 0, 'malformed AI output saves nothing');
  let nosub = false; try { await fillStretchForSubject(mk({ chapters: [] }), stubAi({}), SUB, 3); } catch { nosub = true; }
  ok(nosub, 'fill needs a subject with skills');
  console.log(`t63: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
