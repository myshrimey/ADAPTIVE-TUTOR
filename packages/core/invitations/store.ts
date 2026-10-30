import type { SupabaseClient } from '@supabase/supabase-js';
import { writeAudit } from '../config-engine/config-engine';
import { newToken, tokenFromNonce, sha256Hex, looksLikeToken } from './token';
import { INVITE_ROLES, INVITE_ROLE_LABEL, type InviteRole, type InviteStatus, type CleanInvite, MSG_EXPIRED, MSG_REVOKED, MSG_NOT_FOUND, MSG_ACCEPTED, normaliseEmail } from './constants';

export interface Invitation {
  id: string; role: InviteRole; status: InviteStatus; invitee_name: string | null; invitee_email: string | null; invitee_phone: string | null; fields: Record<string, string>;
  note: string | null; department: string | null; expires_at: string; created_by: string | null; created_at: string; inviter_user: string | null; org_user: string | null;
  source: string | null; campaign: string | null; referral_code: string | null; open_count: number;
  opened_at: string | null; started_at: string | null; accepted_at: string | null; completed_at: string | null; first_login_at: string | null; activated_at: string | null; paid_at: string | null;
  revoked_at: string | null; revoked_reason: string | null; accepted_user: string | null; conflict_user: string | null; conflict_note: string | null; nonce?: string;
}
const COLS = 'id, role, status, invitee_name, invitee_email, invitee_phone, fields, note, department, expires_at, created_by, created_at, inviter_user, org_user, source, campaign, referral_code, open_count, opened_at, started_at, accepted_at, completed_at, first_login_at, activated_at, paid_at, revoked_at, revoked_reason, accepted_user, conflict_user, conflict_note';
const nowIso = () => new Date().toISOString();

export async function addEvent(service: SupabaseClient, invitationId: string, event: string, actor: string | null, detail: Record<string, unknown> = {}) {
  try { await service.from('invitation_events').insert({ invitation_id: invitationId, at: nowIso(), event, actor, detail }); } catch { /* history is best effort */ }
}
/** A pending/opened invitation past its date is expired. Applied whenever one is read, so no background job is needed. */
export function effectiveStatus(inv: { status: InviteStatus; expires_at: string }, now = Date.now()): InviteStatus {
  if ((inv.status === 'pending' || inv.status === 'opened') && new Date(inv.expires_at).getTime() <= now) return 'expired';
  return inv.status;
}
async function settleExpiry(service: SupabaseClient, inv: Invitation): Promise<Invitation> {
  const st = effectiveStatus(inv);
  if (st !== inv.status) { await service.from('invitations').update({ status: 'expired' }).eq('id', inv.id).in('status', ['pending', 'opened']); await addEvent(service, inv.id, 'expired', 'system'); return { ...inv, status: st }; }
  return inv;
}

