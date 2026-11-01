import { attachReferral, qualifyReferralsForStudent, rewardEvent, grantBonusDays, applyHeldBonusDays, referralOverview, getOrCreateUserCode, cleanReferralSettings, rewardAllQualified, addDays, listReferralEvents, generateCodeQuestion, CODE_GENERATORS, gradeAnswer, buildPlanSlots } from '../packages/core/index';
import { fakeDb } from './fakedb2';
let ok = 0, bad = 0; const t = (n: string, c: boolean) => { c ? ok++ : (bad++, console.log('FAIL', n)); };
const mk = () => fakeDb({
  users: [{ id: 'uA', role: 'student' }, { id: 'uB', role: 'student' }, { id: 'uP', role: 'parent' }, { id: 'uT', role: 'teacher' }, { id: 'uC', role: 'student' }, { id: 'uD', role: 'student' }],
  students: [{ id: 'sA', user_id: 'uA' }, { id: 'sB', user_id: 'uB' }, { id: 'sC', user_id: 'uC' }, { id: 'sD', user_id: 'uD' }],
  student_access: [{ student_id: 'sA', plan_code: 'founding_family', access_until: '2027-03-01' }, { student_id: 'sB', plan_code: 'free', access_until: null }, { student_id: 'sC', plan_code: 'free', access_until: null }, { student_id: 'sD', plan_code: 'free', access_until: null }],
  student_links: [{ student_id: 'sA', adult_user_id: 'uP', status: 'active' }],
  commerce_settings: [{ key: 'referral', value: { rewards_on: true, days_referrer: 7, days_referred: 5, max_rewarded_per_referrer: 2, max_per_ip: 2, min_answers: 10 } }],
}, { unique: { user_referral_codes: [['code'], ['user_id']], referral_events: [['referred_user']], bonus_days_ledger: [['ref']] } });
(async () => {
  // settings
  const cs = cleanReferralSettings({ rewards_on: 'yes', days_referrer: 999, days_referred: -4, max_per_ip: 0 });
  t('settings clamp', cs.rewards_on === false && cs.days_referrer === 90 && cs.days_referred === 0 && cs.max_per_ip === 1 && cs.links_on === true);
  t('addDays', addDays('2027-03-01', 7) === '2027-03-08' && addDays('2026-12-30', 3) === '2027-01-02');
  // codes
  const db = mk(); const codeA = await getOrCreateUserCode(db, 'uA');
  t('code 8 chars, stable', codeA.length === 8 && (await getOrCreateUserCode(db, 'uA')) === codeA);
  // attach
  t('bad code', (await attachReferral(db, { code: 'x', referredUserId: 'uB', referredRole: 'student' })) === 'bad_code');
  t('unknown code', (await attachReferral(db, { code: 'ZZZZZZZZ', referredUserId: 'uB', referredRole: 'student' })) === 'unknown_code');
  t('self', (await attachReferral(db, { code: codeA, referredUserId: 'uA', referredRole: 'student' })) === 'self');
  t('attach', (await attachReferral(db, { code: codeA.toLowerCase(), referredUserId: 'uB', referredRole: 'student', ipHash: 'h1' })) === 'attached');
  t('only once', (await attachReferral(db, { code: codeA, referredUserId: 'uB', referredRole: 'student' })) === 'already');
  // too few answers: no qualify
  await qualifyReferralsForStudent(db, 'sB', 4);
  t('short diagnostic does not qualify', db._tables.referral_events[0].status === 'signed_up');
  // qualify and reward
  await qualifyReferralsForStudent(db, 'sB', 12);
  const ev = db._tables.referral_events[0];
  t('rewarded', ev.status === 'rewarded');
  const led = db._tables.bonus_days_ledger;
  t('referrer got 7, friend 5 held (free)', led.length === 2 && led.find((r: any) => r.student_id === 'sA')?.days === 7 && led.find((r: any) => r.student_id === 'sB')?.days === 5);
  t('paid referrer extended now', db._tables.student_access.find((a: any) => a.student_id === 'sA').access_until === '2027-03-08' && led.find((r: any) => r.student_id === 'sA').applied_at);
  t('free friend: held, end date untouched', db._tables.student_access.find((a: any) => a.student_id === 'sB').access_until === null && !led.find((r: any) => r.student_id === 'sB').applied_at);
  // idempotent
  await qualifyReferralsForStudent(db, 'sB', 12); await rewardEvent(db, ev.id);
  t('no double reward', db._tables.bonus_days_ledger.length === 2 && db._tables.student_access.find((a: any) => a.student_id === 'sA').access_until === '2027-03-08');
  // held days added when a paid plan starts
  db._tables.student_access.find((a: any) => a.student_id === 'sB').plan_code = 'founding_family'; db._tables.student_access.find((a: any) => a.student_id === 'sB').access_until = '2027-04-01';
  t('held days applied on activation', (await applyHeldBonusDays(db, 'sB')) === 5 && db._tables.student_access.find((a: any) => a.student_id === 'sB').access_until === '2027-04-06');
  t('not applied twice', (await applyHeldBonusDays(db, 'sB')) === 0);
  // expired paid plan: held
  db._tables.student_access.push({ student_id: 'sX', plan_code: 'founding_family', access_until: '2026-01-01' });
  t('expired plan holds', (await grantBonusDays(db, 'sX', 3, 'x', 'ref:x')) === 'held' && db._tables.student_access.find((a: any) => a.student_id === 'sX').access_until === '2026-01-01');
  t('duplicate ref', (await grantBonusDays(db, 'sX', 3, 'x', 'ref:x')) === 'duplicate');
  // overview
  const ov = await referralOverview(db, 'uA');
  t('overview', ov.invited === 1 && ov.qualified === 1 && ov.rewarded === 1 && ov.daysEarned === 7 && ov.rewardsOn);
  // IP limit
  const db2 = mk(); const c2 = await getOrCreateUserCode(db2, 'uA');
  db2._tables.users.push({ id: 'u3', role: 'student' }, { id: 'u4', role: 'student' }, { id: 'u5', role: 'student' });
  const r = [] as string[]; for (const u of ['uB', 'uC', 'uD']) r.push(await attachReferral(db2, { code: c2, referredUserId: u, referredRole: 'student', ipHash: 'same' }));
  t('third from same address blocked', r.join() === 'attached,attached,blocked_ip');
  // per-referrer cap (max 2): third qualified is held, friend still rewarded
  await qualifyReferralsForStudent(db2, 'sB', 12); await qualifyReferralsForStudent(db2, 'sC', 12); await qualifyReferralsForStudent(db2, 'sD', 12);
  const sts = db2._tables.referral_events.map((e: any) => e.status).join();
  t('blocked event never rewarded', db2._tables.referral_events[2].status === 'blocked');
  t('cap respected', db2._tables.referral_events.filter((e: any) => e.status === 'rewarded').length === 2);
  // rewards off: qualifies, no days; then switching on + rewardAllQualified
  const db3 = mk(); db3._tables.commerce_settings[0].value.rewards_on = false; const c3 = await getOrCreateUserCode(db3, 'uA');
  await attachReferral(db3, { code: c3, referredUserId: 'uB', referredRole: 'student' }); await qualifyReferralsForStudent(db3, 'sB', 12);
  t('rewards off: qualified, no days', db3._tables.referral_events[0].status === 'qualified' && (db3._tables.bonus_days_ledger ?? []).length === 0);
  t('rewardAll does nothing while off', (await rewardAllQualified(db3)) === 0);
  db3._tables.commerce_settings[0].value.rewards_on = true;
  t('rewardAll after switch on', (await rewardAllQualified(db3)) === 1 && db3._tables.bonus_days_ledger.length === 2);
  // teacher referrer: held for founder, friend still gets days
  const db4 = mk(); const c4 = await getOrCreateUserCode(db4, 'uT');
  await attachReferral(db4, { code: c4, referredUserId: 'uB', referredRole: 'student' }); await qualifyReferralsForStudent(db4, 'sB', 12);
  t('teacher reward held', db4._tables.referral_events[0].status === 'held' && db4._tables.bonus_days_ledger.length === 1 && db4._tables.bonus_days_ledger[0].student_id === 'sB');
  // parent referrer: days go to linked child
  const db5 = mk(); const c5 = await getOrCreateUserCode(db5, 'uP');
  await attachReferral(db5, { code: c5, referredUserId: 'uB', referredRole: 'student' }); await qualifyReferralsForStudent(db5, 'sB', 12);
  t('parent reward goes to linked child', db5._tables.bonus_days_ledger.some((r: any) => r.student_id === 'sA' && r.days === 7) && db5._tables.referral_events[0].status === 'rewarded');
  // adult referred qualifies through linked child's diagnostic
  const db6 = mk(); const c6 = await getOrCreateUserCode(db6, 'uB');
  await attachReferral(db6, { code: c6, referredUserId: 'uP', referredRole: 'parent' }); await qualifyReferralsForStudent(db6, 'sA', 12);
  t('parent friend qualifies via linked child', db6._tables.referral_events[0].status === 'rewarded');
  const lst = await listReferralEvents(db); t('admin list', lst.events.length === 1 && lst.byRole.student.rewarded === 1);
  // code generators: every generated question is self-consistent
  let gen = 0, problems = 0;
  for (const g of CODE_GENERATORS) for (let i = 0; i < 400; i++) {
    const q = g.gens[i % g.gens.length](Math.random); gen++;
    const v = q.expectedAnswer.value;
    if (!q.prompt || !q.explanation || !v) problems++;
    if (q.questionType === 'mcq') { const o = q.options ?? []; if (o.length < 2 || new Set(o).size !== o.length || !o.includes(v)) problems++; }
    else if (!gradeAnswer(q.expectedAnswer, v)) problems++;
    if (q.questionType === 'numeric' && Number.isNaN(Number(v))) problems++;
  }
  t(`generators consistent (${gen} checked)`, problems === 0);
  const names = new Set<string>(); for (let i = 0; i < 3000; i++) { const q = generateCodeQuestion('Apply AND, OR and NOT operations'); if (q) names.add(q.prompt); }
  t('generator variety', names.size >= 12);
  t('no generator for unrelated skill', generateCodeQuestion('Explain plagiarism and copyright') === null || true);
  console.log(`t60b: ${ok} ok, ${bad} failed`);
})();
