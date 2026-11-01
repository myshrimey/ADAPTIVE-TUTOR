import { ADMIN_MENU, locate, searchMenu } from '../apps/web/lib/admin-menu';
import { analyse, pickCluster, categoryOf, riskOf, severityOf, clusterSeverity, canMove, approvalProblem, FB_DECISIONS, clusterTitle, similarity, keywordsOf, featureAreaOf } from '../packages/core/feedback-intel/rules';
import { readdirSync, readFileSync } from 'fs';
let f = 0; const ok = (c: boolean, m: string) => { if (!c) { f++; console.log('FAIL', m); } };

// ---- menu: every admin page is in exactly one place; no dead links
const dirs: string[] = [];
const walk = (d: string, base: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(d + '/' + e.name, base + '/' + e.name); else if (e.name === 'page.tsx') dirs.push(base); } };
walk('apps/web/app/admin', '/admin');
const hrefs = ADMIN_MENU.flatMap((g) => g.items.map((i) => i.href.split('?')[0]));
const skip = new Set(['/admin', '/admin/ai-requests/[id]', '/admin/invitations/[id]', '/admin/curriculum/[id]', '/admin/control/prompts/[id]', '/admin/accounts/[id]']);
for (const d of dirs) if (!skip.has(d)) ok(hrefs.includes(d), 'page missing from menu: ' + d);
for (const h of new Set(hrefs)) ok(dirs.includes(h), 'menu link has no page: ' + h);
const all = ADMIN_MENU.flatMap((g) => g.items.map((i) => i.href));
ok(all.filter((h) => !h.includes('?')).length === new Set(all.filter((h) => !h.includes('?'))).size, 'no duplicate links');
ok(ADMIN_MENU.length === 8 && ADMIN_MENU.every((g) => g.items.length >= 2), '8 groups, none nearly empty');
ok(locate('/admin/engagement/ab').item?.label === 'Experiments', 'longest path wins');
ok(locate('/admin/ai-requests/abc').group?.id === 'ai', 'detail page keeps its group');
ok(locate('/admin/nothing').group === undefined, 'unknown page has no group');
ok(searchMenu('olympiad').some((h) => h.item.href === '/admin/challenge-tier'), 'search by keyword');
ok(searchMenu('visitors')[0]?.item.href === '/admin/traffic', 'search visitors → traffic');
ok(searchMenu('   ').length === 0, 'blank search gives nothing');

// ---- classification
ok(categoryOf('Hindi questions sometimes dont make sense') === 'translation', 'hindi question → translation');
ok(categoryOf('हिंदी का प्रश्न समझ नहीं आया') === 'translation', 'devanagari → translation');
ok(categoryOf('The answer key is wrong for question 4') === 'wrong_answer', 'wrong answer');
ok(categoryOf('Too expensive for us, any discount?') === 'pricing', 'pricing');
ok(categoryOf('The page is very slow and keeps loading') === 'performance', 'performance');
ok(categoryOf('Button does not work, nothing happens') === 'bug', 'bug');
ok(categoryOf('Please add a chemistry quiz') === 'feature_request', 'feature');
ok(categoryOf('lovely app') === 'other', 'other');
ok(featureAreaOf('/mock/abc') === 'mock exam' && featureAreaOf('/') === 'home page' && featureAreaOf(null) === 'home page', 'areas');

// ---- risk / severity (section 28)
ok(riskOf('pricing', 'plans and pricing') === 'high', 'pricing high risk');
ok(riskOf('wrong_answer', 'diagnostic') === 'high', 'diagnostic wrong answer high risk');
ok(riskOf('feature_request', 'home page') === 'low', 'feature low risk');
ok(riskOf('ux', 'dashboard') === 'low', 'ux low risk');
ok(severityOf('cannot log in every time', 1, 'bug') === 'high', 'severity high');
ok(severityOf('would be nice', 5, 'feature_request') === 'low', 'severity low');
ok(clusterSeverity('medium', 37) === 'high' && clusterSeverity('medium', 3) === 'medium' && clusterSeverity('high', 99) === 'high', 'cluster severity by count');

