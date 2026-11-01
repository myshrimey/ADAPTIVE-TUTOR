import { requiredRevenue, customersNeeded, presetGrid, combination, gapToTarget, handwrittenCalculator, breakEvenCustomers, cleanSim, DEFAULT_SIM, ZERO_COUNTS, unitContribution, inr, lakh, handwrittenCostPerEval, loadSim, saveSim,
  cleanExamSession, saveExamSession, createCurriculumVersion, moveCurriculumVersion, canMoveCurriculum, cleanCountryPrice, saveCountryPrice, priceForCountry, writeAudit, listAudit, cleanRegion } from '../packages/core/index';
import { fakeDb } from './fakedb2';
let ok = 0, bad = 0; const t = (n: string, c: boolean) => { c ? ok++ : (bad++, console.log('FAIL', n)); };
const near = (a: number | null, b: number, e = 0.011) => a !== null && Math.abs(a - b) <= e;
(async () => {
  // the founder's own table: Rs 10 lakh net profit
  const T = 1000000;
  t('10% -> 1 crore', requiredRevenue(T, 10) === 10000000);
  t('20% -> 50 lakh', requiredRevenue(T, 20) === 5000000);
  t('30% -> 33.33 lakh', near(requiredRevenue(T, 30), 3333333.33));
  t('50% -> 20 lakh', requiredRevenue(T, 50) === 2000000);
  t('60% -> 16.67 lakh', near(requiredRevenue(T, 60), 1666666.67));
  t('70% -> 14.29 lakh', near(requiredRevenue(T, 70), 1428571.43));
  t('80% -> 12.5 lakh', requiredRevenue(T, 80) === 1250000);
  t('zero margin / negative target', requiredRevenue(T, 0) === null && requiredRevenue(-1, 50) === null);
  t('2,000 students at Rs 1,000 and 50%', customersNeeded(requiredRevenue(T, 50), 1000) === 2000);
  t('tutors at 3,000 / centres at 10,000', customersNeeded(requiredRevenue(T, 50), 3000) === 667 && customersNeeded(requiredRevenue(T, 50), 10000) === 200);
  t('no arpu -> insufficient', customersNeeded(2000000, 0) === null);
  t('grid size 5x7', presetGrid(1000).length === 35 && presetGrid(1000).find((r) => r.target === 100000 && r.margin === 50)!.customers === 200);
  t('Rs 500 arpu doubles it', customersNeeded(2000000, 500) === 4000);
  // combination
  const S = cleanSim({ arpuStudent: 1000, arpuTutor: 3000, arpuCentre: 10000, aiCostStudent: 100, aiCostTutor: 300, aiCostCentre: 1000, paymentFeePct: 2, monthlyOperating: 100000, monthlyMarketing: 50000, otherFixed: 0, taxReservePct: 10, targetNetProfit: 1000000 });
  const c = combination(S, { students: 1000, tutors: 100, centres: 20, schools: 0, handwrittenMocks: 0, otherRevenue: 0 });
  t('revenue', c.revenue === 1000 * 1000 + 100 * 3000 + 20 * 10000);   // 1,500,000
  t('ai cost', c.aiCost === 100000 + 30000 + 20000);
  t('payment fees', c.paymentCost === 30000);
  t('fixed', c.fixedCost === 150000);
  t('pre-tax', c.preTaxProfit === 1500000 - 150000 - 30000 - 150000);   // 1,170,000
  t('tax 10%', c.tax === 117000 && c.netProfit === 1053000);
  t('net margin', near(c.netMarginPct, 70.2, 0.05));
  const loss = combination(S, ZERO_COUNTS); t('loss gives no tax reserve', loss.preTaxProfit === -150000 && loss.tax === 0 && loss.netProfit === -150000 && loss.netMarginPct === null);
  // gap
  const g0 = gapToTarget(S, { ...ZERO_COUNTS, students: 500 }, 1000000);
  t('gap not reached', !g0.reached && g0.shortfall > 0 && g0.suggestions.length >= 3);
  t('every suggestion really reaches the target', g0.suggestions.every((x) => x.resultingNetProfit >= 1000000 - 0.5));
  t('suggestions are minimal (one fewer fails)', (() => { const x = g0.suggestions[0]; const n = (x.add.students as number); return combination(S, { ...ZERO_COUNTS, students: 500 + n - 1 }).netProfit < 1000000; })());
  t('already reached', gapToTarget(S, { ...ZERO_COUNTS, students: 5000 }, 1000000).reached);
  const bad0 = gapToTarget(cleanSim({ arpuStudent: 100, aiCostStudent: 200, arpuTutor: 100, aiCostTutor: 200, arpuCentre: 100, aiCostCentre: 200 }), ZERO_COUNTS, 1000);
  t('no positive contribution -> explained', bad0.suggestions.length === 0 && !!bad0.note);
  // break-even
  t('break-even students', breakEvenCustomers(S, 'student') === Math.ceil(150000 / (1000 * 0.98 - 100)));
  t('break-even none when unit loses money', breakEvenCustomers(cleanSim({ arpuStudent: 100, aiCostStudent: 500 }), 'student') === null);
  // handwritten
  const H = cleanSim({ handwrittenPrice: 499, handwrittenImages: 10, visionCostPerImage: 3, reasoningCostPerEval: 20, storageCostPerEval: 2, humanCostPerEval: 30, otherCostPerEval: 0, paymentFeePct: 2 });
  const hw = handwrittenCalculator(H);
  t('hw cost', handwrittenCostPerEval(H) === 82 && hw.costPerEval === 82);
  t('hw contribution', near(hw.contributionPerEval, 499 - 82 - 9.98) && hw.positive && !hw.incomplete);
  t('hw scenarios', hw.scenarios.length === 6 && hw.scenarios[0].volume === 100 && near(hw.scenarios[5].contribution, 5000 * (499 - 82 - 9.98), 1));
  t('hw no cost entered flagged', handwrittenCalculator(DEFAULT_SIM).incomplete);
  t('hw negative flagged', !handwrittenCalculator(cleanSim({ handwrittenPrice: 100, visionCostPerImage: 50, handwrittenImages: 5 })).positive);
  // clean
  const dirty = cleanSim({ arpuStudent: -5, arpuTutor: 'abc', paymentFeePct: 900, taxReservePct: 99, foo: 1 });
  t('clean clamps and defaults', dirty.arpuStudent === 0 && dirty.arpuTutor === 3000 && dirty.paymentFeePct === 50 && dirty.taxReservePct === 60 && !('foo' in dirty));
  t('inr/lakh', inr(1234567) === '₹12,34,567' && inr(null) === 'Insufficient data' && inr(-500) === '-₹500' && lakh(2000000) === '₹20 lakh' && lakh(10000000) === '₹1 crore');
  // persistence
  const db = fakeDb({ commerce_settings: [] }, { unique: { commerce_settings: [['key']] } });
  await saveSim(db, { arpuStudent: 750 }); t('save and load sim', (await loadSim(db)).arpuStudent === 750 && (await loadSim(db)).arpuTutor === 3000);
  // exam sessions
  t('exam ok', cleanExamSession({ academic_year: '2026-27', class_level: '10', session_label: 'Board exam 1', start_date: '', subjects: 'Maths, Science', rules: '{"duration_minutes":180}' }).rules.duration_minutes === 180);
  const bads = [{ academic_year: '2026', class_level: '10', session_label: 'x' }, { academic_year: '2026-27', class_level: '', session_label: 'x' }, { academic_year: '2026-27', class_level: '10', session_label: '' }, { academic_year: '2026-27', class_level: '10', session_label: 'x', start_date: '15/02/2027' }, { academic_year: '2026-27', class_level: '10', session_label: 'x', start_date: '2027-03-01', end_date: '2027-02-01' }, { academic_year: '2026-27', class_level: '10', session_label: 'x', rules: '{bad' }];
  t('exam rejects bad input', bads.every((b) => { try { cleanExamSession(b as any); return false; } catch { return true; } }));
  const d2 = fakeDb({ exam_sessions: [], curriculum_versions: [], country_prices: [], audit_logs: [] }, { unique: { country_prices: [['country', 'product_code']] }, defaults: { curriculum_versions: { status: 'draft' }, exam_sessions: { start_date: null } } });
  const eid = await saveExamSession(d2, { academic_year: '2026-27', class_level: '10', session_label: 'Board exam 2', status: 'published' }); t('exam saved', d2._tables.exam_sessions.length === 1 && d2._tables.exam_sessions[0].start_date === null);
  // curriculum workflow
  const vid = await createCurriculumVersion(d2, { academic_year: '2026-27', class_level: '10', subject_label: 'Mathematics' });
  const vid2 = await createCurriculumVersion(d2, { academic_year: '2026-27', class_level: '10', subject_label: 'Mathematics' });
  t('version numbers go up', d2._tables.curriculum_versions[0].version === 1 && d2._tables.curriculum_versions[1].version === 2);
  t('transitions', canMoveCurriculum('draft', 'needs_review') && !canMoveCurriculum('draft', 'published') && !canMoveCurriculum('needs_review', 'published') && canMoveCurriculum('approved', 'published') && !canMoveCurriculum('published', 'draft'));
  const rejects = async (f: () => Promise<any>) => { try { await f(); return false; } catch { return true; } };
  t('cannot skip to published', await rejects(() => moveCurriculumVersion(d2, vid, 'published', 'a@b')));
  await moveCurriculumVersion(d2, vid, 'needs_review', 'a@b');
  t('cannot approve without a source', await rejects(() => moveCurriculumVersion(d2, vid, 'approved', 'a@b')));
  d2._tables.curriculum_versions[0].source_reference = 'CBSE syllabus 2026-27';
  await moveCurriculumVersion(d2, vid, 'approved', 'founder@x'); t('approved records who and when', d2._tables.curriculum_versions[0].status === 'approved' && d2._tables.curriculum_versions[0].approved_by === 'founder@x' && !!d2._tables.curriculum_versions[0].approved_at);
  await moveCurriculumVersion(d2, vid, 'published', 'founder@x'); t('published', d2._tables.curriculum_versions[0].status === 'published');
  // country prices
  t('price cleans', cleanCountryPrice({ country: 'United Arab Emirates', currency: 'aed', product_code: 'x', price: '99.456', tax_pct: 5 }).price === 99.46);
  t('price rejects', [{ country: '', currency: 'USD', product_code: 'x', price: 1 }, { country: 'a', currency: 'US', product_code: 'x', price: 1 }, { country: 'a', currency: 'USD', product_code: 'x', price: -1 }, { country: 'a', currency: 'USD', product_code: 'x', price: 1, tax_pct: 99 }].every((b) => { try { cleanCountryPrice(b as any); return false; } catch { return true; } }));
  await saveCountryPrice(d2, { country: 'Qatar', currency: 'USD', product_code: 'plan1', price: 30, tax_pct: 0, active: false });
  t('inactive price not used', (await priceForCountry(d2, 'Qatar', 'plan1')) === null);
  await saveCountryPrice(d2, { country: 'Qatar', currency: 'USD', product_code: 'plan1', price: 30, tax_pct: 5, active: true });
  const pf = await priceForCountry(d2, 'Qatar', 'plan1'); t('price with tax, upsert not duplicate', pf!.total === 31.5 && d2._tables.country_prices.length === 1);
  t('no price for other country', (await priceForCountry(d2, 'Oman', 'plan1')) === null);
  // audit
  await writeAudit(d2, { actorEmail: 'a@b', action: 'save', entity: 'x', detail: { password: 'secret', apiKey: 'k', answer: 'a', prompt: 'p', ok: 'fine', long: 'z'.repeat(500) } });
  const a = d2._tables.audit_logs[0]; t('audit keeps safe fields only', a.detail.ok === 'fine' && !('password' in a.detail) && !('apiKey' in a.detail) && !('answer' in a.detail) && !('prompt' in a.detail) && a.detail.long.length === 200);
  t('audit list', (await listAudit(d2)).length === 1);
  // region
  t('region', cleanRegion({ country: 'Qatar', timezone: 'Asia/Qatar' }).currency === 'QAR' && cleanRegion({ country: 'Narnia' }).currency === null && cleanRegion({ country: 'India', currency: 'usd' }).currency === 'USD');
  t('region rejects bad timezone', (() => { try { cleanRegion({ timezone: '<script>' }); return false; } catch { return true; } })());
  console.log(`t61: ${ok} ok, ${bad} failed`);
})();
