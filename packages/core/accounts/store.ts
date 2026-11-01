import type { SupabaseClient } from '@supabase/supabase-js';
import { writeAudit } from '../config-engine/config-engine';
import { accessState, collapseEvents, filterAccounts, initials, maskEmail, shortId, sortTimeline, type AccountFilter, type AccountKind, type AccountRow, type TimelineItem } from './logic';

// v92: READ-ONLY account directory and snapshot. This file must never insert, update, delete or upsert anything
// except the audit line (writeAudit); test t92 checks that. It never creates a login session as another person.
const MAX_ACCOUNTS = 3000;
const rowsOf = async (q: any): Promise<any[]> => { try { const r = await q; return r?.data ?? []; } catch { return []; } };

export interface Directory { rows: AccountRow[]; total: number; shown: number; truncated: boolean; emailById: Record<string, string> }

export async function loadDirectory(service: SupabaseClient, filter: AccountFilter, now = new Date()): Promise<Directory> {
  const today = now.toISOString().slice(0, 10);
  const users = await rowsOf(service.from('users').select('id, email, role, created_at, source').limit(MAX_ACCOUNTS));
  const ids = users.map((u: any) => u.id);
  const [students, access, adults, teachers] = await Promise.all([
    rowsOf(service.from('students').select('id, user_id, display_name, grade').limit(MAX_ACCOUNTS)),
    rowsOf(service.from('student_access').select('student_id, plan_code, access_until').limit(MAX_ACCOUNTS)),
    rowsOf(service.from('adult_profiles').select('user_id, role, display_name, status').limit(MAX_ACCOUNTS)),
    rowsOf(service.from('teacher_profiles').select('user_id, display_name, status').limit(MAX_ACCOUNTS)),
  ]);
  const stByUser = new Map<string, any>(); for (const s of students) if (!stByUser.has(s.user_id)) stByUser.set(s.user_id, s);
  const acc = new Map<string, any>(); for (const a of access) acc.set(a.student_id, a);
  const ad = new Map<string, any>(); for (const a of adults) ad.set(a.user_id, a);
  const tp = new Map<string, any>(); for (const t of teachers) tp.set(t.user_id, t);
  // last learning activity per student: newest events first, then keep the first seen per student
  const stIds = students.map((s: any) => s.id);
  const events = stIds.length ? await rowsOf(service.from('learning_events').select('student_id, created_at').in('student_id', stIds).limit(20000)) : [];
  const last = new Map<string, string>(); for (const e of events) { const c = last.get(e.student_id); if (e.created_at && (!c || e.created_at > c)) last.set(e.student_id, e.created_at); }

  const emailById: Record<string, string> = {}; const rows: AccountRow[] = [];
  for (const u of users) {
    emailById[u.id] = String(u.email ?? '');
    let kind: AccountKind = (['student', 'parent', 'tutor', 'centre', 'teacher', 'admin'] as string[]).includes(u.role) ? u.role : 'student';
    const st = stByUser.get(u.id); const a = ad.get(u.id); const t = tp.get(u.id);
    if (a && ['parent', 'tutor', 'centre'].includes(a.role)) kind = a.role;
    let status = 'active', plan: string | null = null, name = '', grade: string | null = null, studentId: string | null = null, lastAct: string | null = null;
    if (kind === 'student' && st) { const ac = acc.get(st.id); status = accessState(!!ac, ac?.access_until, today); plan = ac?.plan_code ?? null; name = st.display_name; grade = st.grade ?? null; studentId = st.id; lastAct = last.get(st.id) ?? null; }
    else if (kind === 'student') status = 'no_access';
    else if (kind === 'teacher') { status = t?.status ?? 'active'; name = t?.display_name ?? ''; }
    else if (a) { status = a.status ?? 'active'; name = a.display_name ?? ''; }
    rows.push({ id: u.id, studentId, kind, shortId: shortId(u.id), maskedEmail: maskEmail(u.email), initials: initials(name), grade, plan, status, registered: String(u.created_at ?? ''), lastActivity: lastAct, source: u.source ?? null });
  }
  rows.sort((x, y) => (y.registered > x.registered ? 1 : -1));
  const filtered = filterAccounts(rows, filter, now, emailById);
  return { rows: filtered.slice(0, 500), total: rows.length, shown: Math.min(filtered.length, 500), truncated: users.length >= MAX_ACCOUNTS || filtered.length > 500, emailById: {} };
}

