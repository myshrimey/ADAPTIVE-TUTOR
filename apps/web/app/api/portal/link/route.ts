import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getPortalUser, hashLinkCode } from '@/lib/portal';
import { normaliseLinkCode, LINK_ATTEMPTS_PER_HOUR, seatCheck } from '@adaptive-tutor/core';

// A parent / tutor / centre enters the one-time code a family gave them. The adult is always derived from the
// session; the student is found only through the code. Wrong guesses are counted and slowed down.
export async function POST(request: Request) {
  try {
    const me = await getPortalUser();
    if (!me) return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 });
    if (me.status !== 'active') return NextResponse.json({ data: null, error: me.status === 'pending' ? 'awaiting_approval' : 'suspended' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    const code = normaliseLinkCode(body.code);
    const service = createServiceClient();

    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await service.from('link_attempts').select('id', { count: 'exact', head: true }).eq('adult_user_id', me.userId).gte('created_at', hourAgo);
    if ((count ?? 0) >= LINK_ATTEMPTS_PER_HOUR) return NextResponse.json({ data: null, error: 'too_many_attempts' }, { status: 429 });
    await service.from('link_attempts').insert({ adult_user_id: me.userId });
    if (!code) return NextResponse.json({ data: null, error: 'invalid_code' }, { status: 400 });

    const { data: row } = await service.from('link_codes').select('id, student_id, for_role, expires_at, used_at').eq('code_hash', hashLinkCode(code)).maybeSingle();
    if (!row || row.used_at || Date.parse(row.expires_at) < Date.now() || row.for_role !== me.role) {
      return NextResponse.json({ data: null, error: 'invalid_code' }, { status: 400 });
    }
    // Tutors and centres: seat limit (only when the founder has switched seat limits on).
    if (me.role === 'tutor' || me.role === 'centre') {
      const seat = await seatCheck(service, me.userId, row.student_id);
      if (!seat.ok) return NextResponse.json({ data: null, error: seat.reason === 'seat_limit' ? 'seat_limit' : 'no_active_plan' }, { status: 402 });
    }
    const { error: lErr } = await service.from('student_links').upsert(
      { student_id: row.student_id, adult_user_id: me.userId, link_type: me.role, status: 'active', revoked_at: null, revoked_by: null },
      { onConflict: 'student_id,adult_user_id' },
    );
    if (lErr) throw lErr;
    await service.from('link_codes').update({ used_at: new Date().toISOString() }).eq('id', row.id);
    const { data: st } = await service.from('students').select('display_name').eq('id', row.student_id).maybeSingle();
    return NextResponse.json({ data: { studentName: st?.display_name ?? 'the student' }, error: null });
  } catch (err: any) {
    console.error('link failed', err?.message);
    return NextResponse.json({ data: null, error: 'link_failed' }, { status: 500 });
  }
}

// The adult stops following a student.
export async function DELETE(request: Request) {
  try {
    const me = await getPortalUser();
    if (!me) return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const studentId = String(body.studentId ?? '');
    const service = createServiceClient();
    await service.from('student_links').update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: 'adult' }).eq('adult_user_id', me.userId).eq('student_id', studentId);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch {
    return NextResponse.json({ data: null, error: 'unlink_failed' }, { status: 500 });
  }
}