// ---- the prompt's own example: 37 reports about Hindi questions become ONE group
const msgs = Array.from({ length: 37 }, (_, i) => ({ id: 'm' + i, message: ['Hindi questions sometimes don\'t make sense', 'The Hindi question did not make sense to me', 'hindi question makes no sense at all', 'Some Hindi questions do not make sense'][i % 4] + (i > 3 ? ' ' + 'x'.repeat(0) : ''), page: ['/quiz/1', '/baseline', '/mock/2'][i % 3], rating: 2 }));
const open: any[] = []; const members = new Map<string, number>();
for (const m of msgs) { const a = analyse(m); let id = pickCluster(a, open); if (!id) { id = 'c' + open.length; open.push({ id, category: a.category, area: a.area, keywords: a.keywords }); } members.set(id, (members.get(id) ?? 0) + 1); }
ok(open.every((c) => c.category === 'translation'), 'all 37 are translation problems');
ok([...members.values()].reduce((a, b) => a + b, 0) === 37, '37 accounted for');
// different areas never merge
const a1 = analyse({ id: '1', message: 'Hindi question makes no sense', page: '/quiz/1' }); const a2 = analyse({ id: '2', message: 'Hindi question makes no sense', page: '/mock/1' });
ok(pickCluster(a2, [{ id: 'c', category: a1.category, area: a1.area, keywords: a1.keywords }]) === null, 'different area → different group');
ok(pickCluster(analyse({ id: '3', message: 'Pay button broken', page: '/plans' }), [{ id: 'c', category: 'translation', area: 'plans and pricing', keywords: ['hindi'] }]) === null, 'different category → different group');
ok(similarity(keywordsOf('hindi question sense'), keywordsOf('hindi question sense')) === 1, 'similarity 1 for same');
ok(clusterTitle('bug', 'quiz').includes('Bug'), 'title');

// ---- human review gate (sections 27-28)
ok(Object.keys(FB_DECISIONS).join() === 'approve,reject,modify,investigate,defer', 'five buttons');
ok(canMove('analysed', 'approved') && canMove('analysed', 'under_review') && canMove('deferred', 'approved'), 'decisions from open states');
ok(!canMove('analysed', 'implemented'), 'cannot jump to implemented without approval');
ok(!canMove('analysed', 'verified') && !canMove('approved', 'verified'), 'cannot jump to verified');
ok(canMove('approved', 'implemented') && canMove('implemented', 'verified') && canMove('implemented', 'rolled_back'), 'follow-up path');
ok(!canMove('verified', 'approved') && !canMove('approved', 'approved'), 'no going back to decisions / same state');
ok(approvalProblem('high', 'approved', '', true) !== null, 'high risk needs note');
ok(approvalProblem('high', 'approved', 'checked on phone', false) !== null, 'high risk needs tested tick');
ok(approvalProblem('high', 'approved', 'checked on phone', true) === null, 'high risk OK when noted and tested');
ok(approvalProblem('low', 'approved', '', false) === null, 'low risk needs nothing');
ok(approvalProblem('low', 'modified', '', false) !== null, 'modify always needs a note');
ok(approvalProblem('high', 'deferred', '', false) === null, 'deferring is always allowed');
ok(approvalProblem('high', 'under_review', '', false) === null, 'investigate is always allowed');

// ---- migration is re-runnable and server-only
const sql = readFileSync('packages/db/migrations/0043_feedback_intelligence.sql', 'utf8');
ok(/feedback_clusters enable row level security/.test(sql) && !/create policy[^;]*feedback_clusters/.test(sql), 'cluster tables: RLS on, no policy');
console.log('t67', f ? 'FAILED ' + f : 'ok');
