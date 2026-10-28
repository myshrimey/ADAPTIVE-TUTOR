// v64: website traffic analytics (first-party, privacy-first). Pure functions only: parsing, channel rules, validation and the
// summary maths. The database layer is `store.ts`. No cookies, no raw IP addresses, no names: a visitor is a daily-rotating hash.
// "Visitors" are therefore unique PER DAY and summed over a range: a person who returns on another day counts again. The page says so.

export interface UA { device: 'mobile' | 'tablet' | 'desktop'; browser: string; os: string; bot: boolean }
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http|httpclient|vercel-screenshot/i;
export function parseUserAgent(ua: string | null | undefined): UA {
  const s = String(ua ?? '');
  if (!s) return { device: 'desktop', browser: 'Unknown', os: 'Unknown', bot: true };
  const bot = BOT.test(s);
  const tablet = /ipad|tablet|(android(?!.*mobile))/i.test(s);
  const mobile = !tablet && /mobi|iphone|ipod|android/i.test(s);
  const device: UA['device'] = tablet ? 'tablet' : mobile ? 'mobile' : 'desktop';
  const browser = /edg\//i.test(s) ? 'Edge' : /opr\/|opera/i.test(s) ? 'Opera' : /samsungbrowser/i.test(s) ? 'Samsung Internet' : /firefox|fxios/i.test(s) ? 'Firefox' : /chrome|crios/i.test(s) ? 'Chrome' : /safari/i.test(s) ? 'Safari' : 'Other';
  const os = /windows/i.test(s) ? 'Windows' : /android/i.test(s) ? 'Android' : /iphone|ipad|ipod|ios/i.test(s) ? 'iOS' : /mac os|macintosh/i.test(s) ? 'macOS' : /linux|cros/i.test(s) ? 'Linux' : 'Other';
  return { device, browser, os, bot };
}

