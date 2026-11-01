import { fakeDb } from './fakedb2';
import { parseUserAgent, classifyChannel, cleanTrackEvent, sessionise, totalsOf, summariseTraffic, changePct, realtimeVisitors, rangeDays, istDayOf, trafficReport, recordView, counterSelfCheck, purgeOldViews, type ViewRow } from '../packages/core';
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const CH = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const IPH = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const AND = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
(async () => {
  // user agents
  ok(parseUserAgent(CH).device === 'desktop' && parseUserAgent(CH).browser === 'Chrome' && parseUserAgent(CH).os === 'Windows' && !parseUserAgent(CH).bot, 'desktop chrome');
  ok(parseUserAgent(IPH).device === 'mobile' && parseUserAgent(IPH).os === 'iOS' && parseUserAgent(IPH).browser === 'Safari', 'iphone safari');
  ok(parseUserAgent(IPAD).device === 'tablet', 'ipad is a tablet');
  ok(parseUserAgent(AND).device === 'mobile' && parseUserAgent(AND).os === 'Android', 'android phone');
  ok(parseUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)').bot && parseUserAgent('').bot && parseUserAgent('curl/8.0').bot && parseUserAgent('Mozilla/5.0 HeadlessChrome/120').bot, 'bots recognised');
  // channels
  const own = 'sahayak.example';
  ok(classifyChannel({ ownHost: own }).channel === 'Direct', 'no referrer = direct');
  ok(classifyChannel({ referrerHost: 'sahayak.example', ownHost: own }).channel === 'Direct', 'own site is not a referral');
  ok(classifyChannel({ referrerHost: 'www.google.com', ownHost: own }).channel === 'Organic search', 'google search');
  ok(classifyChannel({ referrerHost: 'l.instagram.com' }).channel === 'Social' && classifyChannel({ referrerHost: 't.co' }).channel === 'Social', 'social');
  ok(classifyChannel({ referrerHost: 'web.whatsapp.com' }).channel === 'Messaging' && classifyChannel({ utmSource: 'whatsapp' }).channel === 'Messaging', 'whatsapp is messaging');
  ok(classifyChannel({ referrerHost: 'someblog.in' }).channel === 'Referral', 'other sites are referrals');
  ok(classifyChannel({ utmSource: 'school-newsletter', utmMedium: 'email' }).channel === 'Campaign' && classifyChannel({ utmSource: 'school-newsletter' }).source === 'school-newsletter', 'utm campaign');
  ok(classifyChannel({ referrerHost: 'google.com', utmSource: 'poster' }).source === 'poster', 'utm beats referrer');
  // input validation
  ok(cleanTrackEvent({ path: '/dashboard?token=abc#x' })?.path === '/dashboard', 'query and hash dropped');
  ok(cleanTrackEvent({ path: '/admin/traffic' }) === null && cleanTrackEvent({ path: '/api/me' }) === null && cleanTrackEvent({ path: 'http://evil' }) === null && cleanTrackEvent({ path: '/a b' }) === null && cleanTrackEvent({ path: '/' + 'x'.repeat(300) }) === null, 'admin, api, bad and long paths refused');
  ok(cleanTrackEvent({ path: '/parent/student/3f2b1c4e-5a6d-4e8f-9a0b-1c2d3e4f5a6b/baseline' })?.path === '/parent/student/:id/baseline', 'record ids never stored');
  ok(cleanTrackEvent({ path: '/learn/' })?.path === '/learn' && cleanTrackEvent({ path: '/' })?.path === '/', 'trailing slash normalised');
  const e = cleanTrackEvent({ path: '/', referrerHost: 'WWW.Google.com', utmSource: '<script>', utmMedium: 'ok' })!;
  ok(e.referrerHost === 'google.com' && e.utmSource === null && e.utmMedium === 'ok', 'referrer lowercased; markup in utm refused');
  ok(cleanTrackEvent({ path: '/', referrerHost: 'not a host!' })!.referrerHost === null, 'bad referrer host dropped');

  // sessions + totals. IST day 2026-10-20 = UTC 2026-10-19T18:30 .. 2026-10-20T18:30
  const R = (at: string, visitor: string, path: string, o: Partial<ViewRow> = {}): ViewRow => ({ at, visitor, path, channel: 'Direct', source: 'direct', device: 'mobile', browser: 'Chrome', os: 'Android', country: 'IN', signed_in: false, ...o });
  const rows: ViewRow[] = [
    R('2026-10-20T05:00:00Z', 'a', '/'), R('2026-10-20T05:05:00Z', 'a', '/plans'), R('2026-10-20T05:20:00Z', 'a', '/dashboard'),
    R('2026-10-20T06:00:00Z', 'a', '/'), // 40 min later -> a new session
    R('2026-10-20T05:10:00Z', 'b', '/', { channel: 'Social', source: 'instagram.com', device: 'desktop' }),
    R('2026-10-20T05:11:00Z', 'c', '/plans', { channel: 'Organic search', source: 'google.com', country: 'US' }),
    R('2026-10-20T05:12:00Z', 'd', '/', { signed_in: true }), R('2026-10-20T05:13:00Z', 'd', '/diagnostic', { signed_in: true }),
    R('2026-10-20T05:14:00Z', 'e', '/'),
  ];
  const sess = sessionise(rows);
  ok(sess.length === 6, 'gap over 30 min starts a new session (a:2, b, c, d, e)');
  ok(sess.find((s) => s.visitor === 'a' && s.views.length === 3) !== undefined, 'three pages in one session');
  const t = totalsOf(rows);
  ok(t.pageviews === 9 && t.visitors === 5 && t.sessions === 6, `totals ${JSON.stringify(t)}`);
  ok(t.bounceRate === Math.round((4 / 6) * 100), 'bounce = single-page sessions / sessions');
  ok(totalsOf(rows.slice(0, 3)).bounceRate === null && totalsOf(rows.slice(0, 3)).pagesPerSession === null, 'under 5 sessions: Insufficient data, never a rate');
  const sum = summariseTraffic(rows, '2026-10-20', '2026-10-20', null);
  ok(sum.daily.length === 1 && sum.daily[0].pageviews === 9 && sum.daily[0].visitors === 5, 'daily row');
  ok(sum.topPages[0].path === '/' && sum.topPages[0].views === 5, 'top page');
  ok(sum.channels.find((c) => c.name === 'Social')?.count === 1 && sum.channels.find((c) => c.name === 'Direct')?.count === 4, 'channels by session start');
  ok(sum.countries.find((c) => c.name === 'US')?.count === 1, 'countries');
  ok(sum.signedIn.signedIn === 1 && sum.signedIn.anonymous === 5, 'signed-in split');
  ok(sum.enough === false, 'under 20 views is flagged as not much traffic');
  ok(JSON.stringify(sum).indexOf('"ip"') < 0, 'no ip anywhere in the summary');
  // IST day boundary: 2026-10-20T19:00Z is already 21 Oct in India
  ok(istDayOf('2026-10-20T19:00:00Z') === '2026-10-21' && istDayOf('2026-10-20T18:29:00Z') === '2026-10-20', 'Indian day boundary');
  // change figures
  ok(changePct(110, 100) === 10 && changePct(50, 100) === -50 && changePct(10, 3) === null && changePct(null, 10) === null, 'change % needs a real previous figure');
  ok(realtimeVisitors(rows, new Date('2026-10-20T05:16:00Z')) === 2, 'realtime counts distinct visitors in 5 minutes');
  const rd = rangeDays('7d', '2026-10-25');
  ok(rd.from === '2026-10-19' && rd.to === '2026-10-25' && rd.prevFrom === '2026-10-12' && rd.prevTo === '2026-10-18' && rd.days === 7, 'range maths');
  ok(rangeDays('today', '2026-10-25').from === '2026-10-25' && rangeDays('weird', '2026-10-25').days === 30, 'today and default range');

  // database layer
  const db = fakeDb({ page_views: [], users: [{ id: 'u1', created_at: '2026-10-24T10:00:00Z' }, { id: 'u2', created_at: '2020-01-01T00:00:00Z' }], diagnostic_attempts: [{ id: 'd1', status: 'completed', created_at: '2026-10-24T11:00:00Z' }] });
  const now = new Date('2026-10-25T08:00:00Z');
  for (let i = 0; i < 6; i++) await recordView(db, { visitor: 'v' + i, path: i % 2 ? '/plans' : '/', channel: 'Direct', source: 'direct', campaign: null, device: 'mobile', browser: 'Chrome', os: 'Android', country: 'IN', region: null, signed_in: false });
  db._tables.page_views.forEach((r: any, i: number) => { r.at = new Date(now.getTime() - i * 60000).toISOString(); });
  db._tables.page_views.push({ at: '2026-09-01T00:00:00Z', visitor: 'old', path: '/', channel: 'Direct', source: 'direct', device: 'desktop', browser: 'Chrome', os: 'Windows', country: 'IN', signed_in: false });
  const rep = await trafficReport(db, '7d', now);
  ok(rep.summary.totals.pageviews === 6 && rep.summary.totals.visitors === 6 && rep.realtime === 5, `report totals ${JSON.stringify(rep.summary.totals)} rt ${rep.realtime}`);
  ok(rep.signups === 1 && rep.diagnostics === 1, 'sign-ups and diagnostics counted from the database, not estimated');
  ok(rep.summary.daily.length === 7, 'seven day rows');
  await purgeOldViews(db, new Date('2026-12-31T00:00:00Z'));
  ok(db._tables.page_views.length === 0 || db._tables.page_views.every((r: any) => r.at >= '2025-11'), 'old rows purged after the retention window');
  // v66: failures are reported with the database's own words instead of being swallowed
  const bad: any = { from: () => ({ insert: async () => ({ error: { message: 'relation "page_views" does not exist' } }), select: () => ({ order: () => ({ limit: async () => ({ data: [], error: { message: 'relation "page_views" does not exist' } }) }), then: undefined }) }) };
  const r1 = await recordView(bad, { visitor: 'x', path: '/', channel: 'Direct', source: null, campaign: null, device: 'd', browser: 'b', os: 'o', country: null, region: null, signed_in: false });
  ok(r1.ok === false && /does not exist/.test(r1.error ?? ''), 'recordView returns the real database error');
  const good = fakeDb({ page_views: [] });
  const sc = await counterSelfCheck(good);
  ok(sc.tableReadable && sc.canWrite && sc.totalRows === 0 && sc.error === null && good._tables.page_views.length === 0, 'self-check writes, reads and cleans up its test row');
  console.log(`t64: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
