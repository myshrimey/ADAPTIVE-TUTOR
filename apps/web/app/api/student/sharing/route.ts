import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { hashLinkCode } from '@/lib/portal';
import { generateLinkCode, formatLinkCode, isPortalRole, LINK_CODE_TTL_DAYS, MAX_ACTIVE_LINK_CODES } from '@adaptive-tutor/core';

// The student's family decides who may follow this account. The student id always comes from the session.
export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    const [{ data: links }, { data: codes }] = await Promise.all([
      service.from('student_links').select('id, link_type, status, created_at, adult_user_id').eq('student_id', studentId).eq('status', 'active'),
      service.from('link_codes').select('id, for_role, expires_at').eq('student_id', studentId).is('used_at', null).gt('expires_at', new Date().toISOString()),
    ]);
    const ids = (links ?? []).map((l: any) => l.adult_user_id);
    const { data: profs } = ids.length ? await service.from('adult_profiles').select('user_id, display_name').in('user_id', ids) : { data: [] as any[] };
    const nameOf = new Map((profs ?? []).map((p: any) => [p.user_id, p.display_name]));
    return NextResponse.json({
      data: {
        links: (links ?? []).map((l: any) => ({ id: l.id, type: l.link_type, name: nameOf.get(l.adult_user_id) ?? 'Account', since: l.created_at })),
        openCodes: (codes ?? []).map((c: any) => ({ id: c.id, forRole: c.for_role, expiresAt: c.expires_at })),
      },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'unauthenticated' ? 401 : 400 });
  }
}

// Make a one-time code. It is shown once and only its fingerprint is stored.
export async function POST(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    if (!isPortalRole(body.forRole)) return NextResponse.json({ data: null, error: 'bad_request' }, { status: 400 });
    const service = createServiceClient();
    const { count } = await service.from('link_codes').select('id', { count: 'exact', head: true }).eq('student_id', studentId).is('used_at', null).gt('expires_at', new Date().toISOString());
    if ((count ?? 0) >= MAX_ACTIVE_LINK_CODES) return NextResponse.json({ data: null, error: 'too_many_codes' }, { status: 400 });
    for (let i = 0; i < 5; i++) {
      const code = generateLinkCode();
      const expires = new Date(Date.now() + LINK_CODE_TTL_DAYS * 86400000).toISOString();
      const { error } = await service.from('link_codes').insert({ student_id: studentId, for_role: body.forRole, code_hash: hashLinkCode(code), expires_at: expires });
      if (!error) return NextResponse.json({ data: { code: formatLinkCode(code), expiresAt: expires }, error: null });
      if (!/duplicate key/i.test(error.message)) throw error;
    }
    throw new Error('code_failed');
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'unauthenticated' ? 401 : 400 });
  }
}

// Stop someone following (linkId) or cancel an unused code (codeId).
export async function DELETE(request: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await request.json().catch(() => ({}));
    const service = createServiceClient();
    if (body.linkId) {
      await service.from('student_links').update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: 'student' }).eq('id', String(body.linkId)).eq('student_id', studentId);
    } else if (body.codeId) {
      await service.from('link_codes').delete().eq('id', String(body.codeId)).eq('student_id', studentId);
    } else return NextResponse.json({ data: null, error: 'bad_request' }, { status: 400 });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status: err.message === 'unauthenticated' ? 401 : 400 });
  }
}
