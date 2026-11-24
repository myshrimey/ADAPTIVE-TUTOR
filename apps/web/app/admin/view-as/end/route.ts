import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { viewAsSecret } from '@/lib/view-as';
import { verifyTicket, writeAudit } from '@adaptive-tutor/core';

// v140: "Exit" on the view banner. Records the end (even if the ticket has just expired) and returns to the account summary.
export async function GET(request: Request) {
  let back = '/admin/accounts';
  try {
    const admin = await requireAdmin();
    const t = new URL(request.url).searchParams.get('t');
    // Leaving must always work, so expiry is not checked here (the clock is set to the epoch); a forged or someone else's ticket is still ignored.
    const v = verifyTicket(t, viewAsSecret(), admin.email, new Date(0));
    if (v.ok) {
      back = `/admin/accounts/${v.payload.tgt}`;
      await writeAudit(createServiceClient(), { actorEmail: admin.email, actorRole: 'super_admin', action: 'account.view_as_end', entity: 'account', targetAccount: v.payload.tgt, outcome: 'success' });
    }
  } catch { /* leaving never fails */ }
  return NextResponse.redirect(new URL(back, request.url));
}
