import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getPortalUser } from '@/lib/portal';
import { grantStudentCredit } from '@adaptive-tutor/core';

// A tutor / centre gives one mock credit from its shared pool to a student who is actively linked to it.
// The adult comes from the session; `grantId` (made by the page) makes a double click harmless.
export async function POST(request: Request) {
  try {
    const me = await getPortalUser();
    if (!me || (me.role !== 'tutor' && me.role !== 'centre')) return NextResponse.json({ data: null, error: 'unauthenticated' }, { status: 401 });
    if (me.status !== 'active') return NextResponse.json({ data: null, error: 'not_active' }, { status: 403 });
    const b = await request.json().catch(() => ({}));
    const grantId = String(b.grantId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(grantId)) return NextResponse.json({ data: null, error: 'bad_request' }, { status: 400 });
    const out = await grantStudentCredit(createServiceClient(), me.userId, String(b.studentId ?? ''), grantId);
    return NextResponse.json({ data: { balance: out.balance }, error: out.ok ? null : out.reason }, { status: out.ok ? 200 : 400 });
  } catch (err: any) {
    console.error('grant failed', err?.message);
    return NextResponse.json({ data: null, error: 'grant_failed' }, { status: 500 });
  }
}
