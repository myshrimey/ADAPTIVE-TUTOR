import { fakeDb } from './fakedb2';
import * as core from '../packages/core';
const { validateInvite, createInvitation, lookupToken, markOpened, markStarted, claimInvitation, releaseInvitation, completeInvitation, actOnInvitation, listInvitations, inviteStats, inviteToken,
  findExistingAccount, flagExisting, decideRoleChange, effectiveStatus, can, cleanPermissions, permissionForPath, visiblePath, TEAM_PRESETS, saveTeamMember, teamMemberByEmail,
  shareLinks, inviteMessage, withSource, sha256Hex, looksLikeToken, MSG_EXPIRED, MSG_REVOKED, ROLE_FIELDS, INVITE_ROLES, syncProgress, invitationDetail } = core as any;
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
process.env.INVITE_SECRET = 'test-secret-1'; process.env.ADMIN_EMAILS = 'founder@x.com';
(async () => {
  const mk = () => fakeDb({ invitations: [], invitation_events: [], users: [], role_changes: [], org_members: [], audit_logs: [], admin_team: [], students: [], account_devices: [], learning_events: [], student_access: [], adult_profiles: [], teacher_profiles: [] }, { unique: { org_members: [['org_user', 'member_user']] } });
  let db: any = mk(); const T = db._tables;
  // ---- validation: one role per invitation, minimum fields per role ----
  ok(!validateInvite({ role: 'admin', name: 'A', email: 'a@b.co' }).ok, 'role admin cannot be invited');
  ok(!validateInvite({ role: 'superuser', name: 'A', email: 'a@b.co' }).ok, 'unknown role refused');
  ok(!validateInvite({ role: 'tutor', name: '', email: 'a@b.co', fields: { subjects: 'M', boards: 'CBSE' } }).ok, 'name required');
  ok(!validateInvite({ role: 'tutor', name: 'Arun' , fields: { subjects: 'M', boards: 'CBSE' } }).ok, 'email OR phone required');
  ok(validateInvite({ role: 'tutor', name: 'Arun', phone: '98765 43210', fields: { subjects: 'M', boards: 'CBSE' } }).ok, 'phone alone is enough');
  ok(!validateInvite({ role: 'tutor', name: 'Arun', email: 'a@b.co', fields: { subjects: 'M' } }).ok, 'tutor needs boards');
  ok(!validateInvite({ role: 'centre', name: 'Own', email: 'a@b.co', fields: { centre_name: 'C', boards: 'CBSE', subjects: 'M' } }).ok, 'centre needs classes');
  ok(!validateInvite({ role: 'student', name: 'S', email: 'a@b.co', fields: { class: 'Class 10', board: 'CBSE', medium: 'Klingon', subjects: 'M' } }).ok, 'select options enforced');
  ok(validateInvite({ role: 'parent', name: 'P', email: 'p@b.co' }).ok, 'parent minimum is name + contact');
  ok(!validateInvite({ role: 'parent', name: 'P', email: 'not-an-email' }).ok, 'bad email refused');
  const v1: any = validateInvite({ role: 'parent', name: 'P', email: 'p@b.co', expiryDays: 9999 }); ok(v1.value.expiryDays === 90, 'expiry capped at 90 days');
  const xss: any = validateInvite({ role: 'parent', name: '<script>alert(1)</script>', email: 'p@b.co', fields: { __proto__: { x: 1 }, child_name: 'K' } }); ok(xss.ok && !('x' in xss.value.fields), 'unknown/proto fields dropped');
  for (const r of INVITE_ROLES) ok(ROLE_FIELDS[r].length > 0, 'fields for ' + r);

  // ---- create / token ----
  const tutor: any = validateInvite({ role: 'tutor', name: 'Arun', email: 'Arun@Example.com', fields: { subjects: 'Maths', boards: 'CBSE' } }).value;
  const c: any = await createInvitation(db, { actor: 'founder@x.com', invite: tutor, source: 'whatsapp', campaign: 'tutor-onboarding' });
  ok(c.ok && looksLikeToken(c.token) && c.token.length === 43, 'token is 43 url-safe chars');
  ok(T.invitations[0].invitee_email === 'arun@example.com', 'email normalised');
  ok(!JSON.stringify(T.invitations[0]).includes(c.token), 'token itself is never stored');
  ok(T.invitations[0].token_hash === await sha256Hex(c.token), 'only the hash is stored');
  ok((await inviteToken(db, c.id)) === c.token, 'founder can re-show the same link');
  const c2: any = await createInvitation(db, { actor: 'founder@x.com', invite: tutor });
  ok(c2.token !== c.token, 'tokens are unique');
  ok(!(await lookupToken(db, 'x'.repeat(43))).ok && (await lookupToken(db, 'short')).reason === 'not_found', 'guessed/short token = not found');
  const secretB = process.env.INVITE_SECRET; process.env.INVITE_SECRET = 'other'; ok((await inviteToken(db, c.id)) !== c.token, 'nonce is useless without the server secret'); process.env.INVITE_SECRET = secretB;
  ok(T.audit_logs.some((a: any) => a.action === 'invitation.create') && !JSON.stringify(T.audit_logs).includes(c.token), 'audit written, no token in it');
  ok(T.invitation_events.some((e: any) => e.event === 'created'), 'event history');

  // ---- opening, statuses ----
  let look: any = await lookupToken(db, c.token); ok(look.ok && look.inv.role === 'tutor', 'valid token finds the invitation, role from the row');
  await markOpened(db, look.inv, { source: 'whatsapp', campaign: 'x', ref: null });
  ok(T.invitations[0].status === 'opened' && T.invitations[0].open_count === 1, 'opened');
  look = await lookupToken(db, c.token); await markOpened(db, look.inv, { source: 'facebook' }); ok(T.invitations[0].source === 'whatsapp' && T.invitations[0].open_count === 2, 'first source kept, counts opens');
  await markStarted(db, look.inv); ok(!!T.invitations[0].started_at, 'started recorded');

  // ---- single use + race ----
  const [a1, a2] = await Promise.all([claimInvitation(db, c.id), claimInvitation(db, c.id)]); ok([a1, a2].filter(Boolean).length === 1, 'only ONE of two simultaneous accepts wins');
  const reuse: any = await lookupToken(db, c.token); ok(!reuse.ok && reuse.reason === 'accepted', 'a used link cannot be used again');
  await releaseInvitation(db, c.id); ok(T.invitations[0].status === 'opened', 'failed sign-up releases the claim');
  await claimInvitation(db, c.id);
  T.users.push({ id: 'u1', role: 'tutor', email: 'arun@example.com' });
  await completeInvitation(db, (await invitationDetail(db, c.id)).inv, 'u1'); ok(T.invitations[0].accepted_user === 'u1', 'account recorded on invitation');

  // ---- expiry ----
  const old: any = await createInvitation(db, { actor: 'a', invite: validateInvite({ role: 'parent', name: 'P', email: 'p1@b.co' }).value });
  T.invitations.find((i: any) => i.id === old.id).expires_at = new Date(Date.now() - 1000).toISOString();
  const ex: any = await lookupToken(db, old.token); ok(!ex.ok && ex.reason === 'expired' && ex.message === MSG_EXPIRED, 'expired shows the fixed message');
  ok(MSG_EXPIRED === 'This invitation has expired. Please contact the Sahayak administrator for a new invitation.', 'expired wording exact');
  ok(MSG_REVOKED === 'This invitation is no longer active. Please contact the Sahayak administrator.', 'revoked wording exact');
  ok(T.invitations.find((i: any) => i.id === old.id).status === 'expired', 'stored as expired');
  ok(effectiveStatus({ status: 'pending', expires_at: new Date(Date.now() - 5).toISOString() }) === 'expired' && effectiveStatus({ status: 'accepted', expires_at: new Date(0).toISOString() }) === 'accepted', 'accepted never becomes expired');

  // ---- revoke / reissue / extend ----
  const r1: any = await createInvitation(db, { actor: 'a', invite: validateInvite({ role: 'teacher', name: 'T', email: 't@b.co', fields: { subjects: 'Sci', boards: 'CBSE' } }).value });
  ok((await actOnInvitation(db, 'founder@x.com', r1.id, 'revoke', { reason: 'wrong person' })).ok, 'revoke');
  const rv: any = await lookupToken(db, r1.token); ok(!rv.ok && rv.reason === 'revoked' && rv.message === MSG_REVOKED, 'revoked link refused with fixed message');
  ok(!(await actOnInvitation(db, 'f', r1.id, 'extend')).ok, 'a revoked invitation cannot be extended back to life');
  const re: any = await actOnInvitation(db, 'founder@x.com', old.id, 'reissue'); ok(re.ok && re.token && re.token !== old.token, 'reissue gives a new token');
  ok(!(await lookupToken(db, old.token)).ok && (await lookupToken(db, re.token)).ok, 'old link dead, new link works');
  ok(!(await actOnInvitation(db, 'f', c.id, 'revoke')).ok, 'an accepted invitation cannot be revoked');
  ok(T.audit_logs.some((a: any) => a.action === 'invitation.revoke'), 'revoke audited');

  // ---- existing accounts: no duplicate, no silent role change ----
  T.users.push({ id: 'u9', role: 'student', email: 'kid@x.com', contact_email: null });
  T.users.push({ id: 'u10', role: 'parent', email: 'login123@placeholder', contact_email: 'mom@x.com' });
  ok((await findExistingAccount(db, 'KID@x.com'))?.id === 'u9', 'finds existing by login email (case-insensitive input)');
  ok((await findExistingAccount(db, 'mom@x.com'))?.id === 'u10', 'finds existing by contact email');
  ok((await findExistingAccount(db, 'new@x.com')) === null, 'no false match');
  const ec: any = await createInvitation(db, { actor: 'a', invite: validateInvite({ role: 'tutor', name: 'Kid', email: 'kid@x.com', fields: { subjects: 'M', boards: 'CBSE' } }).value });
  ok(!!ec.warning, 'creating an invitation for an existing email warns the admin');
  const eci = (await invitationDetail(db, ec.id)).inv; await flagExisting(db, eci, { id: 'u9', role: 'student' });
  ok(T.users.find((u: any) => u.id === 'u9').role === 'student', 'role NOT changed by flagging');
  ok(T.role_changes.length === 1 && T.role_changes[0].status === 'pending', 'role change is only a pending request');
  await flagExisting(db, eci, { id: 'u9', role: 'student' }); ok(T.role_changes.length === 1, 'no duplicate requests');
  ok(T.users.filter((u: any) => u.email === 'kid@x.com').length === 1, 'no duplicate account');
  const noStu: any = await decideRoleChange(db, 'founder@x.com', T.role_changes[0].id, true); ok(!noStu.ok && noStu.error === 'student_accounts_are_not_converted' && T.users.find((u: any) => u.id === 'u9').role === 'student', 'student accounts are never converted');
  // adult → adult approved
  const pr = await createInvitation(db, { actor: 'a', invite: validateInvite({ role: 'tutor', name: 'Mom Tutor', email: 'mom@x.com', fields: { subjects: 'Eng', boards: 'CBSE' } }).value });
  await flagExisting(db, (await invitationDetail(db, pr.id)).inv, { id: 'u10', role: 'parent' });
  const rcid = T.role_changes.find((r: any) => r.user_id === 'u10').id;
  const dec: any = await decideRoleChange(db, 'founder@x.com', rcid, true, 'verified by phone'); ok(dec.ok && T.users.find((u: any) => u.id === 'u10').role === 'tutor', 'approved adult change applied');
  ok(T.adult_profiles.some((p: any) => p.user_id === 'u10' && p.role === 'tutor'), 'profile created for the new role');
  ok(T.role_changes.find((r: any) => r.id === rcid).decided_by === 'founder@x.com' && T.audit_logs.some((a: any) => a.action === 'role.change.approved'), 'previous/new/approver/time/audit recorded');
  ok(!(await decideRoleChange(db, 'f', rcid, true)).ok, 'cannot decide twice');

  // ---- lists, filters, stats ----
  const rows = await listInvitations(db, {}); ok(rows.length >= 5, 'list');
  ok((await listInvitations(db, { status: 'revoked' })).every((r: any) => r.status === 'revoked'), 'filter status');
  ok((await listInvitations(db, { role: 'tutor' })).every((r: any) => r.role === 'tutor'), 'filter role');
  ok((await listInvitations(db, { q: 'arun' })).length >= 1, 'search by name');
  const st = inviteStats(rows); ok(st.funnel[0].count === rows.length && st.funnel[3].count === 1 && st.byStatus.accepted === 1, 'funnel counts come from rows');
  ok(st.funnel.every((x: any, i: number, a: any[]) => i === 0 || x.count <= a[0].count), 'no step exceeds created');
  // progress sync
  T.users.find((u: any) => u.id === 'u1').auth_user_id = 'au1'; T.account_devices.push({ auth_user_id: 'au1', first_seen: '2026-10-28T10:00:00Z' });
  await syncProgress(db); ok(T.invitations.find((i: any) => i.id === c.id).first_login_at === '2026-10-28T10:00:00Z' && !!T.invitations.find((i: any) => i.id === c.id).activated_at, 'first login + activation for adults filled from records');

  // ---- sharing: link only, no secrets ----
  const link = 'https://sahayak.example/invite/' + c.token; const sh = shareLinks('tutor', link, 'tutor-onboarding');
  ok(sh.whatsapp.startsWith('https://wa.me/?text='), 'wa.me share'); ok(decodeURIComponent(sh.whatsapp).includes('as a Tutor') && decodeURIComponent(sh.whatsapp).includes(c.token), 'message names role and carries link');
  ok(!/password|credential/i.test(sh.text.replace('Sahayak: adaptive', '')), 'message holds no credentials');
  ok(inviteMessage('student', 'L').includes('as a Student') && inviteMessage('centre', 'L').includes('Coaching Centre'), 'role words');
  ok(withSource(link, 'whatsapp', 'c').includes('source=whatsapp&campaign=c'), 'share link carries source + campaign');

  // ---- team permissions ----
  const sup = { superAdmin: true }; const mem = { superAdmin: false, member: { status: 'active', permissions: ['marketing', 'bogus'] } };
  ok(can(sup, undefined) && can(sup, 'finance'), 'super admin can do everything');
  ok(!can(mem as any, undefined), 'no permission asked = super admin only');
  ok(can(mem as any, 'marketing') && !can(mem as any, 'finance') && !can(mem as any, 'technology'), 'member limited to their permission');
  ok(!can({ superAdmin: false, member: { status: 'suspended', permissions: ['marketing'] } }, 'marketing'), 'suspended member has nothing');
  ok(!can({ superAdmin: false, member: null }, 'marketing'), 'non-member has nothing');
  ok(cleanPermissions(['marketing', 'marketing', 'root', 7]).join() === 'marketing', 'unknown permissions dropped');
  ok(permissionForPath('/admin/acquisition') === 'marketing' && permissionForPath('/admin/payments') === undefined && permissionForPath('/admin/ai-economics') === undefined, 'page → permission (v87: money and AI pages are Super Admin only, so they have no team permission)');
  ok(permissionForPath('/admin/students') === undefined && permissionForPath('/admin/team') === undefined && permissionForPath('/admin/command-centre') === undefined, 'sensitive pages are super-admin only');
  ok(visiblePath('/admin/acquisition', mem as any) && !visiblePath('/admin/payments', mem as any) && !visiblePath('/admin/team', mem as any) && visiblePath('/admin/team', sup), 'menu filter');
  ok(TEAM_PRESETS.map((p: any) => p.id).join() === 'operations,academic,content,marketing,finance,support,technology,custom', 'presets');
  ok(TEAM_PRESETS.every((p: any) => !p.permissions.includes('team') && cleanPermissions(p.permissions).length === p.permissions.length), 'presets use only known permissions');
  ok((await saveTeamMember(db, 'founder@x.com', { email: 'FOUNDER@x.com', name: 'F' })).error === 'already_super_admin', 'cannot add the founder as a member');
  ok(!(await saveTeamMember(db, 'f', { email: 'bad', name: 'x' })).ok, 'bad email refused');
  const tm: any = await saveTeamMember(db, 'founder@x.com', { email: 'Priya@X.com', name: 'Priya', permissions: ['marketing', 'invitations', 'root'], custom_responsibilities: 'WhatsApp groups' });
  ok(tm.ok && (await teamMemberByEmail(db, 'priya@x.com'))?.permissions.join() === 'marketing,invitations', 'member saved, unknown permission dropped');
  await saveTeamMember(db, 'founder@x.com', { email: 'priya@x.com', name: 'Priya', permissions: ['marketing'], status: 'suspended' });
  ok(T.admin_team.length === 1 && (await teamMemberByEmail(db, 'priya@x.com'))?.status === 'suspended', 'update, not duplicate');
  ok(T.audit_logs.filter((a: any) => a.action.startsWith('team.')).length === 2, 'team changes audited');
  console.log(`t79: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