export interface Snapshot {
  found: boolean; id: string; shortId: string; kind: AccountKind | null; maskedEmail: string; initials: string; registered: string; source: string | null;
  grade: string | null; plan: string | null; accessUntil: string | null; subjectLimit: number | null; status: string; lastActivity: string | null; devices: number;
  subjects: string[]; links: { who: string; shortId: string; initials: string; type: string; status: string }[]; payments: { at: string; status: string; amount: number }[];
  reports: number; timeline: TimelineItem[];
}
const EMPTY: Snapshot = { found: false, id: '', shortId: '', kind: null, maskedEmail: '', initials: '', registered: '', source: null, grade: null, plan: null, accessUntil: null, subjectLimit: null, status: '', lastActivity: null, devices: 0, subjects: [], links: [], payments: [], reports: 0, timeline: [] };

/** One account, masked. Records "account.view" in the audit trail every time it is opened (also when the account is not found). */
export async function loadSnapshot(service: SupabaseClient, userId: string, actorEmail: string, now = new Date()): Promise<Snapshot> {
  const id = String(userId ?? '').slice(0, 64);
  const today = now.toISOString().slice(0, 10);
  const user = (await rowsOf(service.from('users').select('id, auth_user_id, email, role, created_at, source').eq('id', id)))[0];
  if (!user) { await writeAudit(service, { actorEmail, actorRole: 'super_admin', action: 'account.view', entity: 'account', entityId: shortId(id), targetAccount: id, outcome: 'failed', detail: { reason: 'not_found' } }); return { ...EMPTY, id }; }
  const [st, ad, tp, devs] = await Promise.all([
    rowsOf(service.from('students').select('id, display_name, grade').eq('user_id', id)),
    rowsOf(service.from('adult_profiles').select('role, display_name, status, created_at').eq('user_id', id)),
    rowsOf(service.from('teacher_profiles').select('display_name, status, created_at').eq('user_id', id)),
    rowsOf(service.from('account_devices').select('first_seen, last_seen').eq('auth_user_id', user.auth_user_id)),
  ]);
  const s0 = st[0], a0 = ad[0], t0 = tp[0];
  let kind: AccountKind = (['student', 'parent', 'tutor', 'centre', 'teacher', 'admin'] as string[]).includes(user.role) ? user.role : 'student';
  if (a0 && ['parent', 'tutor', 'centre'].includes(a0.role)) kind = a0.role;
  const snap: Snapshot = { ...EMPTY, found: true, id, shortId: shortId(id), kind, maskedEmail: maskEmail(user.email), initials: initials(s0?.display_name ?? a0?.display_name ?? t0?.display_name ?? ''), registered: String(user.created_at ?? ''), source: user.source ?? null, grade: s0?.grade ?? null, status: a0?.status ?? t0?.status ?? 'active', devices: devs.length };
  const tl: TimelineItem[] = [{ at: snap.registered, what: 'Account created' }];
  for (const d of devs) if (d.first_seen) tl.push({ at: d.first_seen, what: 'A device was registered' });
  if (devs.length) snap.lastActivity = devs.map((d: any) => d.last_seen).filter(Boolean).sort().pop() ?? null; // last sign-in device use, overwritten below if learning is newer

  if (s0) {
    const sid = s0.id;
    const [acc, goals, links, pays, reps, evs] = await Promise.all([
      rowsOf(service.from('student_access').select('plan_code, subject_limit, access_until, granted_at, updated_at').eq('student_id', sid)),
      rowsOf(service.from('learning_goals').select('subject_id, status').eq('student_id', sid)),
      rowsOf(service.from('student_links').select('adult_user_id, link_type, status, created_at, revoked_at').eq('student_id', sid)),
      rowsOf(service.from('pilot_payments').select('amount, status, created_at').eq('student_id', sid)),
      rowsOf(service.from('test_reports').select('kind, score, total, taken_at').eq('student_id', sid).eq('audience', 'adult')),
      rowsOf(service.from('learning_events').select('event_type, created_at').eq('student_id', sid).limit(5000)),
    ]);
    const a = acc[0]; snap.plan = a?.plan_code ?? null; snap.accessUntil = a?.access_until ?? null; snap.subjectLimit = a?.subject_limit ?? null;
    snap.status = accessState(!!a, a?.access_until, today);
    if (a?.granted_at) tl.push({ at: a.granted_at, what: `Access granted: ${a.plan_code}` });
    if (a?.updated_at && a.updated_at !== a.granted_at) tl.push({ at: a.updated_at, what: 'Access or plan last changed' });
    const subIds = goals.filter((g: any) => g.status === 'active').map((g: any) => g.subject_id);
    const subs = subIds.length ? await rowsOf(service.from('subjects').select('id, name, slug').in('id', subIds)) : [];
    snap.subjects = subs.map((x: any) => String(x.name ?? x.slug ?? '')).filter(Boolean);
    const adultIds = links.map((l: any) => l.adult_user_id);
    const adults = adultIds.length ? await rowsOf(service.from('adult_profiles').select('user_id, display_name').in('user_id', adultIds)) : [];
    const nm = new Map<string, string>(adults.map((x: any) => [x.user_id, x.display_name]));
    snap.links = links.map((l: any) => ({ who: 'Linked adult', shortId: shortId(l.adult_user_id), initials: initials(nm.get(l.adult_user_id) ?? ''), type: l.link_type, status: l.status }));
    for (const l of links) { tl.push({ at: l.created_at, what: `Linked to a ${l.link_type}` }); if (l.revoked_at) tl.push({ at: l.revoked_at, what: `Link to a ${l.link_type} ended` }); }
    snap.payments = pays.map((p: any) => ({ at: p.created_at, status: p.status, amount: Number(p.amount) })).sort((x: any, y: any) => (y.at > x.at ? 1 : -1));
    for (const p of snap.payments) tl.push({ at: p.at, what: `Payment claim ${p.status}`, detail: `INR ${p.amount}` });
    snap.reports = reps.length;
    for (const r of reps) tl.push({ at: r.taken_at, what: `Test finished: ${String(r.kind).replace(/_/g, ' ')}`, detail: r.total != null ? `${r.score ?? '?'} of ${r.total}` : undefined });
    const cutoff = now.getTime() - 30 * 86400000;
    tl.push(...collapseEvents(evs.filter((e: any) => Date.parse(e.created_at) >= cutoff)));
    const newest = evs.map((e: any) => e.created_at).filter(Boolean).sort().pop();
    if (newest && (!snap.lastActivity || newest > snap.lastActivity)) snap.lastActivity = newest;
  } else if (a0) {
    const links = await rowsOf(service.from('student_links').select('student_id, link_type, status, created_at').eq('adult_user_id', id));
    const sIds = links.map((l: any) => l.student_id);
    const sts = sIds.length ? await rowsOf(service.from('students').select('id, display_name').in('id', sIds)) : [];
    const nm = new Map<string, string>(sts.map((x: any) => [x.id, x.display_name]));
    snap.links = links.map((l: any) => ({ who: 'Linked student', shortId: shortId(l.student_id), initials: initials(nm.get(l.student_id) ?? ''), type: l.link_type, status: l.status }));
    for (const l of links) tl.push({ at: l.created_at, what: `Linked to a student (${l.link_type})` });
  }
  snap.timeline = sortTimeline(tl, 100);
  await writeAudit(service, { actorEmail, actorRole: 'super_admin', action: 'account.view', entity: 'account', entityId: shortId(id), targetAccount: id, outcome: 'success', detail: { kind } });
  return snap;
}

/** Every directory open is recorded too (the filters used and how many accounts matched; never the list itself). */
export async function auditDirectoryView(service: SupabaseClient, actorEmail: string, filter: AccountFilter, matched: number): Promise<void> {
  const f: Record<string, unknown> = {}; for (const [k, v] of Object.entries(filter)) if (v) f[k] = k === 'q' ? 'search used' : v;
  await writeAudit(service, { actorEmail, actorRole: 'super_admin', action: 'account.directory_view', entity: 'account_directory', outcome: 'success', detail: { filters: JSON.stringify(f), matched } });
}