export interface CreateArgs { actor: string; invite: CleanInvite; source?: string | null; campaign?: string | null; referralCode?: string | null; inviterUser?: string | null; orgUser?: string | null }
/** Create an invitation. Returns the token ONCE here; the founder can re-show it later with `inviteToken`. Never returns the nonce. */
export async function createInvitation(service: SupabaseClient, a: CreateArgs): Promise<{ ok: true; id: string; token: string; warning?: string } | { ok: false; error: string }> {
  const t = await newToken();
  const expires = new Date(Date.now() + a.invite.expiryDays * 86400000).toISOString();
  const existing = await findExistingAccount(service, a.invite.email);
  const { data, error } = await service.from('invitations').insert({
    token_hash: t.hash, nonce: t.nonce, role: a.invite.role, status: 'pending', invitee_name: a.invite.name, invitee_email: a.invite.email, invitee_phone: a.invite.phone,
    fields: a.invite.fields, note: a.invite.note, department: a.invite.department, expires_at: expires, created_by: a.actor, created_at: nowIso(),
    inviter_user: a.inviterUser ?? null, org_user: a.orgUser ?? null, source: a.source ?? null, campaign: a.campaign ?? null, referral_code: a.referralCode ?? null,
    conflict_user: existing?.id ?? null, conflict_note: existing ? `An account with this email already exists (${existing.role}).` : null,
  }).select('id').single();
  if (error || !data) return { ok: false, error: 'create_failed' };
  const id = (data as any).id as string;
  await addEvent(service, id, 'created', a.actor, { role: a.invite.role, expiresDays: a.invite.expiryDays });
  await writeAudit(service, { actorEmail: a.actor, action: 'invitation.create', entity: 'invitation', entityId: id, detail: { role: a.invite.role, byCentre: !!a.orgUser } });
  return { ok: true, id, token: t.token, warning: existing ? `An account with this email already exists (${INVITE_ROLE_LABEL[(existing.role as InviteRole)] ?? existing.role}). The invitation will not change that account.` : undefined };
}
/** Re-show a link to the founder: HMAC(secret, nonce). */
export async function inviteToken(service: SupabaseClient, id: string): Promise<string | null> {
  const { data } = await service.from('invitations').select('nonce').eq('id', id).maybeSingle();
  return data ? tokenFromNonce((data as any).nonce) : null;
}
export type TokenLookup = { ok: true; inv: Invitation } | { ok: false; reason: 'not_found' | 'expired' | 'revoked' | 'accepted'; message: string };
export async function lookupToken(service: SupabaseClient, token: unknown): Promise<TokenLookup> {
  if (!looksLikeToken(token)) return { ok: false, reason: 'not_found', message: MSG_NOT_FOUND };
  const hash = await sha256Hex(token);
  const { data } = await service.from('invitations').select(COLS).eq('token_hash', hash).maybeSingle();
  if (!data) return { ok: false, reason: 'not_found', message: MSG_NOT_FOUND };
  const inv = await settleExpiry(service, data as any as Invitation);
  if (inv.status === 'expired') return { ok: false, reason: 'expired', message: MSG_EXPIRED };
  if (inv.status === 'revoked' || inv.status === 'cancelled') return { ok: false, reason: 'revoked', message: MSG_REVOKED };
  if (inv.status === 'accepted') return { ok: false, reason: 'accepted', message: MSG_ACCEPTED };
  return { ok: true, inv };
}
/** The page was opened. First open sets "opened"; where it was shared from is stored on the server (first source wins). */
export async function markOpened(service: SupabaseClient, inv: Invitation, attr: { source?: string | null; campaign?: string | null; ref?: string | null }) {
  const patch: Record<string, unknown> = { open_count: (inv.open_count ?? 0) + 1 };
  if (inv.status === 'pending') { patch.status = 'opened'; patch.opened_at = nowIso(); }
  if (!inv.source && attr.source) patch.source = String(attr.source).slice(0, 40);
  if (!inv.campaign && attr.campaign) patch.campaign = String(attr.campaign).slice(0, 80);
  if (!inv.referral_code && attr.ref) patch.referral_code = String(attr.ref).slice(0, 40);
  await service.from('invitations').update(patch).eq('id', inv.id).in('status', ['pending', 'opened']);
  await addEvent(service, inv.id, 'opened', null, { source: attr.source ?? null });
}
export async function markStarted(service: SupabaseClient, inv: Invitation) {
  if (inv.started_at) return;
  await service.from('invitations').update({ started_at: nowIso() }).eq('id', inv.id).in('status', ['pending', 'opened']);
  await addEvent(service, inv.id, 'started', null);
}
/** Single use, race-safe: only ONE caller can move pending/opened → accepted. */
export async function claimInvitation(service: SupabaseClient, id: string): Promise<boolean> {
  const { data } = await service.from('invitations').update({ status: 'accepted', accepted_at: nowIso() }).eq('id', id).in('status', ['pending', 'opened']).select('id');
  return Array.isArray(data) && data.length === 1;
}
export async function releaseInvitation(service: SupabaseClient, id: string) { await service.from('invitations').update({ status: 'opened', accepted_at: null }).eq('id', id).eq('status', 'accepted').is('accepted_user', null); }
export async function completeInvitation(service: SupabaseClient, inv: Invitation, userId: string) {
  await service.from('invitations').update({ accepted_user: userId, completed_at: nowIso() }).eq('id', inv.id);
  await addEvent(service, inv.id, 'completed', null, { role: inv.role });
  if (inv.org_user) {
    const memberRole = inv.role === 'student' || inv.role === 'teacher' || inv.role === 'tutor' ? inv.role : null;
    if (memberRole) { await service.from('org_members').insert({ org_user: inv.org_user, member_user: userId, member_role: memberRole, added_by: inv.created_by, invitation_id: inv.id }); await addEvent(service, inv.id, 'joined_centre', null); }
  }
  await writeAudit(service, { actorEmail: null, action: 'invitation.accepted', entity: 'invitation', entityId: inv.id, detail: { role: inv.role, userId } });
}

