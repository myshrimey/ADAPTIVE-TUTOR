import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase-server';
import { confirmPayment, rejectPayment, refundPayment, verifyAndActivate, revokeActivation } from '@adaptive-tutor/core';

// Admin-only: confirm or reject a pilot payment claim. Gated on ADMIN_EMAILS,
// checked against the caller's own authenticated session — never trusts a
// client-supplied role/flag. Uses the service-role client only after that
// check passes, so an ordinary signed-in user can never reach this path
// (and even if they could, pilot_payments has no RLS update policy for
// `authenticated` at all — see migration 0009).
async function assertAdmin(): Promise<string> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowedEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!user?.email || !allowedEmails.includes(user.email.toLowerCase())) {
    throw new Error('not_authorized');
  }
  return user.email;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminEmail = await assertAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action as 'confirm' | 'reject' | 'refund' | 'activate';
    const service = createServiceClient();

    if (action === 'activate') {
      await verifyAndActivate(service, id, adminEmail, body.adminNotes);
    } else if (action === 'confirm') {
      await confirmPayment(service, id, { adminNotes: body.adminNotes });
    } else if (action === 'reject') {
      await rejectPayment(service, id, body.adminNotes);
    } else if (action === 'refund') {
      await refundPayment(service, id, body.adminNotes);
      await revokeActivation(service, id);
    } else {
      return NextResponse.json({ data: null, error: 'invalid_action' }, { status: 400 });
    }
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    const status = err.message === 'not_authorized' ? 403 : 400;
    return NextResponse.json({ data: null, error: err.message ?? 'unknown_error' }, { status });
  }
}
