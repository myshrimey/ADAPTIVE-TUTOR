import { fakeDb } from './fakedb2';
import { touchFromQuery, encodeTouch, decodeTouch, nextTouches, cleanSource, recordTouch, captureSignupAttribution, loadRaw, buildReport, createPartner, recordOfflineSale, tagSale, tagExpense, saveExperiment, buildPeople, toCsv, cleanAcqSettings, rate, dataQuality } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const q = (s: string) => new URLSearchParams(s);
const NOW = new Date('2026-10-28T06:00:00Z'); const d = (days: number) => new Date(NOW.getTime() - days * 86400000).toISOString();
(async () => {
  // ---- pure rules ----
  ok(touchFromQuery(q(''), '/') === null, 'no tracking words = no touch');
  const t1 = touchFromQuery(q('utm_source=Facebook&utm_medium=social&utm_campaign=cbse-2027&utm_content=baseline-post-01'), '/', d(5))!;
  ok(t1.source === 'facebook' && t1.campaign === 'cbse-2027' && t1.content === 'baseline-post-01' && t1.landing === '/', 'parses utm');
  ok(touchFromQuery(q('src=wa'), '/')!.source === 'whatsapp' && touchFromQuery(q('ref=fb'), '/')!.source === 'facebook', 'legacy src/ref words kept');
  ok(touchFromQuery(q('p=tutor-arun-001'), '/')!.partner === 'TUTOR-ARUN-001', 'partner code');
  ok(cleanSource('My Custom Group') === 'my_custom_group' && cleanSource('') === 'unknown' && cleanSource('<script>') === 'script', 'custom sources survive, junk cleaned');
  const t2 = touchFromQuery(q('utm_source=google&utm_campaign=b'), '/', d(1))!;
  const nt = nextTouches(t1, t1, t2); ok(nt.first === t1 && nt.last === t2 && !nt.setFirst && nt.setLast, 'first touch never overwritten, last replaced');
  ok(decodeTouch(encodeURIComponent(JSON.stringify({ s: 'whatsapp', m: 'x', c: 'y' })))!.source === 'whatsapp', 'old 3-key cookie still readable');
  ok(decodeTouch('%7Bbad') === null && decodeTouch(undefined) === null, 'bad cookie = null');
  ok(rate(5, 10, 20) === null && rate(5, 20, 20) === 25, 'rate needs minimum sample');

  // ---- database journey ----
  const db: any = fakeDb({
    users: [], students: [], diagnostic_attempts: [], student_baselines: [], learning_sessions: [], user_referral_codes: [], pilot_payments: [], acq_sale_links: [], referral_events: [], student_links: [], revenue_entries: [], acquisition_touches: [], acquisition_attribution: [], acq_partners: [], expenses: [], acq_experiments: [], student_access: [{ student_id: 'x', plan_code: 'free' }], social_content: [{ id: 'c1', slug: 'baseline-post-01', campaign_id: 'cp1', platform: 'facebook', audience: 'cbse_parent', status: 'PUBLISHED', archived: false, published_at: d(6) }, { id: 'c2', slug: 'quiet-post', campaign_id: null, platform: 'instagram', audience: 'x', status: 'PUBLISHED', archived: false }],
    social_campaigns: [{ id: 'cp1', slug: 'cbse-2027', name: 'CBSE-2027', budget_inr: 5000, status: 'active' }, { id: 'cp2', slug: 'empty', name: 'Empty', status: 'active' }],
    social_metrics: [{ content_id: 'c1', platform: 'facebook', metric_date: '2026-10-25', impressions: 1000, clicks: 50, likes: 40, comments: 2, shares: 1, saves: 3 }],
    commerce_settings: [{ key: 'social_growth', value: { siteUrl: 'https://sahayak.example' } }, { key: 'referral', value: { links_on: true, rewards_on: false, days_referrer: 7 } }],
  }, { unique: { acquisition_attribution: [['user_id']], acquisition_touches: [['anon', 'touch_day', 'source']], acq_partners: [['code']] } });
  const T = db._tables;
  const mkUser = (id: string, role: string, extra: any = {}) => T.users.push({ id, role, created_at: d(10), source: 'direct', username: id + '_name', contact_email: id + '@private.example', ...extra });
  const mkStudent = (uid: string, sid: string) => { T.students.push({ id: sid, user_id: uid, grade: 'CBSE-10', created_at: d(10) }); T.student_access.push({ student_id: sid, plan_code: 'free', access_until: null }); };

  // visitor A: Facebook post, then a later WhatsApp link; signs up
  const A = 'anonA';
  ok((await recordTouch(db, A, t1)) === 'recorded', 'touch recorded');
  ok((await recordTouch(db, A, { ...t1 })) === 'duplicate', 'repeat same-day touch is ignored');
  const wa = touchFromQuery(q('utm_source=whatsapp&utm_campaign=friends'), '/', d(4))!;
  await recordTouch(db, A, wa);
  mkUser('u1', 'student', { source: 'facebook' }); mkStudent('u1', 's1');
  const r1 = await captureSignupAttribution(db, { userId: 'u1', role: 'student', anon: A, first: t1, last: wa });
  ok(r1.stored && r1.matched, 'signup stored and matched to the earlier arrival');
  const a1 = T.acquisition_attribution.find((x: any) => x.user_id === 'u1');
  ok(a1.first_source === 'facebook' && a1.first_content === 'baseline-post-01' && a1.last_source === 'whatsapp' && a1.social_content_id === 'c1' && a1.campaign_id === 'cp1', 'first=facebook post, last=whatsapp, post+campaign ids resolved');
  ok(T.acquisition_touches.every((t: any) => t.user_id === 'u1'), 'arrivals of that browser linked to the account');
  const r1b = await captureSignupAttribution(db, { userId: 'u1', role: 'student', anon: A, first: t2, last: t2 });
  ok(!r1b.stored && T.acquisition_attribution.filter((x: any) => x.user_id === 'u1').length === 1 && a1.first_source === 'facebook', 'second capture does not overwrite or duplicate');
  // a visitor who never signs up (arrival only)
  await recordTouch(db, 'anonB', touchFromQuery(q('utm_source=facebook&utm_content=baseline-post-01&utm_campaign=cbse-2027'), '/', d(3))!);

  // student 1 journey: diagnostic, baseline, 3 sessions, paid by offline sale tied to source
  T.diagnostic_attempts.push({ student_id: 's1', status: 'completed', started_at: d(9), completed_at: d(9) });
  T.student_baselines.push({ student_id: 's1', created_at: d(9) });
  for (const k of [9, 8, 2]) T.learning_sessions.push({ student_id: 's1', started_at: d(k) });
  T.user_referral_codes.push({ user_id: 'u1', code: 'ABCD2345' });
  const sale = await recordOfflineSale(db, { who: 'student', username: 'u1_name', amount: 499, paymentDate: '2026-10-20', status: 'confirmed', offer: 'Pilot', source: 'facebook', campaign: 'cbse-2027' }, 'founder@x');
  ok(sale.note.includes('/admin/payments') && T.pilot_payments.length === 1 && T.acq_sale_links.length === 1 && T.acq_sale_links[0].user_id === 'u1', 'offline sale goes to the same payments table and is linked');
  let bad = ''; try { await recordOfflineSale(db, { who: 'student', username: 'nobody', amount: 1, paymentDate: '2026-10-20' }, 'x'); } catch (e: any) { bad = e.message; } ok(/No account/.test(bad), 'unknown username refused');
  try { await recordOfflineSale(db, { who: 'student', username: 'u1_name', amount: -5, paymentDate: '2026-10-20' }, 'x'); bad = ''; } catch (e: any) { bad = e.message; } ok(/amount/.test(bad), 'bad amount refused');

  // student 2: referred by u1 (referral_events), diagnostic, paid
  mkUser('u2', 'student', { source: 'direct' }); mkStudent('u2', 's2');
  T.referral_events.push({ id: 're1', code: 'ABCD2345', referrer_user: 'u1', referred_user: 'u2', referred_role: 'student', status: 'qualified', created_at: d(7) });
  await captureSignupAttribution(db, { userId: 'u2', role: 'student', anon: null, first: null, last: null });
  const a2 = T.acquisition_attribution.find((x: any) => x.user_id === 'u2');
  ok(a2.referrer_user === 'u1' && a2.referral_code === 'ABCD2345' && a2.first_source === 'referral', 'referral attached at signup');
  T.diagnostic_attempts.push({ student_id: 's2', status: 'completed', started_at: d(6), completed_at: d(6) });
  T.learning_sessions.push({ student_id: 's2', started_at: d(6) }, { student_id: 's2', started_at: d(5) });
  await recordOfflineSale(db, { who: 'student', username: 'u2_name', amount: 399, paymentDate: '2026-10-22', status: 'confirmed', source: 'referral', referralCode: 'ABCD2345' }, 'x');

  // tutor partner -> students -> payment
  const code = await createPartner(db, { kind: 'tutor', name: 'Arun Kumar' }); ok(code === 'TUTOR-ARUN-001', 'partner code ' + code);
  ok((await createPartner(db, { kind: 'tutor', name: 'Arun Sharma' })) === 'TUTOR-ARUN-002', 'second code unique');
  mkUser('tu', 'tutor'); T.acq_partners.find((p: any) => p.code === code).user_id = 'tu';
  mkUser('u3', 'student'); mkStudent('u3', 's3'); await captureSignupAttribution(db, { userId: 'u3', role: 'student', anon: null, first: touchFromQuery(q('p=TUTOR-ARUN-001'), '/', d(8)), last: null });
  mkUser('u4', 'student'); mkStudent('u4', 's4'); T.student_links.push({ student_id: 's4', adult_user_id: 'tu', link_type: 'tutor', status: 'active' });
  T.diagnostic_attempts.push({ student_id: 's3', status: 'completed', started_at: d(7), completed_at: d(7) });
  T.learning_sessions.push({ student_id: 's3', started_at: d(7) }, { student_id: 's3', started_at: d(3) });
  await recordOfflineSale(db, { who: 'student', username: 'u3_name', amount: 499, paymentDate: '2026-10-21', status: 'confirmed', source: 'tutor', partner: code }, 'x');
  // coaching centre: 3 students, org revenue; school pilot with revenue
  const cc = await createPartner(db, { kind: 'centre', name: 'Delhi Centre', status: 'active' }); ok(cc === 'CENTRE-DELHI-001', 'centre code');
  for (const i of [5, 6, 7]) { mkUser('c' + i, 'student'); mkStudent('c' + i, 'sc' + i); await captureSignupAttribution(db, { userId: 'c' + i, role: 'student', anon: null, first: touchFromQuery(q('p=' + cc), '/', d(6)), last: null }); }
  await recordOfflineSale(db, { who: 'organisation', customerKind: 'centre', customerName: 'Delhi Centre Pvt', amount: 15000, paymentDate: '2026-10-24', source: 'coaching_centre', partner: cc }, 'x');
  const sc = await createPartner(db, { kind: 'school', name: 'Green School', status: 'pilot' });
  mkUser('sch1', 'student'); mkStudent('sch1', 'ssch1'); await captureSignupAttribution(db, { userId: 'sch1', role: 'student', anon: null, first: touchFromQuery(q('p=' + sc), '/', d(5)), last: null });
  await recordOfflineSale(db, { who: 'organisation', customerKind: 'school', amount: 8000, paymentDate: '2026-10-25', source: 'school', partner: sc }, 'x');
  let bp = ''; try { await recordOfflineSale(db, { who: 'organisation', amount: 10, paymentDate: '2026-10-25', partner: 'NOPE-1' }, 'x'); } catch (e: any) { bp = e.message; } ok(/partner code does not exist/.test(bp), 'unknown partner refused');
  // an untagged older payment and spend
  T.revenue_entries.push({ id: 'old1', received_on: '2026-10-10', customer_kind: 'tutor', amount_inr: 1000 });
  await tagExpense(db, { amount: 1000, date: '2026-10-15', source: 'facebook', description: 'boost' }, 'x');
  let ts = ''; try { await tagExpense(db, { amount: 5, date: '2026-10-15' }, 'x'); } catch (e: any) { ts = e.message; } ok(/Tag the spend/.test(ts), 'untagged spend refused');
  await saveExperiment(db, { name: 'Hook test', variantA: 'cbse-2027', variantB: 'empty', metric: 'paid_conversion', startDate: '2026-10-01' });

  const { raw, missing } = await loadRaw(db, NOW);
  raw.settings = cleanAcqSettings({ minSample: 2 });
  ok(Array.isArray(missing), 'loadRaw returns a missing list (tables not present are listed, not faked)');
  const rep = buildReport(raw, { range: { from: null, to: null }, rangeLabel: 'All time', model: 'first_touch' });
  if (process.env.DBG) { console.log(JSON.stringify(buildReport(raw, { range: { from: null, to: null }, model: 'referral' }).sources)); }
  const fb = rep.sources.find((s) => s.key === 'facebook')!;
  ok(fb && fb.people === 1 && fb.paid === 1 && fb.revenue === 499 && fb.diagDone === 1 && fb.baseline === 1 && fb.activated === 1, 'facebook row: 1 signup, diagnostic, baseline, activated, paid ₹499');
  ok(fb.arrivals === 2 && fb.arrivalsMatched === 1, 'facebook: 2 tracked arrivals, 1 matched to an account (only tracked links are matched)');
  ok(fb.spend === 1000 && fb.cac === 1000 && fb.organic === false, 'cash spend gives cost per customer');
  const wrow = buildReport(raw, { range: { from: null, to: null }, model: 'last_touch' }).sources.find((s) => s.key === 'whatsapp');
  ok(wrow && wrow.people === 1 && wrow.revenue === 499, 'last-touch model credits whatsapp, not facebook');
  const refm = buildReport(raw, { range: { from: null, to: null }, model: 'referral' });
  ok(refm.sources.length === 1 && refm.sources[0].key === 'referral' && refm.sources[0].paid === 1 && refm.sources[0].revenue === 399, 'referral model: only referred people');
  const allm = buildReport(raw, { range: { from: null, to: null }, model: 'all_touches' });
  ok(allm.sources.filter((s) => s.people > 0 && s.key !== 'unknown').length >= 3, 'all-touches counts a person under each source');
  const post = rep.content.find((c) => c.slug === 'baseline-post-01')!;
  ok(post.signups === 1 && post.customers === 1 && post.revenue === 499 && post.referrals === 1 && post.impressions === 1000 && post.clicks === 50, 'post -> signup -> customer -> revenue -> referral, manual metrics kept');
  ok(rep.content[0].slug === 'baseline-post-01', 'posts ranked by revenue, not likes');
  ok(rep.content.find((c) => c.slug === 'quiet-post')!.impressions === null, 'unrecorded impressions are null, not 0');
  const camp = rep.campaigns.find((c) => c.slug === 'cbse-2027')!; ok(camp && camp.people === 1 && camp.paid === 1 && camp.budget === 5000, 'campaign row');
  ok(rep.referral.signups === 1 && rep.referral.paid === 1 && rep.referral.revenue === 399 && rep.referral.pending === 1 && rep.referral.liabilityMoney === null, 'referral funnel; reward liability is days, money not available');
  ok(rep.referral.topByQuality[0].code === 'ABCD2345' && rep.referral.topByQuality[0].quality === 1 * 1 + 3 * 1 + 5 * 1 + 10 * 1, 'referrer quality score = weighted outcomes (1+3+5+10)');
  const tut = rep.partners.find((p) => p.code === code)!; ok(tut.attributed === 1 && tut.linked === 1 && tut.students === 2 && tut.revenue === 499 && tut.rewardStatus === 'none', 'tutor: 1 attributed + 1 linked student, ₹499, reward manual/none');
  const cen = rep.partners.find((p) => p.code === cc)!; ok(cen.students === 3 && cen.revenue === 15000, 'centre: 3 students and ₹15,000');
  const sch = rep.partners.find((p) => p.code === sc)!; ok(sch.students === 1 && sch.revenue === 8000 && sch.status === 'pilot', 'school pilot: 1 student, ₹8,000');
  const ct = (t: string) => rep.customerTypes.find((x) => x.type === t)!; ok(ct('coaching_centre').revenue === 15000 && ct('school').revenue === 8000, 'customer-type economics for centres and schools');
  ok(rep.sales.total >= 24000 && rep.sales.bySource.some((s) => s.source === 'coaching_centre' && s.amount === 15000), 'organisation sales by source feed the same report');
  ok(rep.selected.revenue === 499 + 399 + 499 + 15000 + 8000 + 1000, 'period revenue = payments + sales received (' + rep.selected.revenue + ')');
  const dq = (k: string) => rep.quality.find((i) => i.key === k);
  ok(dq('revenue_unlinked')?.count === 1, 'data quality: money not linked to a customer or partner'); ok(dq('camp_no_content')?.count === 1, 'data quality: campaign with no posts'); ok(dq('content_no_campaign')?.count === 1, 'data quality: post with no campaign');
  ok(rep.quality.every((i) => i.href && i.fix && ['high', 'medium', 'low'].includes(i.severity)), 'every issue has severity and fix link');
  ok(rep.chains.some((c) => c.steps.some((s) => s.label === 'Referred person 1' && /paid ₹399/.test(s.value))), 'journey shows source -> payment -> referral -> referred payment');
  ok(rep.chains.every((c) => /^Account [0-9A-Z]{2,4}$/.test(c.who)), 'journeys are pseudonymous');
  ok(rep.experiments[0].verdict.startsWith('Insufficient data'), 'experiment not judged from tiny samples');
  ok(rep.actions.length >= 1 && rep.actions.length <= 5, 'at most five actions');
  ok(rep.funnel.find((x) => x.stage.startsWith('Content impressions'))!.label === 'MANUAL', 'manual numbers are labelled MANUAL');
  const json = JSON.stringify(rep);
  ok(!/@private\.example|_name|Delhi Centre Pvt|Arun Kumar/.test(json), 'privacy: no usernames, emails, customer or partner names in the report');
  // data-quality high: no site address
  raw.siteBase = ''; ok(dataQuality(raw, buildPeople(raw).people).some((i) => i.key === 'no_site_base' && i.severity === 'high'), 'missing website address flagged high');
  // CSV safety
  const csv = toCsv(['a'], [['=HYPERLINK("x")'], [null]]); ok(csv.includes("'=HYPERLINK"), 'csv formulas defused, nulls blank');
  // missing data: empty database
  const empty = buildReport((await loadRaw(fakeDb({}), NOW)).raw, { range: { from: null, to: null } });
  ok(empty.sources.length === 0 && empty.studentEconomics.conversion === null && empty.business.cac === null && empty.business.revPerCustomer === null && empty.referral.liabilityMoney === null, 'empty database: nothing invented, rates null');
  ok(empty.actions[0].text.length > 0 && /Not enough data|Enter your website/.test(empty.actions.map((a) => a.text).join(' ')), 'empty database: honest next step');
  ok(empty.funnel.find((x) => x.stage === 'Website visits (unique per day)')!.count === null, 'no counter data = not available, not 0');
  // default minimum sample hides rates
  raw.settings = cleanAcqSettings(null); raw.siteBase = 'https://x.example';
  const strict = buildReport(raw, { range: { from: null, to: null } });
  ok(strict.sources.every((s) => s.paidRate === null && s.diagRate === null), 'below the minimum sample every rate says Insufficient data');
  ok(strict.actions.some((a) => /Not enough data/.test(a.text)), 'no channel is ranked from tiny samples');
  // segments: unknown not dropped
  const seg = buildReport(raw, { range: { from: null, to: null }, segment: { board: 'Unknown / not provided' } });
  ok(seg.funnel.find((x) => x.stage === 'Student accounts')!.count! >= 8, 'people without a board are kept under "Unknown / not provided"');
  // tag old sale
  await tagSale(db, { revenueEntryId: 'old1', source: 'tutor', partner: code }, 'x'); ok(T.acq_sale_links.some((l: any) => l.revenue_entry_id === 'old1' && l.partner_code === code), 'older sale can be tagged');
  console.log(`t76: ${n} checks, ${f ? f + ' FAILED' : 'all passed'}`);
  process.exit(f ? 1 : 0);
})();
