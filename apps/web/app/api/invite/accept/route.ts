import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { captureInviteSignup } from '@/lib/acquisition';
import {
  lookupToken, claimInvitation, releaseInvitation, completeInvitation, findExistingAccount, flagExisting, addEvent, missingFields, ROLE_FIELDS, MSG_EXISTING,
  normaliseUsername, validateUsername, validatePassword, placeholderEmail, CONSENT_VERSION,
} from '@adaptive-tutor/core';

// Public, but only with a valid invitation token. The ROLE comes from the invitation row, never from this request.
// One use only (claimInvitation is atomic). An existing account is never duplicated or silently converted.
const bad = (error: string, status = 400, message?: string) => NextResponse.json({ data: null, error, message: message ?? null }, { status });
export async function POST(request: Request) {
  const service = createServiceClient(); let claimedId: string | null = null; let authId: string | null = null;
  try {
    const b = await request.json().catch(() => ({}));
    if (b.website) return NextResponse.json({ data: { ok: true }, error: null }); // bot trap
    const look = await lookupToken(service, b.token);
    if (!look.ok) return bad(look.reason, look.reason === 'not_found' ? 404 : 410, look.message);
    const inv = look.inv;
    if (b.consent !== true) return bad('consent_required');
    const username = normaliseUsername(String(b.username ?? '')); const password = String(b.password ?? '');
    const uErr = validateUsername(username) ?? validatePassword(password, username); if (uErr) return bad(String(uErr));
    const given: Record<string, string> = {}; const src = b.fields && typeof b.fields === 'object' ? b.fields : {};
    for (const f of ROLE_FIELDS[inv.role]) { const v = String(src[f.key] ?? '').trim().slice(0, 200); if (v) given[f.key] = v; }
    const merged = { ...given, ...inv.fields }; // what the inviter set stays as set
    const miss = missingFields(inv.role, merged); if (miss.length) return bad('missing_fields', 400, `${miss[0].label} is required.`);
    const displayName = String(inv.invitee_name || b.displayName || '').trim().slice(0, 120); if (!displayName) return bad('missing_name');

    const email = inv.invitee_email;
    const existing = await findExistingAccount(service, email);
    if (existing) { await flagExisting(service, inv, existing); return bad('existing_account', 409, MSG_EXISTING); }
    const { data: taken } = await service.from('users').select('id').eq('username', username).maybeSingle();
    if (taken) return bad('username_taken', 409);

    if (!(await claimInvitation(service, inv.id))) return bad('accepted', 410);
    claimedId = inv.id;

    const loginEmail = email || placeholderEmail(username);
    const { data: created, error: cErr } = await service.auth.admin.createUser({ email: loginEmail, password, email_confirm: true });
    if (cErr || !created?.user) {
      await releaseInvitation(service, inv.id); claimedId = null;
      if (/already|exists|registered/i.test(cErr?.message ?? '')) { await service.from('invitations').update({ conflict_note: 'This email already has a login.' }).eq('id', inv.id); await addEvent(service, inv.id, 'existing_account', null); return bad('existing_account', 409, MSG_EXISTING); }
      return bad('create_failed', 500);
    }
    authId = created.user.id;
    // The role written here is the invitation's role. A client-supplied role is never read.
    const { data: userRow, error: urErr } = await service.from('users').upsert({ auth_user_id: authId, email: loginEmail, role: inv.role, username, contact_email: email, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION, source: inv.source ?? 'invitation' }, { onConflict: 'auth_user_id' }).select('id').single();
    if (urErr || !userRow) throw urErr ?? new Error('user_row_failed');
    const userId = (userRow as any).id as string;
    const byCentre = !!inv.org_user; // accounts invited by a centre wait for the founder's approval (tutor/teacher), like self sign-up
    if (inv.role === 'student') {
      const { data: st, error: sErr } = await service.from('students').insert({ user_id: userId, display_name: displayName, grade: 'CBSE-10', must_complete_profile: false }).select('id').single();
      if (sErr || !st) throw sErr ?? new Error('student_row_failed');
      const { error: aErr } = await service.from('student_access').insert({ student_id: (st as any).id, plan_code: 'free', subject_limit: 1, access_until: null, notes: 'Invitation: free plan' });
      if (aErr) throw aErr;
    } else if (inv.role === 'teacher') {
      const { error } = await service.from('teacher_profiles').insert({ user_id: userId, display_name: displayName, qualification: merged.qualification ?? null, school: merged.school ?? null, subjects: merged.subjects ?? null, status: byCentre ? 'pending' : 'approved' });
      if (error) throw error;
    } else {
      const display = inv.role === 'centre' ? (merged.centre_name || displayName) : displayName;
      const needsApproval = byCentre && inv.role === 'tutor';
      const { error } = await service.from('adult_profiles').insert({ user_id: userId, role: inv.role, display_name: display, contact_name: inv.role === 'centre' ? displayName : null, city: merged.city ?? merged.location ?? null, qualification: merged.qualification ?? null,
        subjects: merged.subjects ?? null, status: needsApproval ? 'pending' : 'active', approved_at: needsApproval ? null : new Date().toISOString() });
      if (error) throw error;
    }
    await completeInvitation(service, inv, userId);
    await captureInviteSignup(service, userId, inv.role, inv);
    return NextResponse.json({ data: { ok: true, role: inv.role, username }, error: null });
  } catch (err: any) {
    if (authId) { try { await service.auth.admin.deleteUser(authId); } catch { /* ignore */ } }
    if (claimedId) { await releaseInvitation(service, claimedId).catch(() => {}); await addEvent(service, claimedId, 'accept_failed', null).catch(() => {}); }
    console.error('invite accept failed', err?.message);
    return bad(/idx_users_username_unique|duplicate key/i.test(String(err?.message)) ? 'username_taken' : 'register_failed', /duplicate/i.test(String(err?.message)) ? 409 : 500);
  }
}
