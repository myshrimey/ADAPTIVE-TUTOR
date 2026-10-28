import { signupSourceFields } from '@/lib/source';
import { attachReferralFromCookie } from '@/lib/referral';
import { captureSignupFromCookies } from '@/lib/acquisition';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { signupsOpen, checkSignupLimits } from '@/lib/signups';
import {
  normaliseUsername, validateUsername, validatePassword, validateOptionalEmail, placeholderEmail,
  CONSENT_VERSION, isPortalRole, PORTAL_INFO, type PortalRole,
} from '@adaptive-tutor/core';

// Public: a parent, tutor or coaching centre creates their own account. Parents are active at once (they
// still see nothing until a family gives them a code). Tutors and centres wait for the founder's approval
// before they can link to any student. Same abuse limits and bot trap as student sign-up.
export async function POST(request: Request) {
  try {
    if (!signupsOpen()) return NextResponse.json({ data: null, error: 'signups_closed' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    if (body.website) return NextResponse.json({ data: { ok: true }, error: null });
    if (!isPortalRole(body.role)) return NextResponse.json({ data: null, error: 'register_failed' }, { status: 400 });
    const role: PortalRole = body.role;
    const info = PORTAL_INFO[role];
    if (body.consent !== true) return NextResponse.json({ data: null, error: 'consent_required' }, { status: 400 });

    const username = normaliseUsername(body.username);
    const displayName = String(body.displayName ?? '').trim().slice(0, 120);
    const password = String(body.password ?? '');
    const contactEmail = String(body.email ?? '').trim().toLowerCase();
    const contactName = String(body.contactName ?? '').trim().slice(0, 120) || null;
    const city = String(body.city ?? '').trim().slice(0, 80) || null;
    const qualification = role === 'tutor' ? String(body.qualification ?? '').trim().slice(0, 300) || null : null;
    const subjects = role !== 'parent' ? String(body.subjects ?? '').trim().slice(0, 200) || null : null;
    if (!displayName) return NextResponse.json({ data: null, error: 'missing_name' }, { status: 400 });
    if (info.emailRequired && !contactEmail) return NextResponse.json({ data: null, error: 'missing_email' }, { status: 400 });
    const bad = validateUsername(username) ?? validatePassword(password, username) ?? validateOptionalEmail(contactEmail);
    if (bad) return NextResponse.json({ data: null, error: bad }, { status: 400 });

    const service = createServiceClient();
    const limited = await checkSignupLimits(service, request);
    if (limited) return NextResponse.json({ data: null, error: limited }, { status: 429 });

    const { data: taken } = await service.from('users').select('id').eq('username', username).maybeSingle();
    if (taken) return NextResponse.json({ data: null, error: 'username_taken' }, { status: 409 });

    const loginEmail = contactEmail || placeholderEmail(username);
    const { data: created, error: createErr } = await service.auth.admin.createUser({ email: loginEmail, password, email_confirm: true });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'create_failed';
      return NextResponse.json({ data: null, error: /already|exists|registered/i.test(msg) ? (contactEmail ? 'email_already_registered' : 'username_taken') : 'register_failed' }, { status: 400 });
    }
    try {
      const { data: userRow, error: uErr } = await service.from('users')
        .upsert({ auth_user_id: created.user.id, email: loginEmail, role, username, contact_email: contactEmail || null, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION, ...(await signupSourceFields()) }, { onConflict: 'auth_user_id' })
        .select('id').single();
      if (uErr || !userRow) throw uErr ?? new Error('user_row_failed');
      const { error: pErr } = await service.from('adult_profiles').insert({
        user_id: userRow.id, role, display_name: displayName, contact_name: contactName, city, qualification, subjects,
        status: info.needsApproval ? 'pending' : 'active',
        approved_at: info.needsApproval ? null : new Date().toISOString(),
      });
      if (pErr) throw pErr;
      await attachReferralFromCookie(service, userRow.id, role);
      await captureSignupFromCookies(service, userRow.id, role);
      return NextResponse.json({ data: { ok: true, needsApproval: info.needsApproval }, error: null });
    } catch (inner: any) {
      await service.auth.admin.deleteUser(created.user.id);
      if (/idx_users_username_unique|duplicate key/i.test(String(inner?.message))) return NextResponse.json({ data: null, error: 'username_taken' }, { status: 409 });
      throw inner;
    }
  } catch (err: any) {
    console.error('portal register failed', err?.message);
    return NextResponse.json({ data: null, error: 'register_failed' }, { status: 500 });
  }
}
