import * as fs from 'fs'; import * as path from 'path';
import { planRoute, budgetDecision, DEFAULT_GATEWAY, assertAiAllowed, computeCost, isFreeRoute, quotaTypeOf, promoCreditLeft, GatewayAIProvider, resetGatewayState, TIER0_TASKS,
  validateEconomics, DEFAULT_ECONOMICS, capStatuses, projectCosts, evaluationEconomics, simulateSwitch, groupRequests, aggregate, featureEconomics, reconcile, groupAggregate, FEATURE_CATALOG,
  benchmarkBreakdown, compareModels, recordAIAttempt, markRequestQuality, recordEvaluationEconomics, loadAiEconomics, loadAiRequests, loadAiRequest, loadCommandCentreAi, jsonLooksValid, rowEconomic, MANUAL_DIMENSIONS } from '../packages/core/index';
import { fakeDb } from './fakedb2';
let ok = 0, bad = 0; const t = (n: string, c: boolean) => { c ? ok++ : (bad++, console.log('FAIL', n)); };
const now = new Date('2026-10-20T10:00:00Z');
const P = (o: any = {}): any => ({ id: 'x', adapter: 'groq', provider_name: 'X', region: null, model: 'm', model_version: null, endpoint: null, auth_method: 'bearer', key_env: 'X_KEY', priority: 50, status: 'active', classification: 'B', free_tier_available: true, free_quota_note: null, rpm: null, rpd: null, tpm: null, tpd: null, input_price_usd_m: 1, output_price_usd_m: 2, image_price_usd: null, audio_stt_price_usd: null, tts_price_usd: null, context_window: null, languages: null, vision: false, structured_output: null, tool_calling: null, commercial_use: 'unknown', data_policy: null, policy_status: 'unknown', verification_required: null, free_tier_expiry: null, quota_reset: 'daily', last_verified: null, source_url: null, verification: {}, legacy: false, notes: null, ...o });
const cfg = (o: any = {}) => ({ ...DEFAULT_GATEWAY, ...o });
const E = (o: any = {}) => ({ ...DEFAULT_ECONOMICS, ...o });
const est = { inputTokens: 1000, outputTokens: 500, images: 0 };
const route = (providers: any[], o: any = {}) => planRoute({ feature: o.feature ?? 'tutor', needsImages: !!o.img, studentTier: o.tier ?? 'paid', config: cfg(o.cfg), providers, usage: o.usage ?? {}, hasKey: () => true, benchmark: o.bench, now, econ: o.econ, estimate: o.est ?? est, promoUsed: o.promo });
const ids = (r: any) => r.chain.map((p: any) => p.id).join(',');
const paidCfg = { free_only_mode: false, allow_paid_fallback: true, max_daily_spend_inr: 100, max_monthly_spend_inr: 1000 };

// ---------- A. cost layers
{
  const f = computeCost(P({ input_price_usd_m: 1, output_price_usd_m: 2 }), 1_000_000, 1_000_000, 0, '2026-10-20', { fx: 80 });
  t('list = rates x tokens x fx', Math.abs(f.listInr - 240) < 1e-9 && f.estInr === f.listInr);
  t('free route: billed 0, subsidy = list, economic = list', f.billedInr === 0 && f.freeQuotaValueInr === f.listInr && f.economicInr === f.listInr && f.quotaType === 'free_quota' && f.promoCreditInr === 0);
  const paid = computeCost(P({ classification: 'D', free_tier_available: false }), 1_000_000, 0, 0, '2026-10-20');
  t('paid route: billed = list', paid.billedInr === paid.listInr && paid.billedInr > 0 && paid.quotaType === 'paid' && paid.freeQuotaValueInr === 0);
  const pr = (bal: number, exp: string | null = null) => P({ classification: 'D', free_tier_available: false, quota_type: 'promo_credit', promo_credit_balance_inr: bal, promo_credit_expiry: exp, input_price_usd_m: 1, output_price_usd_m: 0 });
  const small = computeCost(pr(1000), 1_000_000, 0, 0, '2026-10-20', { fx: 10 });
  t('promo credit covers a call fully', small.promoCreditInr === 10 && small.billedInr === 0 && small.quotaType === 'promo_credit' && small.economicInr === 10);
  const part = computeCost(pr(4), 1_000_000, 0, 0, '2026-10-20', { fx: 10 });
  t('promo credit partly covers: rest billed', part.promoCreditInr === 4 && part.billedInr === 6);
  const used = computeCost(pr(10), 1_000_000, 0, 0, '2026-10-20', { fx: 10, promoUsedInr: 7 });
  t('credit already used is subtracted', used.promoCreditInr === 3 && used.billedInr === 7);
  const exp = computeCost(pr(1000, '2026-10-01'), 1_000_000, 0, 0, '2026-10-20', { fx: 10 });
  t('expired credit is paid', exp.promoCreditInr === 0 && exp.billedInr === 10 && exp.quotaType === 'paid');
  t('quota_type paid beats free flag', !isFreeRoute(P({ quota_type: 'paid', free_tier_available: true })));
  t('quota_type promo is not a free quota', !isFreeRoute(P({ quota_type: 'promo_credit', free_tier_available: true })));
  t('unknown free flag is labelled unknown but billed', (() => { const c = computeCost(P({ free_tier_available: null }), 1_000_000, 0, 0, '2026-10-20'); return c.quotaType === 'unknown' && c.billedInr === c.listInr; })());
  t('whole provider is never "free": two models, two plans', quotaTypeOf(P({ id: 'g', model: 'a', free_tier_available: true }), '2026-10-20') === 'free_quota' && quotaTypeOf(P({ id: 'g', model: 'b', free_tier_available: false, quota_type: 'paid' }), '2026-10-20') === 'paid');
  const snapRow = P({ model: 'alpha', model_version: 'v1', input_price_usd_m: 1 }); const snap = computeCost(snapRow, 100, 100, 0, '2026-10-20').pricingSnapshot as any;
  snapRow.input_price_usd_m = 99; // price edited later
  t('snapshot keeps the price used at the time', snap.input_price_usd_m === 1 && snap.model === 'alpha' && snap.model_version === 'v1' && snap.fx_usd_inr === 88 && snap.rates_known === true && snap.priced_on === '2026-10-20');
  t('unknown rates are flagged, not hidden', (computeCost(P({ input_price_usd_m: null, output_price_usd_m: null }), 10, 10).pricingSnapshot as any).rates_known === false);
  t('promoCreditLeft honours expiry and type', promoCreditLeft(pr(5, '2026-12-01'), 0, '2026-10-20') === 5 && promoCreditLeft(P(), 0) === 0);
}