export async function findExistingAccount(service: SupabaseClient, email: string | null | undefined): Promise<{ id: string; role: string } | null> {
  const e = normaliseEmail(email); if (!e) return null;
  const a = await service.from('users').select('id, role').eq('email', e).maybeSingle();
  if (a.data) return a.data as any;
  const b = await service.from('users').select('id, role').eq('contact_email', e).maybeSingle();
  return (b.data as any) ?? null;
}
/** Existing account: never a duplicate, never a silent role change. The conflict is flagged; if the roles differ a role-change REQUEST is logged for the founder. */
export async function flagExisting(service: SupabaseClient, inv: Invitation, existing: { id: string; role: string }) {
  await service.from('invitations').update({ conflict_user: existing.id, conflict_note: `An account already exists with this email (${existing.role}). Invited as ${inv.role}.` }).eq('id', inv.id);
  if (existing.role !== inv.role) {
    const { data: open } = await service.from('role_changes').select('id').eq('user_id', existing.id).eq('requested_role', inv.role).eq('status', 'pending').maybeSingle();
    if (!open) await service.from('role_changes').insert({ user_id: existing.id, previous_role: existing.role, requested_role: inv.role, status: 'pending', reason: 'Invited with an email that already has an account', requested_by: 'invitation', invitation_id: inv.id });
  }
  await addEvent(service, inv.id, 'existing_account', null, { existingRole: existing.role });
}

export type InviteAction = 'revoke' | 'cancel' | 'reissue' | 'extend';
export async function actOnInvitation(service: SupabaseClient, actor: string, id: string, action: InviteAction, opts: { reason?: string; days?: number } = {}): Promise<{ ok: boolean; error?: string; token?: string; id?: string }> {
  const { data } = await service.from('invitations').select(COLS).eq('id', id).maybeSingle();
  if (!data) return { ok: false, error: 'not_found' };
  const inv = await settleExpiry(service, data as any as Invitation);
  if (inv.status === 'accepted') return { ok: false, error: 'already_accepted' };
  const reason = String(opts.reason ?? '').trim().slice(0, 200) || null;
  if (action === 'revoke' || action === 'cancel') {
    if (inv.status === 'revoked' || inv.status === 'cancelled') return { ok: false, error: 'already_closed' };
    await service.from('invitations').update({ status: action === 'revoke' ? 'revoked' : 'cancelled', revoked_at: nowIso(), revoked_reason: reason }).eq('id', id).neq('status', 'accepted');
    await addEvent(service, id, action === 'revoke' ? 'revoked' : 'cancelled', actor, { reason });
    await writeAudit(service, { actorEmail: actor, action: `invitation.${action}`, entity: 'invitation', entityId: id, detail: { reason } });
    return { ok: true };
  }
  if (action === 'extend') {
    if (inv.status === 'revoked' || inv.status === 'cancelled') return { ok: false, error: 'closed' };
    const d = Math.min(90, Math.max(1, Math.round(Number(opts.days ?? 14))));
    await service.from('invitations').update({ expires_at: new Date(Date.now() + d * 86400000).toISOString(), status: inv.status === 'expired' ? 'pending' : inv.status }).eq('id', id);
    await addEvent(service, id, 'extended', actor, { days: d }); await writeAudit(service, { actorEmail: actor, action: 'invitation.extend', entity: 'invitation', entityId: id, detail: { days: d } });
    return { ok: true };
  }
  // reissue: a NEW token and expiry. The old link is closed so it can never be used again.
  if (inv.status !== 'revoked' && inv.status !== 'cancelled') await service.from('invitations').update({ status: 'cancelled', revoked_at: nowIso(), revoked_reason: 'Replaced by a new invitation' }).eq('id', id);
  const created = await createInvitation(service, { actor, invite: { role: inv.role, name: inv.invitee_name ?? '', email: inv.invitee_email, phone: inv.invitee_phone, fields: inv.fields ?? {}, note: inv.note, expiryDays: Math.min(90, Math.max(1, Number(opts.days ?? 14))), department: inv.department }, source: inv.source, campaign: inv.campaign, referralCode: inv.referral_code, inviterUser: inv.inviter_user, orgUser: inv.org_user });
  if (!created.ok) return { ok: false, error: created.error };
  await addEvent(service, id, 'reissued', actor, { newInvitation: created.id });
  return { ok: true, token: created.token, id: created.id };
}

