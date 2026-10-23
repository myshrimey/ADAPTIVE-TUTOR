import { signupSourceFields } from '@/lib/source';
import { attachReferralFromCookie } from '@/lib/referral';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServiceClient } from '@/lib/supabase-server';
import { signupsOpen, dailySignupCap } from '@/lib/signups';
import {
  normaliseUsername, validateUsername, validatePassword, validateOptionalEmail, placeholderEmail,
  CONSENT_VERSION, SIGNUPS_PER_IP_PER_HOUR,
} from '@adaptive-tutor/core';

// Public: a family creates their own account (username + password, email optional) on the FREE plan.
// Everything is decided on the server. Limits: per-internet-address per hour, a daily total, a hidden
// "website" field that real people leave empty, and a required parent/guardian agreement.
export async function POST(request: Request) {
  try {
    if (!signupsOpen()) return NextResponse.json({ data: null, error: 'signups_closed' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    if (body.website) return NextResponse.json({ data: { ok: true }, error: null }); // bot: pretend success, create nothing
    if (body.consent !== true) return NextResponse.json({ data: null, error: 'consent_required' }, { status: 400 });

    const username = normaliseUsername(body.username);
    const displayName = String(body.displayName ?? '').trim().slice(0, 60);
    const password = String(body.password ?? '');
    const contactEmail = String(body.email ?? '').trim().toLowerCase();
    if (!displayName) return NextResponse.json({ data: null, error: 'missing_name' }, { status: 400 });
    const bad = validateUsername(username) ?? validatePassword(password, username) ?? validateOptionalEmail(contactEmail);
    if (bad) return NextResponse.json({ data: null, error: bad }, { status: 400 });

    const service = createServiceClient();
    const fwd = request.headers.get('x-forwarded-for') ?? '';
    const ip = fwd.split(',')[0].trim() || 'unknown';
    const ipHash = createHash('sha256').update('sahayak-signup:' + ip).digest('hex');

    // Abuse limits (fail closed on a clear breach; a database error here must not silently allow unlimited sign-ups).
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    await service.from('signup_log').delete().lt('created_at', new Date(Date.now() - 2 * 86400_000).toISOString());
    const [{ count: ipCount, error: e1 }, { count: dayCount, error: e2 }] = await Promise.all([
      service.from('signup_log').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', hourAgo),
      service.from('signup_log').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
    ]);
    if (e1 || e2) throw e1 ?? e2;
    if ((ipCount ?? 0) >= SIGNUPS_PER_IP_PER_HOUR) return NextResponse.json({ data: null, error: 'too_many_attempts' }, { status: 429 });
    if ((dayCount ?? 0) >= dailySignupCap()) return NextResponse.json({ data: null, error: 'daily_cap_reached' }, { status: 429 });
    await service.from('signup_log').insert({ ip_hash: ipHash });

    // Username must be free.
    const { data: taken } = await service.from('users').select('id').eq('username', username).maybeSingle();
    if (taken) return NextResponse.json({ data: null, error: 'username_taken' }, { status: 409 });

    // If a real email was given and is already used by another account, say so (so the family does not lose access later).
    const loginEmail = contactEmail || placeholderEmail(username);
    const { data: created, error: createErr } = await service.auth.admin.createUser({ email: loginEmail, password, email_confirm: true });
    if (createErr || !created?.user) {
      const msg = createErr?.message ?? 'create_failed';
      return NextResponse.json({ data: null, error: /already|exists|registered/i.test(msg) ? (contactEmail ? 'email_already_registered' : 'username_taken') : 'create_failed' }, { status: 400 });
    }
    const authId = created.user.id;
    try {
      const { data: userRow, error: uErr } = await service.from('users')
        .upsert({ auth_user_id: authId, email: loginEmail, role: 'student', username, contact_email: contactEmail || null, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION, ...(await signupSourceFields()) }, { onConflict: 'auth_user_id' })
        .select('id').single();
      if (uErr || !userRow) throw uErr ?? new Error('user_row_failed');
      const { data: st, error: sErr } = await service.from('students').insert({ user_id: userRow.id, display_name: displayName, grade: 'CBSE-10' }).select('id').single();
      if (sErr || !st) throw sErr ?? new Error('student_row_failed');
      const { error: aErr } = await service.from('student_access').insert({ student_id: st.id, plan_code: 'free', subject_limit: 1, access_until: null, notes: 'Self sign-up: free plan' });
      if (aErr) throw aErr;
      await attachReferralFromCookie(service, userRow.id, 'student');
      return NextResponse.json({ data: { ok: true }, error: null });
    } catch (inner: any) {
      await service.auth.admin.deleteUser(authId); // roll back so the family can simply try again
      if (/idx_users_username_unique|duplicate key/i.test(String(inner?.message))) return NextResponse.json({ data: null, error: 'username_taken' }, { status: 409 });
      throw inner;
    }
  } catch (err: any) {
    console.error('register failed', err?.message);
    return NextResponse.json({ data: null, error: 'register_failed' }, { status: 500 });
  }
}
