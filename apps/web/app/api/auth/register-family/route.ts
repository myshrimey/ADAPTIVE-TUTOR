import { signupSourceFields } from '@/lib/source';
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { signupsOpen, checkSignupLimits } from '@/lib/signups';
import {
  normaliseUsername, validateUsername, validatePassword, validateOptionalEmail, placeholderEmail,
  CONSENT_VERSION,
} from '@adaptive-tutor/core';

// Public: a family creates the child's account AND the parent's account in one step, already linked.
// The parent sees the child's saved reports straight away, with no code to exchange. The child can still
// stop the sharing later at /sharing. Same abuse limits, bot trap and consent as the single sign-ups.
// If anything fails, everything made in this call is removed so the family can simply try again.
type Person = { username: string; password: string; displayName: string; email: string };

function readPerson(raw: any, nameMax: number): Person {
  return {
    username: normaliseUsername(raw?.username),
    password: String(raw?.password ?? ''),
    displayName: String(raw?.displayName ?? '').trim().slice(0, nameMax),
    email: String(raw?.email ?? '').trim().toLowerCase(),
  };
}

export async function POST(request: Request) {
  const service = createServiceClient();
  const madeAuthIds: string[] = [];
  try {
    if (!signupsOpen()) return NextResponse.json({ data: null, error: 'signups_closed' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    if (body.website) return NextResponse.json({ data: { ok: true }, error: null });
    if (body.consent !== true) return NextResponse.json({ data: null, error: 'consent_required' }, { status: 400 });

    const child = readPerson(body.student, 60);
    const parent = readPerson(body.parent, 120);
    if (!child.displayName || !parent.displayName) return NextResponse.json({ data: null, error: 'missing_name' }, { status: 400 });
    if (child.username === parent.username) return NextResponse.json({ data: null, error: 'username_taken' }, { status: 409 });
    for (const p of [child, parent]) {
      const bad = validateUsername(p.username) ?? validatePassword(p.password, p.username) ?? validateOptionalEmail(p.email);
      if (bad) return NextResponse.json({ data: null, error: bad }, { status: 400 });
    }
    if (child.email && child.email === parent.email) return NextResponse.json({ data: null, error: 'email_already_registered' }, { status: 400 });

    const limited = await checkSignupLimits(service, request);
    if (limited) return NextResponse.json({ data: null, error: limited }, { status: 429 });

    for (const p of [child, parent]) {
      const { data: taken } = await service.from('users').select('id').eq('username', p.username).maybeSingle();
      if (taken) return NextResponse.json({ data: null, error: 'username_taken' }, { status: 409 });
    }

    async function makeUser(p: Person, role: 'student' | 'parent') {
      const loginEmail = p.email || placeholderEmail(p.username);
      const { data: created, error } = await service.auth.admin.createUser({ email: loginEmail, password: p.password, email_confirm: true });
      if (error || !created?.user) {
        const msg = error?.message ?? 'create_failed';
        throw Object.assign(new Error(msg), { code: /already|exists|registered/i.test(msg) ? (p.email ? 'email_already_registered' : 'username_taken') : 'register_failed' });
      }
      madeAuthIds.push(created.user.id);
      const { data: row, error: uErr } = await service.from('users')
        .upsert({ auth_user_id: created.user.id, email: loginEmail, role, username: p.username, contact_email: p.email || null, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION, ...(await signupSourceFields()) }, { onConflict: 'auth_user_id' })
        .select('id').single();
      if (uErr || !row) throw uErr ?? new Error('user_row_failed');
      return row.id as string;
    }

    const childUserId = await makeUser(child, 'student');
    const { data: st, error: sErr } = await service.from('students').insert({ user_id: childUserId, display_name: child.displayName, grade: 'CBSE-10' }).select('id').single();
    if (sErr || !st) throw sErr ?? new Error('student_row_failed');
    const { error: aErr } = await service.from('student_access').insert({ student_id: st.id, plan_code: 'free', subject_limit: 1, access_until: null, notes: 'Self sign-up with linked parent: free plan' });
    if (aErr) throw aErr;

    const parentUserId = await makeUser(parent, 'parent');
    const { error: pErr } = await service.from('adult_profiles').insert({
      user_id: parentUserId, role: 'parent', display_name: parent.displayName, status: 'active', approved_at: new Date().toISOString(),
    });
    if (pErr) throw pErr;
    const { error: lErr } = await service.from('student_links').upsert(
      { student_id: st.id, adult_user_id: parentUserId, link_type: 'parent', status: 'active', revoked_at: null, revoked_by: null },
      { onConflict: 'student_id,adult_user_id' },
    );
    if (lErr) throw lErr;
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    for (const id of madeAuthIds) await service.auth.admin.deleteUser(id).catch(() => {}); // cascade removes rows made for them
    const code = err?.code && typeof err.code === 'string' && /^[a-z_]+$/.test(err.code) ? err.code : null;
    if (code === 'username_taken' || code === 'email_already_registered') return NextResponse.json({ data: null, error: code }, { status: 409 });
    if (/idx_users_username_unique|duplicate key/i.test(String(err?.message))) return NextResponse.json({ data: null, error: 'username_taken' }, { status: 409 });
    console.error('family register failed', err?.message);
    return NextResponse.json({ data: null, error: 'register_failed' }, { status: 500 });
  }
}
