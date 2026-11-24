import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { parseMarkRequest, cleanReason, setTestMark, TEST_ACCOUNT_AUDIT, writeAudit } from '@adaptive-tutor/core';

// v143: mark or unmark a STUDENT account as a test account. Super Admin only (no permission name). Reason required; recorded in the Audit log.
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const req = parseMarkRequest(await request.json().catch(() => null));
    const service = createServiceClient();
    if (!req) return NextResponse.json({ data: null, error: 'test_bad_request', message: 'That request is not valid.' }, { status: 400 });
    const action = req.mark ? TEST_ACCOUNT_AUDIT.mark : TEST_ACCOUNT_AUDIT.unmark;
    const reason = cleanReason(req.reasonRaw);
    const fail = async (error: string, message: string, status: number) => {
      await writeAudit(service, { actorEmail: admin.email, actorRole: 'super_admin', action, entity: 'account', targetAccount: req.userId, outcome: 'failed', reason: error });
      return NextResponse.json({ data: null, error, message }, { status });
    };
    if (!reason.ok) return fail('test_reason_required', 'Write a short reason (8 to 200 characters). It is kept in the Audit log.', 400);
    const r = await setTestMark(service, req.userId, req.mark, admin.email, reason.value);
    if (!r.ok) return fail(r.error, r.error === 'test_not_a_student' ? 'Only student accounts can be marked.' : r.error === 'test_table_missing' ? 'Run migration 0069 first.' : 'Could not save the mark.', r.error === 'test_not_a_student' ? 400 : 500);
    await writeAudit(service, { actorEmail: admin.email, actorRole: 'super_admin', action, entity: 'account', targetAccount: req.userId, outcome: 'success', reason: reason.value });
    return NextResponse.json({ data: { marked: req.mark }, error: null });
  } catch (e: any) {
    if (e?.message === 'not_authorized') return NextResponse.json({ data: null, error: 'not_authorized' }, { status: 403 });
    return NextResponse.json({ data: null, error: 'test_failed', message: 'Could not save the mark.' }, { status: 500 });
  }
}
