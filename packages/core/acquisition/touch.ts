import { cleanSource } from './constants';

// v76: a "touch" is one arrival through a tracked link. Pure: parses link parameters, builds and reads the two cookies
// (first touch `sahayak_src`, last touch `sahayak_lt`), and decides what a later visit may change.
export interface Touch { source: string; medium: string | null; campaign: string | null; content: string | null; term: string | null; landing: string | null; partner: string | null; ref: string | null; at: string }
const tidy = (v: unknown, n: number): string | null => { const s = String(v ?? '').trim().slice(0, n); return s && /^[\w .:+\-/]+$/.test(s) ? s : null; };
/** Reads the tracking words from a link's query. Returns null when the link carries none (an ordinary visit is not a "touch"). */
export function touchFromQuery(q: { get(name: string): string | null }, landing: string | null, nowIso: string = new Date().toISOString()): Touch | null {
  // ?ref= has always meant a source word here (middleware v58); invite codes arrive through /r/CODE, not this.
  const src = q.get('utm_source') || q.get('src') || q.get('ref'); const partner = tidy(q.get('p') || q.get('partner'), 40);
  if (!src && !partner) return null;
  const source = src ? cleanSource(src) : 'partner';
  const ld = tidy(String(landing ?? '').split('?')[0].split('#')[0], 120);
  return { source, medium: tidy(q.get('utm_medium'), 40), campaign: tidy(q.get('utm_campaign'), 60), content: tidy(q.get('utm_content'), 60), term: tidy(q.get('utm_term'), 60), landing: ld, partner: partner ? partner.toUpperCase() : null, ref: null, at: nowIso };
}
/** Cookie value (short keys, URL-encoded JSON). The old first-touch cookie only had s, m, c: still readable. */
export const encodeTouch = (t: Touch): string => encodeURIComponent(JSON.stringify({ s: t.source, m: t.medium ?? '', c: t.campaign ?? '', k: t.content ?? '', e: t.term ?? '', l: t.landing ?? '', p: t.partner ?? '', t: t.at }));
export function decodeTouch(raw: string | null | undefined): Touch | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(decodeURIComponent(raw)); if (!j || typeof j !== 'object') return null;
    const e = (v: unknown, n: number) => tidy(v, n);
    return { source: cleanSource(j.s), medium: e(j.m, 40), campaign: e(j.c, 60), content: e(j.k, 60), term: e(j.e, 60), landing: e(j.l, 120), partner: e(j.p, 40), ref: null, at: typeof j.t === 'string' && !Number.isNaN(Date.parse(j.t)) ? j.t : '' };
  } catch { return null; }
}
/** First touch is never overwritten. Last touch is replaced by any newer tracked arrival. */
export function nextTouches(first: Touch | null, last: Touch | null, arrival: Touch | null): { first: Touch | null; last: Touch | null; setFirst: boolean; setLast: boolean } {
  if (!arrival) return { first, last, setFirst: false, setLast: false };
  return { first: first ?? arrival, last: arrival, setFirst: !first, setLast: true };
}
/** A social post's tracked link carries utm_content = the post's slug; that is how a signup is tied back to one post. */
export const contentSlugOf = (t: { content: string | null } | null | undefined): string | null => (t?.content ? t.content : null);
