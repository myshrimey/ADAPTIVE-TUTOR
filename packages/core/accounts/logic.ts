// v92: pure rules for the read-only account directory. No database access here.
export type AccountKind = 'student' | 'parent' | 'tutor' | 'centre' | 'teacher' | 'admin';
export const ACCOUNT_KINDS: readonly AccountKind[] = ['student', 'parent', 'tutor', 'centre', 'teacher', 'admin'];
export const KIND_LABEL: Record<AccountKind, string> = { student: 'Student', parent: 'Parent', tutor: 'Tutor', centre: 'Coaching centre', teacher: 'Teacher', admin: 'Admin' };

export interface AccountRow {
  id: string;              // users.id
  studentId: string | null;
  kind: AccountKind;
  shortId: string;
  maskedEmail: string;
  initials: string;        // never a full name
  grade: string | null;
  plan: string | null;
  status: string;          // students: active | expired | no_access; adults/teachers: their profile status
  registered: string;      // ISO date-time
  lastActivity: string | null;
  source: string | null;
}

/** "ab***@gmail.com". Never returns the whole address. */
export function maskEmail(email: unknown): string {
  const e = String(email ?? '').trim();
  const at = e.lastIndexOf('@');
  if (at < 1) return e ? '***' : '';
  const local = e.slice(0, at), domain = e.slice(at + 1);
  return `${local.slice(0, Math.min(2, Math.max(1, local.length - 1)))}***@${domain}`;
}
/** "A. T." from a display name. */
export function initials(name: unknown): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
  return parts.map((p) => p[0].toUpperCase() + '.').join(' ');
}
export const shortId = (id: unknown): string => String(id ?? '').slice(0, 8);

/** Student access state from the end date (YYYY-MM-DD). No date = no end. */
export function accessState(hasAccessRow: boolean, accessUntil: string | null | undefined, today: string): 'active' | 'expired' | 'no_access' {
  if (!hasAccessRow) return 'no_access';
  if (accessUntil && String(accessUntil).slice(0, 10) < today) return 'expired';
  return 'active';
}

export interface AccountFilter { kind?: string; plan?: string; status?: string; from?: string; to?: string; activity?: string; q?: string }
const ymd = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) ? String(v) : '');
export function cleanFilter(raw: Record<string, unknown>): AccountFilter {
  const s = (v: unknown, n: number) => String(Array.isArray(v) ? v[0] : v ?? '').trim().slice(0, n);
  const kind = s(raw.kind, 12); const activity = s(raw.activity, 8);
  return {
    kind: (ACCOUNT_KINDS as readonly string[]).includes(kind) ? kind : '',
    plan: s(raw.plan, 40).replace(/[^a-z0-9_-]/gi, ''), status: s(raw.status, 20).replace(/[^a-z_]/g, ''),
    from: ymd(s(raw.from, 10)), to: ymd(s(raw.to, 10)),
    activity: ['7d', '30d', 'never', 'stale'].includes(activity) ? activity : '', q: s(raw.q, 80).toLowerCase(),
  };
}
/** activity: 7d / 30d = active in that many days; never = no recorded learning activity; stale = recorded but older than 30 days. */
export function filterAccounts(rows: AccountRow[], f: AccountFilter, now: Date, emailById: Record<string, string> = {}): AccountRow[] {
  const day = 86400000;
  return rows.filter((r) => {
    if (f.kind && r.kind !== f.kind) return false;
    if (f.plan && r.plan !== f.plan) return false;
    if (f.status && r.status !== f.status) return false;
    const reg = r.registered.slice(0, 10);
    if (f.from && reg < f.from) return false;
    if (f.to && reg > f.to) return false;
    if (f.activity) {
      const t = r.lastActivity ? Date.parse(r.lastActivity) : NaN;
      const age = Number.isNaN(t) ? Infinity : now.getTime() - t;
      if (f.activity === '7d' && !(age <= 7 * day)) return false;
      if (f.activity === '30d' && !(age <= 30 * day)) return false;
      if (f.activity === 'never' && !Number.isNaN(t)) return false;
      if (f.activity === 'stale' && !(age > 30 * day && age !== Infinity)) return false;
    }
    if (f.q) { const hay = `${r.shortId} ${r.id} ${(emailById[r.id] ?? '').toLowerCase()}`; if (!hay.includes(f.q)) return false; }
    return true;
  });
}
export function countBy<T>(rows: T[], key: (r: T) => string): Record<string, number> { const o: Record<string, number> = {}; for (const r of rows) { const k = key(r) || 'none'; o[k] = (o[k] ?? 0) + 1; } return o; }

export interface TimelineItem { at: string; what: string; detail?: string }
/** Newest first, at most `limit`. Rows without a valid date are dropped. */
export function sortTimeline(items: TimelineItem[], limit = 100): TimelineItem[] {
  return items.filter((i) => i.at && !Number.isNaN(Date.parse(i.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
}
/** Learning events collapsed to "N events of type X on day D": no payload, no content. */
export function collapseEvents(events: { event_type: string; created_at: string }[]): TimelineItem[] {
  const m = new Map<string, number>();
  for (const e of events) { if (!e.created_at) continue; const k = `${e.created_at.slice(0, 10)}|${e.event_type}`; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([k, n]) => { const [d, t] = k.split('|'); return { at: `${d}T23:59:59Z`, what: `Learning: ${t.replace(/_/g, ' ')}`, detail: n > 1 ? `${n} times that day` : undefined }; });
}
