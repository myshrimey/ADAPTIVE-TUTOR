import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { viewAsSecret } from '@/lib/view-as';
import { signTicket, cleanReason, resolveViewTarget, startsInLastHour, overLimit, writeAudit } from '@adaptive-tutor/core';

// v140: issues a 15-minute read-only view ticket. Super Admin only (no permission name). Needs a written reason; at most 20 a hour; recorded in the Audit log.
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const userId = String(body.userId ?? '');
    const service = createServiceClient();
    const fail = async (error: string, message: string, status: number) => {
      await writeAudit(service, { actorEmail: admin.email, actorRole: 'super_admin', action: 'account.view_as_start', entity: 'account', targetAccount: /^[0-9a-f-]{36}$/i.test(userId) ? userId : null, outcome: 'failed', reason: error });
      return NextResponse.json({ data: null, error, message }, { status });
    };
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return fail('view_as_bad_target', 'That account id is not valid.', 400);
    const reason = cleanReason(body.reason);
    if (!reason.ok) return fail('view_as_reason_required', 'Write a short reason (8 to 200 characters). It is kept in the Audit log.', 400);
    if (overLimit(await startsInLastHour(service, admin.email))) return fail('view_as_rate_limited', 'Too many views started in the last hour (limit 20).', 429);
    const target = await resolveViewTarget(service, userId);
    if (!target) return fail('view_as_not_a_student', 'Only student accounts can be viewed.', 400);
    const ticket = signTicket(admin.email, userId, viewAsSecret());
    await writeAudit(service, { actorEmail: admin.email, actorRole: 'super_admin', action: 'account.view_as_start', entity: 'account', entityId: target.shortId, targetAccount: userId, outcome: 'success', reason: reason.value });
    return NextResponse.json({ data: { url: `/admin/view-as/${ticket}/dashboard` }, error: null });
  } catch (e: any) {
    if (e?.message === 'not_authorized') return NextResponse.json({ data: null, error: 'not_authorized' }, { status: 403 });
    return NextResponse.json({ data: null, error: 'view_as_failed', message: 'Could not start the view.' }, { status: 500 });
  }
}
