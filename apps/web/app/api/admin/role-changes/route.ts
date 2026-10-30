import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { decideRoleChange } from '@adaptive-tutor/core';

// SUPER ADMIN ONLY. A role is never changed by a visitor, a link or a team member: only the founder approves a logged request.
export async function POST(request: Request) {
  try {
    const a = await requireAdmin();
    const b = await request.json().catch(() => ({}));
    const r = await decideRoleChange(createServiceClient(), a.email, String(b.id ?? ''), b.approve === true, b.reason);
    return NextResponse.json({ data: r.ok ? { ok: true } : null, error: r.ok ? null : r.error }, { status: r.ok ? 200 : 400 });
  } catch (err: any) { return NextResponse.json({ data: null, error: err?.message === 'not_authorized' ? 'not_authorized' : 'failed' }, { status: err?.message === 'not_authorized' ? 403 : 400 }); }
}