export interface ListFilter { status?: string; role?: string; q?: string; createdBy?: string; source?: string; orgUser?: string }
export async function listInvitations(service: SupabaseClient, f: ListFilter = {}, limit = 300): Promise<Invitation[]> {
  let q = service.from('invitations').select(COLS).order('created_at', { ascending: false }).limit(limit);
  if (f.role && (INVITE_ROLES as readonly string[]).includes(f.role)) q = q.eq('role', f.role);
  if (f.createdBy) q = q.eq('created_by', f.createdBy);
  if (f.source) q = q.eq('source', f.source);
  if (f.orgUser) q = q.eq('org_user', f.orgUser);
  const { data } = await q;
  let rows = ((data ?? []) as any[]).map((r) => ({ ...r, status: effectiveStatus(r) })) as Invitation[];
  if (f.status) rows = rows.filter((r) => r.status === f.status);
  if (f.q) { const n = f.q.toLowerCase(); rows = rows.filter((r) => `${r.invitee_name ?? ''} ${r.invitee_email ?? ''} ${r.invitee_phone ?? ''}`.toLowerCase().includes(n)); }
  return rows;
}
export async function invitationDetail(service: SupabaseClient, id: string) {
  const { data } = await service.from('invitations').select(COLS).eq('id', id).maybeSingle();
  if (!data) return null;
  const inv = { ...(data as any), status: effectiveStatus(data as any) } as Invitation;
  const { data: ev } = await service.from('invitation_events').select('id, at, event, actor, detail').eq('invitation_id', id).order('at', { ascending: true }).limit(200);
  const { data: rc } = inv.conflict_user ? await service.from('role_changes').select('id, previous_role, requested_role, status, decided_by, decided_at, created_at').eq('user_id', inv.conflict_user).order('created_at', { ascending: false }).limit(10) : { data: [] as any[] };
  return { inv, events: (ev ?? []) as any[], roleChanges: (rc ?? []) as any[] };
}

