// Time filters for every founder dashboard. India time (UTC+5:30). Returns ISO bounds; null from = all time.
export const RANGES: [string, string][] = [['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['month', 'This month'], ['quarter', 'This quarter'], ['year', 'This year'], ['all', 'All time'], ['custom', 'Custom']];
const OFF = 330 * 60000;

export interface RangeBounds { key: string; label: string; from: string | null; to: string | null }

export function rangeBounds(key: string, opts: { from?: string; to?: string } = {}, now: Date = new Date()): RangeBounds {
  const ist = new Date(now.getTime() + OFF);
  const y = ist.getUTCFullYear(), m = ist.getUTCMonth(), d = ist.getUTCDate();
  const startOfIstDay = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd) - OFF).toISOString();
  const label = RANGES.find((r) => r[0] === key)?.[1] ?? 'Last 30 days';
  switch (key) {
    case 'today': return { key, label, from: startOfIstDay(y, m, d), to: null };
    case '7': return { key, label, from: startOfIstDay(y, m, d - 6), to: null };
    case '90': return { key, label, from: startOfIstDay(y, m, d - 89), to: null };
    case 'month': return { key, label, from: startOfIstDay(y, m, 1), to: null };
    case 'quarter': return { key, label, from: startOfIstDay(y, Math.floor(m / 3) * 3, 1), to: null };
    case 'year': return { key, label, from: startOfIstDay(y, 0, 1), to: null };
    case 'all': return { key, label, from: null, to: null };
    case 'custom': {
      const ok = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
      const f = ok(opts.from) ? new Date(opts.from + 'T00:00:00+05:30').toISOString() : null;
      const t = ok(opts.to) ? new Date(new Date(opts.to + 'T00:00:00+05:30').getTime() + 86400000).toISOString() : null;
      return { key, label: `${opts.from || '…'} to ${opts.to || 'now'}`, from: f, to: t };
    }
    default: return { key: '30', label: 'Last 30 days', from: startOfIstDay(y, m, d - 29), to: null };
  }
}

export function inRange(iso: string | null | undefined, r: { from: string | null; to: string | null }): boolean {
  if (!iso) return false;
  if (r.from && iso < r.from) return false;
  if (r.to && iso >= r.to) return false;
  return true;
}
/** date-only column (YYYY-MM-DD) against a range */
export function dateInRange(day: string | null | undefined, r: { from: string | null; to: string | null }): boolean {
  if (!day) return false;
  return inRange(new Date(day + 'T00:00:00+05:30').toISOString(), r);
}