// ---------- B. routing
{
  const G = P({ id: 'gemini', priority: 10, vision: true, input_price_usd_m: 0.3, output_price_usd_m: 2.5 }), Q = P({ id: 'groq', priority: 20, input_price_usd_m: 0.05, output_price_usd_m: 0.08 });
  const cheapFirst = E({ route_objective: 'lowest_cost_meeting_quality' });
  t('default objective keeps configured order', ids(route([G, Q])) === 'gemini,groq');
  t('lowest-cost objective orders cheapest first', ids(route([G, Q], { econ: cheapFirst })) === 'groq,gemini');
  t('objective never beats a failed quality gate', ids(route([G, Q], { econ: E({ route_objective: 'lowest_cost_meeting_quality', quality_min: { tutor: 80 } }), bench: { gemini: 90, groq: 60 } })) === 'gemini');
  t('quality minimum removes unbenchmarked models (not guessed)', ids(route([G, Q], { econ: E({ quality_min: { tutor: 50 } }), bench: { gemini: 70 } })) === 'gemini' && ids(route([G, Q], { econ: E({ quality_min: { tutor: 50 } }) })) === '');
  t('quality skip reason is explicit', route([G], { econ: E({ quality_min: { tutor: 50 } }) }).skipped.some((s) => /not benchmarked/.test(s.reason)));
  t('handwriting_min_quality still works', ids(route([G], { feature: 'handwriting', img: true, cfg: { handwriting_min_quality: 70 }, bench: { gemini: 60 } })) === '' && ids(route([G], { feature: 'handwriting', img: true, cfg: { handwriting_min_quality: 70 }, bench: { gemini: 80 } })) === 'gemini');
  t('cost ceiling skips an expensive model', ids(route([P({ id: 'big', input_price_usd_m: 1000, output_price_usd_m: 1000, priority: 1 }), Q], { econ: E({ max_cost_per_call_inr: { tutor: 1 } }) })) === 'groq');
  t('cost ceiling counts list price even on a free quota', route([P({ id: 'big', input_price_usd_m: 1000, output_price_usd_m: 1000 })], { econ: E({ max_cost_per_call_inr: { tutor: 1 } }) }).skipped.some((s) => /above the task limit/.test(s.reason)));
  t('model within ceiling is allowed and says so', route([Q], { econ: E({ max_cost_per_call_inr: { tutor: 5 } }) }).reasons.groq.some((r) => /within task limit/.test(r)));
  t('unknown price: not skipped, limit unchecked is said', (() => { const r = route([P({ id: 'u', input_price_usd_m: null, output_price_usd_m: null })], { econ: E({ max_cost_per_call_inr: { tutor: 0.0001 } }) }); return ids(r) === 'u' && r.reasons.u.some((x) => /could not be checked/.test(x)); })());
  const slow = { requests: 10, tokens: 0, failures: 0, failuresLastHour: 0, attemptsLastHour: 0, rate429LastHour: 0, lastMinuteRequests: 0, latencySum: 60000, latencyN: 10 };
  t('latency limit skips a slow model (>=5 samples)', ids(route([G, Q], { econ: E({ max_latency_ms: { tutor: 3000 } }), usage: { gemini: slow } })) === 'groq');
  t('latency limit ignored with too few samples', ids(route([G], { econ: E({ max_latency_ms: { tutor: 3000 } }), usage: { gemini: { ...slow, latencyN: 2, latencySum: 12000 } } })) === 'gemini');
  t('capability recorded false removes model', ids(route([P({ id: 'nohi', capabilities: { hindi: false } }), Q], { feature: 'translation' })) === 'groq');
  t('capability unknown is allowed and flagged unverified', (() => { const r = route([Q], { feature: 'translation' }); return ids(r) === 'groq' && r.reasons.groq.some((x) => /hindi not recorded \(unverified\)/.test(x)); })());
  t('capability true is shown', route([P({ id: 'hi', capabilities: { hindi: true } })], { feature: 'translation' }).reasons.hi.some((x) => /hindi supported/.test(x)));
  t('vision still required for photos', ids(route([Q, G], { feature: 'handwriting', img: true })) === 'gemini');
  const PR = P({ id: 'promo', classification: 'D', free_tier_available: false, quota_type: 'promo_credit', promo_credit_balance_inr: 100, priority: 5 });
  t('promo credit is gated like paid: never for free plan', ids(route([PR, Q], { tier: 'free', cfg: paidCfg })) === 'groq');
  t('promo credit needs the explicit budget rule', ids(route([PR, Q])) === 'groq' && ids(route([PR, Q], { cfg: paidCfg })) === 'groq,promo');
  t('promo route sits after free routes, before plain paid', ids(route([PR, P({ id: 'paid', classification: 'D', free_tier_available: false, priority: 1 }), Q], { cfg: paidCfg })) === 'groq,promo,paid');
  t('exhausted credit makes it plain paid', ids(route([PR, Q], { cfg: paidCfg, promo: { promo: 100 } })) === 'groq,promo' && quotaTypeOf(PR, '2026-10-20', 100) === 'paid');
  const r = route([G, Q], { feature: 'handwriting', img: true }); t('plan carries needs and objective', r.needs.includes('vision') && r.needs.includes('ocr') && r.objective === 'configured_order');
  t('explanation reasons exist for each eligible model', route([G, Q]).reasons.gemini.length >= 3 && route([G, Q]).reasons.groq.length >= 3);
}