/** Fill in the later funnel steps from what the database already knows (first sign-in device, any learning activity, a paid plan). Best effort. */
export async function syncProgress(service: SupabaseClient, limit = 100): Promise<number> {
  const { data } = await service.from('invitations').select('id, role, accepted_user, first_login_at, activated_at, paid_at').eq('status', 'accepted').not('accepted_user', 'is', null).limit(limit);
  let n = 0;
  for (const r of (data ?? []) as any[]) {
    if (r.first_login_at && r.activated_at && (r.paid_at || r.role !== 'student')) continue;
    const patch: Record<string, string> = {};
    try {
      const { data: u } = await service.from('users').select('auth_user_id').eq('id', r.accepted_user).maybeSingle();
      if (u && !r.first_login_at) { const { data: d } = await service.from('account_devices').select('first_seen').eq('auth_user_id', (u as any).auth_user_id).order('first_seen', { ascending: true }).limit(1); if (d?.[0]) patch.first_login_at = (d[0] as any).first_seen; }
      if (r.role === 'student') {
        const { data: s } = await service.from('students').select('id').eq('user_id', r.accepted_user).maybeSingle();
        if (s) {
          if (!r.activated_at) { const { data: e } = await service.from('learning_events').select('created_at').eq('student_id', (s as any).id).order('created_at', { ascending: true }).limit(1); if (e?.[0]) patch.activated_at = (e[0] as any).created_at; }
          if (!r.paid_at) { const { data: a } = await service.from('student_access').select('plan_code, created_at').eq('student_id', (s as any).id).neq('plan_code', 'free').limit(1); if (a?.[0]) patch.paid_at = (a[0] as any).created_at ?? nowIso(); }
        }
      } else if (!r.activated_at && (patch.first_login_at || r.first_login_at)) patch.activated_at = patch.first_login_at ?? r.first_login_at;
    } catch { /* best effort */ }
    if (Object.keys(patch).length) { await service.from('invitations').update(patch).eq('id', r.id); n++; }
  }
  return n;
}
export interface InviteStats { total: number; byStatus: Record<string, number>; byRole: Record<string, number>; bySource: Record<string, number>; byCreator: Record<string, number>; funnel: { step: string; count: number }[]; conflicts: number }
export function inviteStats(rows: Invitation[]): InviteStats {
  const by = (k: (r: Invitation) => string | null) => { const o: Record<string, number> = {}; for (const r of rows) { const v = k(r) ?? 'Not recorded'; o[v] = (o[v] ?? 0) + 1; } return o; };
  const c = (f: (r: Invitation) => unknown) => rows.filter((r) => !!f(r)).length;
  return { total: rows.length, byStatus: by((r) => r.status), byRole: by((r) => r.role), bySource: by((r) => r.source), byCreator: by((r) => r.created_by?.startsWith('centre:') ? 'Coaching centre' : r.created_by),
    funnel: [{ step: 'Created', count: rows.length }, { step: 'Opened', count: c((r) => r.opened_at || r.open_count > 0) }, { step: 'Started', count: c((r) => r.started_at || r.completed_at) }, { step: 'Completed', count: c((r) => r.completed_at) },
      { step: 'First login', count: c((r) => r.first_login_at) }, { step: 'Activated', count: c((r) => r.activated_at) }, { step: 'Paid', count: c((r) => r.paid_at) }],
    conflicts: c((r) => r.conflict_user && r.status !== 'accepted') };
}
// Role-change decisions (founder only). Only adult-to-adult changes are carried out; anything involving a student account is refused.
export async function decideRoleChange(service: SupabaseClient, actor: string, id: string, approve: boolean, reason?: string): Promise<{ ok: boolean; error?: string }> {
  const { data: rc } = await service.from('role_changes').select('id, user_id, previous_role, requested_role, status, invitation_id').eq('id', id).maybeSingle();
  if (!rc) return { ok: false, error: 'not_found' };
  const r = rc as any; if (r.status !== 'pending') return { ok: false, error: 'already_decided' };
  const note = String(reason ?? '').trim().slice(0, 200) || null;
  if (approve) {
    const adult = ['parent', 'tutor', 'centre', 'teacher'];
    if (!adult.includes(r.previous_role) || !adult.includes(r.requested_role)) return { ok: false, error: 'student_accounts_are_not_converted' };
    const { data: cur } = await service.from('users').select('role').eq('id', r.user_id).maybeSingle();
    if (!cur || (cur as any).role !== r.previous_role) return { ok: false, error: 'account_changed' };
    const { data: inv } = r.invitation_id ? await service.from('invitations').select('invitee_name, fields').eq('id', r.invitation_id).maybeSingle() : { data: null as any };
    const name = (inv as any)?.invitee_name ?? 'Member'; const f = ((inv as any)?.fields ?? {}) as Record<string, string>;
    if (r.requested_role === 'teacher') await service.from('teacher_profiles').upsert({ user_id: r.user_id, display_name: name, subjects: f.subjects ?? null, school: f.school ?? null, status: 'approved' }, { onConflict: 'user_id' });
    else await service.from('adult_profiles').upsert({ user_id: r.user_id, role: r.requested_role, display_name: name, subjects: f.subjects ?? null, city: f.city ?? f.location ?? null, status: 'active', approved_at: nowIso() }, { onConflict: 'user_id' });
    const { error } = await service.from('users').update({ role: r.requested_role }).eq('id', r.user_id);
    if (error) return { ok: false, error: 'update_failed' };
  }
  await service.from('role_changes').update({ status: approve ? 'approved' : 'rejected', decided_by: actor, decided_at: nowIso(), reason: note ?? undefined }).eq('id', id);
  await writeAudit(service, { actorEmail: actor, action: approve ? 'role.change.approved' : 'role.change.rejected', entity: 'user', entityId: r.user_id, detail: { previous: r.previous_role, requested: r.requested_role, reason: note } });
  return { ok: true };
}