export type Channel = 'Direct' | 'Organic search' | 'Social' | 'Messaging' | 'Referral' | 'Campaign';
const SEARCH = ['google.', 'bing.', 'duckduckgo.', 'yahoo.', 'ecosia.', 'baidu.', 'yandex.', 'brave.'];
const SOCIAL = ['facebook.', 'fb.', 'instagram.', 'twitter.', 't.co', 'x.com', 'linkedin.', 'lnkd.in', 'youtube.', 'youtu.be', 'reddit.', 'pinterest.', 'quora.'];
const MESSAGING = ['whatsapp.', 'wa.me', 'telegram.', 't.me'];
export function classifyChannel(o: { referrerHost?: string | null; utmSource?: string | null; utmMedium?: string | null; ownHost?: string | null }): { channel: Channel; source: string } {
  const med = String(o.utmMedium ?? '').toLowerCase().trim(); const us = String(o.utmSource ?? '').toLowerCase().trim().slice(0, 40);
  const host = String(o.referrerHost ?? '').toLowerCase().replace(/^www\./, '').trim();
  const has = (list: string[], h: string) => list.some((x) => h === x || h.includes(x));
  if (us) {
    if (has(MESSAGING, us) || us === 'whatsapp' || us === 'telegram') return { channel: 'Messaging', source: us };
    if (has(SOCIAL, us) || ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube'].includes(us)) return { channel: 'Social', source: us };
    if (['cpc', 'ppc', 'paid', 'email', 'newsletter', 'sms'].includes(med) || med) return { channel: 'Campaign', source: us };
    return { channel: 'Campaign', source: us };
  }
  if (!host || (o.ownHost && host === String(o.ownHost).toLowerCase().replace(/^www\./, ''))) return { channel: 'Direct', source: 'direct' };
  if (has(SEARCH, host)) return { channel: 'Organic search', source: host };
  if (has(MESSAGING, host)) return { channel: 'Messaging', source: host };
  if (has(SOCIAL, host)) return { channel: 'Social', source: host };
  return { channel: 'Referral', source: host };
}

const SKIP_PREFIX = ['/api', '/admin', '/_next', '/auth'];
export interface TrackInput { path: string; referrerHost: string | null; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null; utmContent?: string | null; utmTerm?: string | null; partner?: string | null }
/** Validates what the browser sends. Returns null for anything that should not be counted. Query strings and hashes are dropped, so no token or name can slip in. */
export function cleanTrackEvent(raw: any): TrackInput | null {
  let path = String(raw?.path ?? '').split('#')[0].split('?')[0].trim();
  if (!path.startsWith('/') || path.length > 200 || /[\s<>"']/.test(path)) return null;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  if (SKIP_PREFIX.some((p) => path === p || path.startsWith(p + '/'))) return null;
  path = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id'); // never store a record id
  const host = (v: unknown) => { const s = String(v ?? '').trim().toLowerCase().replace(/^www\./, ''); return /^[a-z0-9.-]{1,100}$/.test(s) ? s : null; };
  const t = (v: unknown, n: number) => { const s = String(v ?? '').trim().slice(0, n); return s && /^[\w .:+-]+$/.test(s) ? s : null; };
  return { path, referrerHost: host(raw?.referrerHost), utmSource: t(raw?.utmSource, 40), utmMedium: t(raw?.utmMedium, 40), utmCampaign: t(raw?.utmCampaign, 60), utmContent: t(raw?.utmContent, 60), utmTerm: t(raw?.utmTerm, 60), partner: t(raw?.partner, 40) };
}

export interface ViewRow { at: string; visitor: string; path: string; channel: string; source: string | null; device: string; browser: string; os: string; country: string | null; signed_in: boolean }
export interface Totals { visitors: number; sessions: number; pageviews: number; pagesPerSession: number | null; bounceRate: number | null; avgSessionSeconds: number | null }
export interface Count { name: string; count: number; extra?: number }
export interface TrafficSummary {
  totals: Totals; previous: Totals | null;
  daily: Array<{ day: string; visitors: number; sessions: number; pageviews: number }>;
  topPages: Array<{ path: string; views: number; visitors: number }>;
  entryPages: Count[]; channels: Count[]; sources: Count[]; devices: Count[]; browsers: Count[]; os: Count[]; countries: Count[];
  signedIn: { signedIn: number; anonymous: number };
  enough: boolean;
}
export const SESSION_GAP_MS = 30 * 60 * 1000;
const IST_MS = 5.5 * 3600 * 1000;
export const istDayOf = (t: number | string | Date): string => new Date(new Date(t).getTime() + IST_MS).toISOString().slice(0, 10);

interface Sess { visitor: string; day: string; views: ViewRow[] }
export function sessionise(rows: ViewRow[]): Sess[] {
  const byVisitor = new Map<string, ViewRow[]>();
  for (const r of rows) { const l = byVisitor.get(r.visitor) ?? []; l.push(r); byVisitor.set(r.visitor, l); }
  const out: Sess[] = [];
  for (const [visitor, list] of byVisitor) {
    list.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    let cur: ViewRow[] = [];
    for (const r of list) {
      if (cur.length && Date.parse(r.at) - Date.parse(cur[cur.length - 1].at) > SESSION_GAP_MS) { out.push({ visitor, day: istDayOf(cur[0].at), views: cur }); cur = []; }
      cur.push(r);
    }
    if (cur.length) out.push({ visitor, day: istDayOf(cur[0].at), views: cur });
  }
  return out;
}
export function totalsOf(rows: ViewRow[]): Totals {
  const sessions = sessionise(rows);
  const visitorsPerDay = new Set(sessions.map((s) => s.visitor + '|' + istDayOf(s.views[0].at)));
  // a visitor hash rotates daily, so a hash seen on two IST days (a session over midnight) is counted per day it appears
  const perDay = new Set(rows.map((r) => r.visitor + '|' + istDayOf(r.at)));
  const visitors = Math.max(visitorsPerDay.size, perDay.size);
  const n = sessions.length;
  const bounces = sessions.filter((s) => s.views.length === 1).length;
  const durations = sessions.filter((s) => s.views.length > 1).map((s) => (Date.parse(s.views[s.views.length - 1].at) - Date.parse(s.views[0].at)) / 1000);
  return {
    visitors, sessions: n, pageviews: rows.length,
    pagesPerSession: n >= 5 ? Math.round((rows.length / n) * 10) / 10 : null,
    bounceRate: n >= 5 ? Math.round((bounces / n) * 100) : null,
    avgSessionSeconds: durations.length >= 5 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
  };
}
const tally = (items: Array<string | null | undefined>, top = 10): Count[] => {
  const m = new Map<string, number>(); for (const i of items) { const k = i && String(i).trim() ? String(i) : 'Unknown'; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, top);
};
/** `from`/`to` are IST day strings, inclusive. `previousRows` (the same-length period before) gives the change figures. */
export function summariseTraffic(rows: ViewRow[], from: string, to: string, previousRows: ViewRow[] | null = null): TrafficSummary {
  const sessions = sessionise(rows);
  const days: string[] = []; for (let t = Date.parse(from + 'T00:00:00Z'); t <= Date.parse(to + 'T00:00:00Z') && days.length < 400; t += 86400000) days.push(new Date(t).toISOString().slice(0, 10));
  const daily = days.map((day) => {
    const r = rows.filter((x) => istDayOf(x.at) === day);
    return { day, pageviews: r.length, visitors: new Set(r.map((x) => x.visitor)).size, sessions: sessions.filter((s) => s.day === day).length };
  });
  const pages = new Map<string, { views: number; v: Set<string> }>();
  for (const r of rows) { const p = pages.get(r.path) ?? { views: 0, v: new Set() }; p.views++; p.v.add(r.visitor + '|' + istDayOf(r.at)); pages.set(r.path, p); }
  // one visitor-day per session start, for channel / device / country tables
  const firsts = sessions.map((s) => s.views[0]);
  return {
    totals: totalsOf(rows), previous: previousRows ? totalsOf(previousRows) : null, daily,
    topPages: [...pages.entries()].map(([path, p]) => ({ path, views: p.views, visitors: p.v.size })).sort((a, b) => b.views - a.views).slice(0, 12),
    entryPages: tally(firsts.map((f) => f.path), 8),
    channels: tally(firsts.map((f) => f.channel), 8),
    sources: tally(firsts.filter((f) => f.channel !== 'Direct').map((f) => f.source), 8),
    devices: tally(firsts.map((f) => f.device), 4), browsers: tally(firsts.map((f) => f.browser), 6), os: tally(firsts.map((f) => f.os), 6),
    countries: tally(firsts.map((f) => f.country), 10),
    signedIn: { signedIn: firsts.filter((f) => f.signed_in).length, anonymous: firsts.filter((f) => !f.signed_in).length },
    enough: rows.length >= 20,
  };
}
export const changePct = (now: number | null, before: number | null): number | null => (now == null || before == null || before < 5 ? null : Math.round(((now - before) / before) * 100));
export function realtimeVisitors(rows: ViewRow[], now: Date = new Date(), minutes = 5): number {
  const cut = now.getTime() - minutes * 60000;
  return new Set(rows.filter((r) => { const t = Date.parse(r.at); return t > cut && t <= now.getTime(); }).map((r) => r.visitor)).size;
}
export function rangeDays(range: string, today: string): { from: string; to: string; prevFrom: string; prevTo: string; days: number } {
  const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const shift = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const from = shift(today, -(days - 1));
  return { from, to: today, prevFrom: shift(from, -days), prevTo: shift(from, -1), days };
}
