import { fakeDb } from './fakedb2';
import * as C from '../packages/core/feedback-intel';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };
const rejects = async (p: Promise<any>, re: RegExp, m: string) => { let msg = ''; try { await p; } catch (e: any) { msg = e.message; } ok(re.test(msg), `${m} (got "${msg}")`); };

(async () => {
  // pure helpers
  ok(C.isPositive('I love the baseline test, very helpful') && !C.isPositive('I love it but the page is slow') && !C.isPositive('The answer is wrong') && C.isPositive('ok', 5, 'praise') && !C.isPositive('Please add a quiz'), 'praise detection');
  ok(C.roleFromPage('/parent/x', false, true) === 'parent' && C.roleFromPage('/tutor', false, true) === 'tutor' && C.roleFromPage('/quiz', true, true) === 'student' && C.roleFromPage('/', false, false) === 'visitor' && C.roleFromPage('/quiz', false, true) === 'other' && C.roleFromPage('/centre/attention', false, true) === 'centre', 'role is inferred from page / student lookup');
  const cc = C.cleanContext({ questionId: 'q_12-ab', sessionId: '<script>', mockId: 'x'.repeat(80), evil: 'x', feature: 'quiz', locale: 'en-IN' });
  ok(cc.questionId === 'q_12-ab' && !cc.sessionId && !cc.mockId && !('evil' in cc) && cc.feature === 'quiz', 'context ids sanitised, unknown keys dropped');
  ok(Object.keys(C.FB_IMPACTS).length === 6 && Object.keys(C.QUESTION_KINDS).length === 12 && Object.keys(C.AI_REPLY_KINDS).length === 9 && C.MOAT_LEVELS.join() === 'none,low,medium,high,core', 'lists match the prompt');

  // priority formula is transparent
  const base: any = { category: 'bug', area: 'quiz', severity: 'medium', risk: 'medium', reports: 4, uniqueReports: 4, reports7d: 2, users: 4, roles: ['student'], impactMax: 6, moat: 'none', status: 'analysed' };
  const p = C.feedbackPriority(base);
  ok(Math.abs(p.parts.reduce((a, x) => a + x.points, 0) - p.score) < 0.11 && p.parts.length === 7 && p.parts.every((x) => x.why.length > 5), 'score = visible sum of explained parts');
  ok(p.score === 20 + 8 + 3 + 0 + 0 + 6 + 0 && p.level === 'P2', 'score arithmetic ' + p.score);
  const big = C.feedbackPriority({ ...base, severity: 'high', users: 20, reports7d: 10, impactMax: 10, moat: 'core', category: 'wrong_answer', area: 'diagnostic', risk: 'high' });
  ok(big.level === 'P0' && big.learningCritical, 'big learning problem is P0'); ok(C.feedbackPriority({ ...base, severity: 'low', users: 1, reports7d: 0, impactMax: 0 }).level === 'P3', 'small = P3');
  const wa = C.feedbackPriority({ ...base, category: 'wrong_answer', severity: 'low', users: 1, reports7d: 0, impactMax: 0 }); ok(['P0', 'P1'].includes(wa.level) && wa.escalated && wa.reasons.some((r) => /wrong answer/i.test(r)), 'possible wrong answer escalates to at least P1 with a reason');
  const pv = C.feedbackPriority({ ...base, severity: 'low', users: 1, reports7d: 0, impactMax: 0, text: "I can see another student's name on my report" }); ok(pv.level === 'P0' && pv.escalated, 'privacy words -> P0');
  ok(C.feedbackPriority(base, { level: 'P0' }).level === 'P0' && C.feedbackPriority(base, { level: 'P0' }).computedLevel === 'P2' && C.feedbackPriority(base, { level: 'bogus' }).level === 'P2', 'override applies, computed level kept, bad override ignored');
  ok(C.feedbackPriority({ ...base, category: 'pricing', area: 'plans and pricing', users: 3 }).revenueCritical, 'pricing is revenue-critical');
  ok(C.suggestMoat('bug', 'diagnostic') === 'core' && C.suggestMoat('wrong_answer', 'quiz') === 'high' && C.suggestMoat('other', 'home page') === 'none', 'moat hints');

  // pipeline on the fake database
  const now = new Date('2026-10-28T06:00:00Z'); const iso = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const rows = [
    { id: 'f1', student_id: 's1', page: '/baseline', rating: 1, message: 'Diagnostic test stuck, nothing happens when I press the button', created_at: iso(1), role: 'student', source: 'in_app', impact: 'prep' },
    { id: 'f2', student_id: 's2', page: '/baseline', rating: 2, message: 'Diagnostic test stuck every time, button does nothing happens', created_at: iso(2), role: 'student', source: 'in_app', impact: 'blocked' },
    { id: 'f3', student_id: 's3', page: '/baseline', rating: null, message: 'The diagnostic test is stuck, the button nothing happens', created_at: iso(3), role: 'student', source: 'in_app', impact: null },
    { id: 'f4', student_id: null, page: '/parent', rating: 5, message: 'I love the parent report, very helpful', created_at: iso(1), role: 'parent', source: 'in_app', impact: null },
    { id: 'f5', student_id: null, page: '/pricing', rating: null, message: 'Too expensive for us, any discount?', created_at: iso(9), role: 'visitor', source: 'in_app', impact: 'minor', contact_email: 'a@b.in' },
  ];
  const db: any = fakeDb({ feedback: rows, ai_usage: [] }, { defaults: { feedback_clusters: { moat: 'none', status: 'analysed', report_count: 0 } } });
  const an = await C.analyseNewFeedback(db); ok(an.analysed === 5 && !an.error, 'sorted ' + JSON.stringify(an));
  ok(db.from && true, 'db ok'); const pos = (await db.from('feedback').select('*')).data.filter((r: any) => r.positive); ok(pos.length === 1 && pos[0].id === 'f4', 'praise flagged on analysis only for the praise message');
  const man = await C.addManualFeedback(db, 'founder@x.org', { source: 'phone', person: 'Parent of a Class 10 student', role: 'parent', receivedOn: '2026-10-27', message: 'Baseline questions were too hard for my child, she got stuck', impact: 'harder', context: 'after baseline' });
  ok(!!man.id && man.analysed >= 1, 'manual entry saved and sorted');
  await rejects(C.addManualFeedback(db, 'x', { source: 'in_app', message: 'hello there friend' }), /where the feedback came from/, 'manual needs an outside source');
  await rejects(C.addManualFeedback(db, 'x', { source: 'phone', message: 'hi' }), /at least a few words/, 'manual needs words');
  const q = await C.loadQueue(db, { all: true }, now);
  const diag = q.rows.find((r) => r.c.feature_area === 'diagnostic' && r.c.category === 'bug')!; ok(!!diag && diag.c.report_count >= 3 && diag.c.users >= 3 && diag.c.roles.includes('student'), 'diagnostic group: users and roles counted ' + JSON.stringify(diag && [diag.c.report_count, diag.c.users]));
  ok(diag.p.level !== 'P3' && diag.p.parts.length === 7, 'diagnostic group has a real priority');
  ok(q.analytics.total === 6 && q.analytics.newThisWeek === 5 && q.analytics.loved.some(([k]) => k === 'parent view') && q.analytics.bySource.some(([k]) => k === 'phone') && q.analytics.byRole.some(([k]) => k === 'parent'), 'analytics counts');
  ok(q.analytics.avgReviewDays === null && q.analytics.rejectionRate === null && q.analytics.implementationRate === null && q.analytics.regressionRate === null, 'rates are null (not 0) before any decision');
  ok(q.analytics.perDay.length === 30, '30 day series');
  const bySearch = await C.loadQueue(db, { q: 'discount', all: true }, now); ok(bySearch.rows.length === 1 && bySearch.rows[0].c.category === 'pricing', 'search finds words inside messages');
  ok((await C.loadQueue(db, { src: 'phone', all: true }, now)).rows.length >= 1 && (await C.loadQueue(db, { src: 'email', all: true }, now)).rows.length === 0, 'source filter');
  ok((await C.loadQueue(db, { role: 'visitor', all: true }, now)).rows.every((r) => r.c.roles.includes('visitor')) && (await C.loadQueue(db, { cat: 'pricing', all: true }, now)).rows.length === 1, 'role + category filter');
  const sorted = await C.loadQueue(db, { sort: 'priority', all: true }, now); ok(sorted.rows.every((r, i, a) => i === 0 || a[i - 1].p.score >= r.p.score), 'sorted by priority');

  // moat, override
  await rejects(C.setMoat(db, 'x', diag.c.id, 'huge'), /Choose none/, 'moat value validated');
  await C.setMoat(db, 'founder@x.org', diag.c.id, 'core');
  await rejects(C.overridePriority(db, 'x', diag.c.id, 'P0', ''), /reason/, 'override needs a reason'); await rejects(C.overridePriority(db, 'x', diag.c.id, 'P9', 'because'), /P0, P1/, 'override level validated');
  await C.overridePriority(db, 'founder@x.org', diag.c.id, 'P3', 'Known and already scheduled');
  const q2 = await C.loadQueue(db, { all: true }, now); const d2 = q2.rows.find((r) => r.c.id === diag.c.id)!; ok(d2.p.level === 'P3' && d2.p.computedLevel !== 'P3' && d2.c.moat === 'core' && d2.c.priority_reason.includes('scheduled'), 'override and moat stored, formula still visible');
  const ev = (await db.from('feedback_cluster_events').select('*')).data; ok(ev.some((e: any) => /Priority set by hand to P3/.test(e.note) && e.actor === 'founder@x.org') && ev.some((e: any) => /Moat value/.test(e.note)), 'overrides are in the history');
  await C.overridePriority(db, 'founder@x.org', diag.c.id, null, 'Back to the formula'); ok((await db.from('feedback_clusters').select('*').eq('id', diag.c.id).single()).data.priority_override === null, 'override removable');

  // task and validation lifecycle
  const task = { title: 'Make baseline easier after a wrong answer', problem: 'Questions get harder', expected: 'Next question easier', acceptance: 'Three wrong answers lead to easier items' };
  await rejects(C.createTask(db, 'x', diag.c.id, task), /Approve the group first/, 'no task before approval');
  await rejects(C.validateCluster(db, 'x', diag.c.id, { outcome: 'fixed_validated', version: 'v1' }), /implemented/, 'no validation before implemented');
  const hi = (await db.from('feedback_clusters').select('*').eq('id', diag.c.id).single()).data; 
  const ap = await C.decideCluster(db, { clusterId: diag.c.id, decision: 'approve', note: 'Checked with samples', tested: true, actor: 'founder@x.org' }); ok(ap.ok, 'approve ' + JSON.stringify(ap) + hi.risk);
  await rejects(C.createTask(db, 'x', diag.c.id, { ...task, acceptance: '' }), /how you will know/, 'task needs acceptance');
  const t = await C.createTask(db, 'founder@x.org', diag.c.id, task); ok(t.feedbackIds.length >= 3 && t.createdBy === 'founder@x.org' && t.area === 'diagnostic', 'task keeps the feedback ids');
  const im = await C.decideCluster(db, { clusterId: diag.c.id, moveTo: 'implemented', note: 'Deployed v73', tested: true, actor: 'founder@x.org' }); ok(im.ok, 'implemented');
  await rejects(C.validateCluster(db, 'x', diag.c.id, { outcome: 'fixed_validated' }), /version/, 'validated fix needs the version');
  await rejects(C.validateCluster(db, 'x', diag.c.id, { outcome: 'regression' }), /note/, 'bad outcome needs a note');
  await rejects(C.validateCluster(db, 'x', diag.c.id, { outcome: 'nonsense' }), /Choose an outcome/, 'outcome validated');
  ok((await C.validateCluster(db, 'x', diag.c.id, { outcome: 'partial', note: 'Better on mobile only' })).status === 'implemented', 'partial keeps implemented');
  const reopened = await C.validateCluster(db, 'founder@x.org', diag.c.id, { outcome: 'regression', note: 'Now Hindi items fail', version: 'v73' }); ok(reopened.status === 'under_review', 'regression reopens the group');
  await C.decideCluster(db, { clusterId: diag.c.id, decision: 'approve', note: 'Retested', tested: true, actor: 'f' }); await C.decideCluster(db, { clusterId: diag.c.id, moveTo: 'implemented', note: 'Fixed again', tested: true, actor: 'f' });
  const fin = await C.validateCluster(db, 'founder@x.org', diag.c.id, { outcome: 'fixed_validated', version: 'v74' }); ok(fin.status === 'verified', 'validated -> verified');
  const fc = (await db.from('feedback_clusters').select('*').eq('id', diag.c.id).single()).data; ok(fc.deployment_version === 'v74' && fc.validation_status === 'fixed_validated' && !!fc.validated_at && fc.validated_by === 'founder@x.org', 'version and validator stored');
  const q3 = await C.loadQueue(db, { all: true }, now); ok(q3.analytics.avgResolveDays !== null && q3.analytics.implementationRate !== null, 'resolution time exists after validation');

  // AI analysis is optional, labelled, and failure-safe
  const target = q.rows.find((r) => r.c.category === 'pricing')!.c.id;
  const aiOk: any = { complete: async (p: any) => { (aiOk as any).last = p; return { text: 'Here: {"summary":"Families find the price high","suspected_cause":"Unclear value","recommended_solution":"Explain the Free Core","recommended_action":"product_improvement","learning_impact":"none","moat_impact":"low","confidence":"70","reasoning":"One message only"}', usage: { inputTokens: 1, outputTokens: 1 }, requestId: 'r1' }; } };
  const res = await C.aiAnalyseCluster(db, aiOk, 'founder@x.org', target, async (rid) => ({ provider: 'p', model: 'm' }), now);
  ok(res.label.includes('not a decision') && res.confidence === 70 && res.provider === 'p' && res.promptVersion === 'fbk-v1' && res.recommended_action === 'product_improvement', 'AI recommendation stored and labelled');
  ok(aiOk.last.feature === 'feedback_analysis' && aiOk.last.ref === target && !/a@b\.in/.test(aiOk.last.userMessage), 'AI call goes through the gateway feature and has no e-mail');
  const st = (await db.from('feedback_clusters').select('*').eq('id', target).single()).data; ok(st.status === 'analysed', 'AI never changes the status');
  await rejects(C.aiAnalyseCluster(db, { complete: async () => { throw new Error('quota'); } } as any, 'x', target, async () => ({})), /could not be reached.*safe/, 'provider failure is friendly');
  await rejects(C.aiAnalyseCluster(db, { complete: async () => ({ text: 'garbage', usage: { inputTokens: 0, outputTokens: 0 } }) } as any, 'x', target, async () => ({})), /could not be/, 'malformed AI reply');
  ok((await db.from('feedback').select('*')).data.length === 6 && (await db.from('feedback_clusters').select('*').eq('id', target).single()).data.ai_analysis.summary.includes('price'), 'no feedback lost; earlier analysis kept after failures');
  const full: any = fakeDb({ feedback: rows.slice(0, 1), feedback_clusters: [{ id: 'c1', title: 't', status: 'analysed', category: 'bug', feature_area: 'quiz', risk: 'low', severity: 'low' }], ai_usage: Array.from({ length: 30 }, (_, i) => ({ id: i, feature: 'feedback_analysis', ok: true, created_at: now.toISOString() })) });
  await rejects(C.aiAnalyseCluster(full, aiOk, 'x', 'c1', async () => ({}), now), /limit of 30/, 'daily AI cap');
  const parsed = C.parseFeedbackAnalysis('{"summary":"s","confidence":900,"moat_impact":"weird","recommended_action":"hack"}'); ok(parsed.confidence === 100 && parsed.moat_impact === 'none' && parsed.recommended_action === 'investigate', 'AI fields clamped to allowed values');
  console.log('t73', f ? 'FAILED ' + f : 'ok');
})();