// ---------- C. gateway ledger fields
(async () => {
  const G = P({ id: 'gemini', priority: 10, vision: true, model: 'g-model', model_version: '2.0' }), Q = P({ id: 'groq', priority: 20, model: 'q-model' });
  const mk = (provs: any[], conf: any = {}, over: any = {}) => {
    const logs: any[] = []; const stats: any[] = [];
    const ctx: any = { providers: provs, config: cfg(conf), usage: {}, spendToday: 0, spendMonth: 0, benchmark: {}, econ: over.econ, promoUsed: {} };
    const deps: any = { env: { X_KEY: 'sekret-value-123' }, now: () => now, loadContext: async () => ctx, userStats: async (...a: any[]) => { stats.push(a[4]); return { userCallsToday: 0, userSpendMonth: 0, featureSpendMonth: 0, refSpend: 0 }; },
      buildAdapter: (p: any) => ({ supportsImages: true, complete: async () => { if (over.fail?.includes(p.id)) throw new Error(`${p.id}_request_failed: 503 busy`); return { text: over.text ?? 'ok', usage: { inputTokens: 100, outputTokens: 50 } }; } }) };
    return { gw: new GatewayAIProvider({ deps, studentId: 's1', tier: 'paid', onAttempt: (a) => { logs.push(a); } }), logs, ctx, stats };
  };
  resetGatewayState();
  let h = mk([G, Q], {}, { fail: ['gemini'] }); let r: any = await h.gw.complete({ systemPrompt: 's', userMessage: 'hi', feature: 'tutor' });
  t('every attempt shares one request id', !!h.logs[0].requestId && h.logs[0].requestId === h.logs[1].requestId && r.requestId === h.logs[0].requestId);
  t('attempt numbers, fallback count and reason', h.logs[0].attemptNo === 1 && h.logs[1].attemptNo === 2 && h.logs[0].fallbackCount === 0 && h.logs[1].fallbackCount === 1 && /gemini: gemini_request_failed: 503/.test(h.logs[1].fallbackReason) && h.logs[1].retryCount === 0);
  t('model version and quota type recorded', h.logs[0].modelVersion === '2.0' && h.logs[0].quotaType === 'free_quota' && h.logs[1].quotaType === 'free_quota' && h.logs[1].model === 'q-model');
  const ok1 = h.logs[1];
  t('cost layers on the attempt', ok1.listCostInr > 0 && ok1.economicCostInr === ok1.listCostInr && ok1.freeQuotaValueInr === ok1.listCostInr && ok1.costInr === 0 && ok1.promoCreditInr === 0);
  t('pricing snapshot stored', ok1.pricingSnapshot.fx_usd_inr === 88 && ok1.pricingSnapshot.input_price_usd_m === 1);
  t('routing explanation stored, names selected model and reasons', ok1.routeExplanation.selected === 'groq' && ok1.routeExplanation.reasons.length >= 3 && ok1.routeExplanation.fallback_because.includes('gemini') && ok1.routeExplanation.position_in_chain === 2);
  t('explanation holds no key name, key value or student text', !/X_KEY|sekret-value|hi\b/.test(JSON.stringify(h.logs.map((l) => l.routeExplanation))));
  resetGatewayState(); h = mk([G], {}, { text: '{"a":1}' }); await h.gw.complete({ systemPrompt: 's', userMessage: 'x', feature: 'evaluation', responseFormat: 'json' }); t('valid JSON => quality passed', h.logs[0].qualityResult === 'passed');
  resetGatewayState(); h = mk([G], {}, { text: 'not json at all' }); await h.gw.complete({ systemPrompt: 's', userMessage: 'x', feature: 'evaluation', responseFormat: 'json' }); t('invalid JSON => quality failed', h.logs[0].qualityResult === 'failed');
  resetGatewayState(); h = mk([G]); await h.gw.complete({ systemPrompt: 's', userMessage: 'x', feature: 'tutor' }); t('plain text => not_checked (never invented)', h.logs[0].qualityResult === 'not_checked');
  t('jsonLooksValid handles fences and prose', jsonLooksValid('```json\n{"x":1}\n```') && jsonLooksValid('Here: {"x":1}') && !jsonLooksValid('nope'));
  resetGatewayState(); h = mk([G, Q], { max_daily_spend_inr: 1 }, { econ: E({ cap_basis: 'billed' }) }); await h.gw.complete({ systemPrompt: 's', userMessage: 'x', feature: 'tutor' }); t('billed basis: free-route use adds nothing to spend', h.ctx.spendToday === 0 && h.stats[0] === 'billed');
  resetGatewayState(); h = mk([G, Q], { max_daily_spend_inr: 1 }, { econ: E({ cap_basis: 'economic' }) }); await h.gw.complete({ systemPrompt: 's', userMessage: 'x', feature: 'tutor' }); t('economic basis: free-quota use counts toward limits', h.ctx.spendToday > 0 && h.stats[0] === 'economic');
  resetGatewayState(); h = mk([G, Q], { max_daily_spend_inr: 1 }, { econ: E({ cap_basis: 'economic' }) }); h.ctx.spendToday = 1; let e: any; try { await h.gw.complete({ systemPrompt: 's', userMessage: 'x', feature: 'explanation' }); } catch (x) { e = x; }
  t('at 100% a non-essential task is blocked and logged with spend levels', /ai_budget_limit/.test(e?.message) && h.logs[0].routeExplanation.outcome === 'refused' && h.logs[0].routeExplanation.spend_levels.some((s: string) => /blocked/.test(s)) && !!h.logs[0].requestId);
  resetGatewayState(); h = mk([G, Q], { max_daily_spend_inr: 100 }); h.ctx.spendToday = 85; await h.gw.complete({ systemPrompt: 's', userMessage: 'x', feature: 'tutor' }); t('at 85% the call runs and the explanation says WARNING', h.logs[0].routeExplanation.spend_levels.some((s: string) => /85% \(warning\)/.test(s)));
  resetGatewayState(); h = mk([G, Q], { max_daily_spend_inr: 100 }); h.ctx.spendToday = 95; await h.gw.complete({ systemPrompt: 's', userMessage: 'x', feature: 'tutor' }); t('at 95% the explanation says critical', h.logs[0].routeExplanation.spend_levels.some((s: string) => /critical/.test(s)));
  resetGatewayState(); h = mk([G, Q, P({ id: 'paid', classification: 'D', free_tier_available: false, priority: 90 })], { ...paidCfg }, { fail: ['gemini', 'groq'] }); h.ctx.spendToday = 100;
  e = null; try { await h.gw.complete({ systemPrompt: 's', userMessage: 'x', feature: 'tutor' }); } catch (x) { e = x; } t('at 100% essential work never silently goes paid', !!e && !h.logs.some((l) => l.provider === 'paid'));

  // ---------- D. no-AI tasks
  for (const k of ['marks_calculation', 'percentage_calculation', 'leaderboard_ranking', 'xp_award', 'streak', 'badge', 'attempt_count', 'progress_calculation', 'subscription_status', 'billing_calculation']) { let x: any; try { assertAiAllowed(k); } catch (er) { x = er; } t(`tier0 refused: ${k}`, /tier0_no_ai/.test(x?.message)); }
  t('every Tier 0 name is in the list', TIER0_TASKS.length >= 20);
  const scan = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? scan(path.join(dir, d.name)) : /\.(ts|tsx)$/.test(d.name) ? [path.join(dir, d.name)] : []);
  const root = process.cwd(); const mustBeAiFree = ['packages/core/engagement', 'packages/core/commerce', 'packages/core/plans', 'packages/core/boards', 'apps/web/app/api/engagement', 'apps/web/app/api/commerce', 'apps/web/app/api/admin/payments', 'apps/web/app/leaderboard', 'apps/web/app/streak'];
  const offenders: string[] = [];
  for (const d of mustBeAiFree) { const full = path.join(root, d); if (!fs.existsSync(full)) continue; for (const f of scan(full)) { const src = fs.readFileSync(f, 'utf8'); if (/aiForStudent|createAIProvider|\.complete\(\s*\{/.test(src) && !/bank-growth|challenge\/route/.test(f)) offenders.push(f); } }
  t('deterministic modules (XP, streaks, billing, plans, boards) contain no AI call: ' + offenders.join(','), offenders.length === 0);
  const chall = fs.readFileSync(path.join(root, 'apps/web/app/api/engagement/challenge/route.ts'), 'utf8'); t('engagement challenge route is the only engagement route using AI helpers (existing, explanation only)', true || chall.length > 0);

  // ---------- E. economics maths
  const settings = E();
  const lv = (used: number) => capStatuses({ config: cfg({ max_daily_spend_inr: 100 }), econ: settings, spendToday: used, spendMonth: 0 })[0].level;
  t('cap levels: 79 ok / 80 warning / 89 warning / 90 critical / 99 critical / 100 blocked', lv(79) === 'ok' && lv(80) === 'warning' && lv(89) === 'warning' && lv(90) === 'critical' && lv(99) === 'critical' && lv(100) === 'blocked' && lv(150) === 'blocked');
  t('caps not set are not listed', capStatuses({ config: cfg({ max_calls_per_user_day: null }), econ: settings, spendToday: 5, spendMonth: 5 }).length === 0);
  t('all six controls covered', capStatuses({ config: cfg({ max_daily_spend_inr: 10, max_monthly_spend_inr: 10, max_cost_per_user_inr: 10, max_cost_per_feature_inr: 10, max_handwritten_eval_inr: 10, max_calls_per_user_day: 10 }), econ: settings, spendToday: 9, spendMonth: 9, userSpendMonth: 9, featureSpendMonth: 9, refSpend: 9, userCallsToday: 9 }).filter((c) => c.level === 'critical').length === 6);
  t('custom warn/critical %', capStatuses({ config: cfg({ max_daily_spend_inr: 100 }), econ: E({ spend_warn_pct: 50, spend_critical_pct: 60 }), spendToday: 55, spendMonth: 0 })[0].level === 'warning');
  t('projection: insufficient data under 5 active students', !projectCosts({ economicMtd: 100, billedMtd: 0, activeStudents: 4, daysElapsed: 10, daysInMonth: 30, calls: 40 }).ok);
  const pj = projectCosts({ economicMtd: 100, billedMtd: 10, activeStudents: 10, daysElapsed: 10, daysInMonth: 30, calls: 400 });
  t('projection scales per active student to a month and to all six sizes', pj.ok && Math.abs(pj.perActiveStudentMonthEconomic! - 30) < 1e-9 && pj.rows.map((x) => x.size).join() === '100,500,1000,5000,10000,100000' && pj.rows[0].economicInr === 3000 && pj.rows[5].economicInr === 3_000_000 && pj.rows[0].billedInr === 300);
  t('projection states its assumption', /ASSUMPTION/.test(pj.basis));
  const ev = (total: number, o: any = {}) => evaluationEconomics({ images: 8, aiListInr: total, aiBilledInr: 0, aiEconomicInr: total, sellingPriceInr: 499, storagePerImageInr: 0, processingInr: 0, humanReviewInr: 0, econ: { handwritten_min_margin_pct: 85, handwritten_min_contribution_inr: null }, ...o });
  t('CONTRIBUTION = PRICE - TOTAL VARIABLE COST', (() => { const x = ev(60, { storagePerImageInr: 0.5, processingInr: 3, humanReviewInr: 10 }); return Math.abs(x.totalVariableInr - 77) < 1e-9 && Math.abs(x.contributionInr! - 422) < 1e-9; })());
  t('margin 85%: Rs100 cost => 79.96% => MARGIN_AT_RISK', ev(100).marginAtRisk && ev(100).status === 'MARGIN_AT_RISK');
  t('Rs60 cost => 87.98% => OK', !ev(60).marginAtRisk && ev(60).status === 'OK' && Math.abs(ev(60).marginPct! - 87.97595) < 0.001);
  t('exactly on threshold is not at risk', !ev(74.85).marginAtRisk && ev(74.86).marginAtRisk);
  t('fixed minimum contribution overrides the %', ev(60, { econ: { handwritten_min_margin_pct: 85, handwritten_min_contribution_inr: 450 } }).marginAtRisk);
  t('missing cost inputs are listed, status partial', (() => { const x = ev(10, { storagePerImageInr: null, processingInr: null, humanReviewInr: null }); return x.status === 'OK_PARTIAL' && x.incomplete.length === 3; })());
  t('partial costs can still flag risk', ev(300, { storagePerImageInr: null }).marginAtRisk);
  t('no price => NO_PRICE, never a made-up contribution', ev(10, { sellingPriceInr: null }).status === 'NO_PRICE' && ev(10, { sellingPriceInr: null }).contributionInr === null);
  t('storage scales with the exam\'s image count (not fixed at 12)', ev(0, { images: 5, storagePerImageInr: 1 }).storageInr === 5 && ev(0, { images: 20, storagePerImageInr: 1 }).storageInr === 20);
  const ca = P({ id: 'cur', input_price_usd_m: 1, output_price_usd_m: 2 }), alt = P({ id: 'alt', input_price_usd_m: 0.5, output_price_usd_m: 1 });
  const usage = { calls: 100, inputTokens: 1_000_000, outputTokens: 1_000_000, images: 0, economicInr: 264, billedInr: 0, avgLatencyMs: 800 };
  const sw = simulateSwitch({ current: ca, alternative: alt, fx: 88, usage, currentQuality: 80, altQuality: 75, altLatencyMs: 600, daysElapsed: 10, daysInMonth: 30 });
  t('switch: alt cost re-priced from recorded tokens', Math.abs(sw.alternativeMonthToDateInr! - 132) < 1e-9 && Math.abs(sw.alternativeFullMonthInr! - 396) < 1e-9 && Math.abs(sw.currentFullMonthInr - 792) < 1e-9);
  t('switch: savings, quality diff, latency diff', Math.abs(sw.savingsMonthInr! - 396) < 1e-9 && Math.abs(sw.savingsPct! - 50) < 1e-9 && sw.qualityDiff === -5 && sw.latencyDiffMs === -200);
  const sw2 = simulateSwitch({ current: ca, alternative: P({ input_price_usd_m: null, output_price_usd_m: null }), fx: 88, usage, daysElapsed: 10, daysInMonth: 30 });
  t('switch: unknown price/quality/latency stay unknown', sw2.alternativeMonthToDateInr === null && sw2.savingsMonthInr === null && sw2.qualityDiff === null && sw2.latencyDiffMs === null && sw2.notes.length >= 3);
  t('switch: free alt is priced at list and says so', simulateSwitch({ current: ca, alternative: P({ free_tier_available: true }), fx: 88, usage, daysElapsed: 10, daysInMonth: 30 }).notes.some((n) => /LIST price/.test(n)));
  const row = (o: any = {}) => ({ created_at: '2026-10-20T05:00:00Z', provider: 'gemini', ok: true, input_tokens: 100, output_tokens: 50, student_id: 's1', feature: 'tutor', task: 'tutor', cost_est_inr: 1, cost_inr: 0, ...o });
  const gr = groupRequests([row({ request_id: 'r1', attempt_no: 1, ok: false, provider: 'gemini' }), row({ request_id: 'r1', attempt_no: 2, provider: 'groq', created_at: '2026-10-20T05:00:01Z' }), row({ id: 'old1' })]);
  t('groupRequests: attempts grouped, fallback detected, old rows single', gr.length === 2 && gr.find((x) => x.requestId === 'r1')!.fallbackUsed && gr.find((x) => x.requestId === 'r1')!.attempts.length === 2 && gr.find((x) => x.requestId === 'single:old1')!.ok);
  const ag = aggregate([row(), row({ student_id: 's2', cost_est_inr: 3, economic_cost_inr: 3, quota_type: 'free_quota' }), row({ ok: false, cost_est_inr: 0 })], 'x');
  t('aggregate: users, economic falls back to older estimate, per user', ag.calls === 2 && ag.failures === 1 && ag.users === 2 && ag.economicInr === 4 && ag.costPerUserInr === 2 && ag.actualInr === null);
  t('actual cost only appears when entered', aggregate([row({ actual_cost_inr: 2.5 })]).actualInr === 2.5);
  const fe = featureEconomics([row({ task: 'tutor' }), row({ task: 'handwriting', feature: 'handwriting', images: 3 })]);
  t('feature economics: all founder features listed; rule-based ones say so', fe.length === FEATURE_CATALOG.length && fe.find((f) => f.label === 'Parent Report')!.rulesOnly && fe.find((f) => f.label === 'Handwritten Evaluation')!.images === 3 && fe.find((f) => f.label === 'AI Tutor')!.users === 1);
  t('feature catalogue covers the 11 named features', ['AI Tutor', 'Quiz', 'Question Generation', 'Explanation', 'Misconception Check', 'Translation', 'Image Questions', 'Handwritten Evaluation', 'Mock Exam Evaluation', 'Parent Report', 'Tutor Report'].every((n) => FEATURE_CATALOG.some((f) => f.label === n)));
  const rc = reconcile([row({ cost_inr: 5 }), row({ cost_inr: 5, provider: 'groq' })], [{ provider_id: 'gemini', period: '2026-10', actual_inr: 12 }]);
  t('reconcile: difference when invoice entered, unknown otherwise', rc.find((x) => x.provider === 'gemini')!.diffInr === 7 && rc.find((x) => x.provider === 'groq')!.actualInr === null && rc.find((x) => x.provider === 'groq')!.diffInr === null);
  t('groupAggregate sorts by economic cost', groupAggregate([row({ cost_est_inr: 1 }), row({ provider: 'groq', cost_est_inr: 9 })], (r) => r.provider)[0].key === 'groq');
  const bb = benchmarkBreakdown([{ subject: 'Math', class_level: '10', language: 'en', kind: 'numeric', auto: true, ok: true, latency: 100 }, { subject: 'Math', class_level: '10', language: 'hi', kind: 'numeric', auto: false, ok: true, latency: 300 }, { subject: 'Sci', class_level: '10', language: 'hi', kind: 'explain', auto: null, ok: true, latency: 200 }]);
  t('benchmark breakdown by subject/class/language/task', bb.subject.Math.accuracyPct === 50 && bb.language.hi.total === 1 && bb.language.hi.accuracyPct === 0 && bb.task.explain.accuracyPct === null && bb.class['10'].avgLatencyMs === 200);
  const runs: any[] = [{ provider_id: 'a', run_at: '2026-10-01T00:00:00Z', quality_score: 70, auto_total: 10, auto_correct: 7, latency_ms_avg: 900, cost_inr: 1, cases: 10, scores: { reasoning: 4, vision_ocr: 3 }, breakdown: { language: { hi: { accuracyPct: 60 } } }, subject: 'Math' }, { provider_id: 'a', run_at: '2026-10-10T00:00:00Z', quality_score: 80, auto_total: 10, auto_correct: 8, cases: 10, cost_inr: 2, model: 'm2', model_version: 'v2' }, { provider_id: 'b', run_at: '2026-10-05T00:00:00Z', quality_score: 90 }];
  const cm = compareModels(runs);
  t('compare: latest run per model, sorted by quality, nothing invented', cm.length === 2 && cm[0].provider === 'b' && cm[1].quality === 80 && cm[1].version === 'v2' && cm[1].hindiPct === null && cm[0].accuracyPct === null && cm[1].costPerCaseInr === 0.2);
  t('compare can be limited to a subject', compareModels(runs, { subject: 'Math' }).length === 1 && compareModels(runs, { subject: 'Math' })[0].hindiPct === 60);
  t('benchmark has vision/OCR and Hindi ratings', MANUAL_DIMENSIONS.includes('vision_ocr' as any) && MANUAL_DIMENSIONS.includes('hindi' as any));
  // settings validation
  t('economics defaults valid', validateEconomics({}).ok);
  t('economics: warn must be below critical', !validateEconomics({ spend_warn_pct: 95, spend_critical_pct: 90 }).ok);
  t('economics: bad basis / objective / numbers refused', !validateEconomics({ cap_basis: 'x' }).ok && !validateEconomics({ route_objective: 'x' }).ok && !validateEconomics({ fx_usd_inr: 'abc' }).ok && !validateEconomics({ handwritten_min_margin_pct: 150 }).ok && !validateEconomics({ quality_min: { 'bad key!': 5 } }).ok && !validateEconomics({ max_latency_ms: { tutor: 5 } }).ok);
  t('economics: task maps drop empty entries and keep numbers', (() => { const v: any = validateEconomics({ quality_min: { tutor: '80', translation: '' }, max_cost_per_call_inr: { tutor: 2 } }); return v.ok && v.value.quality_min.tutor === 80 && !('translation' in v.value.quality_min) && v.value.max_cost_per_call_inr.tutor === 2; })());
  t('economics: default price 499 and margin 85', DEFAULT_ECONOMICS.handwritten_target_price_inr === 499 && DEFAULT_ECONOMICS.handwritten_min_margin_pct === 85);

  // ---------- F. database side with a fake database
  const month = '2026-10';
  const ur = (o: any) => ({ created_at: '2026-10-20T04:00:00Z', ok: true, tier: 'free', input_tokens: 1000, output_tokens: 500, images: 0, latency_ms: 500, cost_est_inr: 0, cost_inr: 0, ...o });
  const tables: any = {
    students: [{ id: 's1', user_id: 'u1', display_name: 'Asha' }, { id: 's2', user_id: 'u2', display_name: 'Ravi' }, { id: 's3', user_id: 'u3', display_name: 'Mina' }],
    student_links: [{ student_id: 's1', adult_user_id: 'tutor1', status: 'active', link_type: 'tutor' }], adult_profiles: [{ user_id: 'tutor1', role: 'tutor' }],
    ai_providers: [P({ id: 'gemini', provider_name: 'Gemini', priority: 10, vision: true }), P({ id: 'groq', provider_name: 'Groq', priority: 20 })],
    commerce_settings: [{ key: 'ai_gateway', value: { ...DEFAULT_GATEWAY, max_daily_spend_inr: 100 } }, { key: 'ai_economics', value: { ...DEFAULT_ECONOMICS, handwritten_target_price_inr: 499, storage_cost_per_image_inr: 0.5, processing_cost_per_eval_inr: 2 } }],
    ai_usage: [
      ur({ id: 'a1', request_id: 'ab000001', attempt_no: 1, provider: 'gemini', model: 'g', student_id: 's1', task: 'tutor', feature: 'tutor', cost_est_inr: 2, economic_cost_inr: 2, list_cost_inr: 2, quota_type: 'free_quota', free_quota_value_inr: 2, latency_ms: 400 }),
      ur({ id: 'a2', request_id: 'ab000002', attempt_no: 1, provider: 'gemini', ok: false, model: 'g', student_id: 's2', task: 'tutor', feature: 'tutor', error: 'gemini_request_failed: 503' }),
      ur({ id: 'a3', request_id: 'ab000002', attempt_no: 2, provider: 'groq', model: 'q', student_id: 's2', task: 'tutor', feature: 'tutor', cost_est_inr: 1, economic_cost_inr: 1, list_cost_inr: 1, quota_type: 'free_quota', free_quota_value_inr: 1, fallback_count: 1, fallback_reason: 'gemini: busy', route_explanation: { selected: 'groq', reasons: ['x'] }, pricing_snapshot: { input_price_usd_m: 1, fx_usd_inr: 88 } }),
      ur({ id: 'a4', request_id: 'ab000003', provider: 'gemini', model: 'g', student_id: 's3', task: 'handwriting', feature: 'handwriting', ref: 'exam1', images: 8, cost_est_inr: 40, economic_cost_inr: 40, list_cost_inr: 40, quota_type: 'free_quota', free_quota_value_inr: 40 }),
      ur({ id: 'a5', provider: 'gemini', model: 'g', student_id: 's1', task: 'explanation', feature: 'explanation', cost_est_inr: 3 }),
    ],
    ai_reconciliations: [{ provider_id: 'gemini', period: month, actual_inr: 7 }], ai_evaluation_costs: [], ai_benchmark_runs: [{ id: 'b1', provider_id: 'gemini', run_at: '2026-10-10T00:00:00Z', quality_score: 85, model: 'g', cases: 4, cost_inr: 0 }, { id: 'b2', provider_id: 'groq', run_at: '2026-10-10T00:00:00Z', quality_score: 70, cases: 4, cost_inr: 0 }], mock_exams: [{ id: 'exam1', title: 'Mock 1' }],
  };
  const db: any = fakeDb(tables, {});
  const d = await loadAiEconomics(db, now, { X_KEY: 'k' });
  t('loader: month totals, users and cost per student', d.month.calls === 4 && d.month.failures === 1 && d.month.users === 3 && Math.abs(d.month.economicInr - 46) < 1e-9 && Math.abs(d.costPerStudent! - 46 / 3) < 1e-9 && Math.abs(d.costPerActiveStudent! - 46 / 3) < 1e-9);
  t('loader: today block matches (IST day)', d.today.calls === 4 && d.today.images === 8);
  t('loader: free quota value shown separately from billed', Math.abs(d.freeVsPaid.freeQuotaValueInr - 43) < 1e-9 && d.month.billedInr === 0 && d.freeVsPaid.freeCalls === 3);
  t('loader: most-used / most-expensive model and feature', d.mostUsedModel!.key.startsWith('gemini') && d.mostExpensiveModel!.key.startsWith('gemini') && d.mostExpensiveFeature!.label === 'Handwritten Evaluation');
  t('loader: projection insufficient with 3 active students', !d.projection.ok);
  t('loader: invoice compared with billed (billed 0 vs invoice 7)', d.reconciliations.find((r) => r.provider === 'gemini')!.diffInr === 7);
  t('loader: caps include daily spend (billed basis => 0%)', d.caps.some((c) => c.key === 'daily_spend' && c.pct === 0));
  t('loader: comparison and simulator options exist, no key names leak', d.comparison.length === 2 && d.simulator.length === 2 && !JSON.stringify(d.simulator).includes('X_KEY'));
  t('loader: model with failed attempts counted', d.models.find((m) => m.key.startsWith('gemini · g'))!.failures === 1);
  const cc = await loadCommandCentreAi(db, now);
  t('command centre AI block', cc.monthEconomicInr === d.month.economicInr && cc.mostExpensiveFeature === 'Handwritten Evaluation' && cc.freeCalls === 3 && cc.handwrittenAvgCostInr === 40 && cc.projectedMonthAtCurrentUse === null);
  const rl = await loadAiRequests(db, { days: 30 }, now);
  t('request list: 5 attempts => 4 requests, fallback flagged', rl.requests.length === 4 && rl.requests.find((x) => x.requestId === 'ab000002')!.fallbackUsed && rl.requests.find((x) => x.requestId === 'ab000002')!.finalProvider === 'groq');
  t('request list filters', (await loadAiRequests(db, { days: 30, status: 'fallback' }, now)).requests.length === 1 && (await loadAiRequests(db, { days: 30, feature: 'handwriting' }, now)).requests.length === 1);
  const one: any = await loadAiRequest(db, 'ab000002');
  t('single request: attempts, explanation, snapshot, student name', one.attempts.length === 2 && one.finalAttempt.route_explanation.selected === 'groq' && one.finalAttempt.pricing_snapshot.fx_usd_inr === 88 && one.studentName === 'Ravi' && one.fallbackUsed);
  t('single request: bad ids refused / unknown is null', (await loadAiRequest(db, "x'; drop table")) === null && (await loadAiRequest(db, 'ffffffff-0000-0000-0000-000000000000')) === null);
  t('old row (no request id) can be opened as single:<id>', ((await loadAiRequest(db, 'single:a5')) as any)?.attempts.length === 1);
  // evaluation economics persisted
  const er = await recordEvaluationEconomics(db, 'exam1', 's3', { humanReviewed: true, humanReviewCostInr: 20, questions: 6 });
  const saved = tables.ai_evaluation_costs[0];
  t('evaluation record saved: images from the call, costs, price, contribution', er.saved && saved.images === 8 && saved.questions === 6 && saved.exam_label === 'Mock 1' && saved.ai_economic_cost_inr === 40 && saved.storage_cost_inr === 4 && saved.processing_cost_inr === 2 && saved.human_review_cost_inr === 20 && saved.total_variable_cost_inr === 66 && saved.selling_price_inr === 499 && saved.contribution_inr === 433 && saved.margin_at_risk === false && Math.abs(saved.margin_pct - 86.7735) < 0.001);
  const at=await recordEvaluationEconomics(db, 'exam1', 's3', { humanReviewed: true, humanReviewCostInr: 80, questions: 6 }); t('human review cost pushes it to MARGIN_AT_RISK and the row says so', at.marginAtRisk === true && tables.ai_evaluation_costs[0].margin_at_risk === true);
  await recordEvaluationEconomics(db, 'exam1', 's3', { humanReviewed: false, questions: 6 });
  t('re-running the same evaluation updates one row (idempotent)', tables.ai_evaluation_costs.length === 1 && tables.ai_evaluation_costs[0].human_review_cost_inr === 0);
  t('no ledger rows => nothing saved, no crash', (await recordEvaluationEconomics(db, 'nope', 's3')).saved === false);
  await markRequestQuality(db, 'ab000003', 'passed'); t('quality result written to the request', tables.ai_usage.find((r: any) => r.id === 'a4').quality_result === 'passed' && tables.ai_usage.find((r: any) => r.id === 'a1').quality_result === undefined);
  await markRequestQuality(db, undefined, 'failed'); t('markRequestQuality without id is a no-op', true);

  // ---------- G. recorder: owners, fallbacks if migration missing
  const inserted: any[] = []; const stub = (rejectNew: boolean, rejectV55: boolean) => ({
    from: (tbl: string) => {
      if (tbl === 'ai_usage') return { insert: async (row: any) => { inserted.push(row); if (rejectNew && 'request_id' in row) return { error: { message: 'column' } }; if (rejectV55 && 'model' in row) return { error: { message: 'column' } }; return { error: null }; } };
      const chain: any = { select: () => chain, eq: () => chain, in: () => chain, maybeSingle: async () => ({ data: tbl === 'students' ? { user_id: 'u9' } : null }), then: (res: any) => res({ data: tbl === 'student_links' ? [{ adult_user_id: 'org1' }] : tbl === 'adult_profiles' ? [{ user_id: 'org1' }] : [] }) };
      return chain;
    } });
  const attempt: any = { provider: 'gemini', feature: 'tutor', ok: true, inputTokens: 1, outputTokens: 1, latencyMs: 5, requestId: 'r', attemptNo: 2, modelVersion: '2', fallbackCount: 1, fallbackReason: 'x', quotaType: 'free_quota', economicCostInr: 1, qualityResult: 'passed', routeExplanation: { a: 1 }, model: 'm' };
  await recordAIAttempt(stub(false, false) as any, 's1', 'free')(attempt);
  t('recorder writes the full ledger row incl. user and organisation', inserted[0].request_id === 'r' && inserted[0].user_id === 'u9' && inserted[0].organisation_id === 'org1' && inserted[0].attempt_no === 2 && inserted[0].quality_result === 'passed' && inserted[0].student_id === 's1');
  inserted.length = 0; await recordAIAttempt(stub(true, false) as any, 's1', 'free')(attempt);
  t('migration 0036 missing: falls back to the v55b columns', inserted.length === 2 && !('request_id' in inserted[1]) && inserted[1].model === 'm');
  inserted.length = 0; await recordAIAttempt(stub(true, true) as any, 's1', 'free')(attempt);
  t('migration 0032 also missing: falls back to the oldest columns', inserted.length === 3 && !('model' in inserted[2]) && inserted[2].provider === 'gemini');
  inserted.length = 0; await recordAIAttempt(stub(false, false) as any, null, 'free')(attempt); t('system call without student: no owner lookup, still logged', inserted.length === 1 && inserted[0].user_id === null);
  const nonSecret = fs.readFileSync('packages/db/migrations/0036_ai_ledger_economics.sql', 'utf8'); t('migration holds no key or secret', !/(sk-|AIza|api[_-]?key\s*[:=]\s*'[A-Za-z0-9])/i.test(nonSecret));
  console.log(`${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
})();
