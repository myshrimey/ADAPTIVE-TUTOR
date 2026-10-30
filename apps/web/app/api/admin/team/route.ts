import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { listTeam, saveTeamMember, removeTeamMember } from '@adaptive-tutor/core';

// SUPER ADMIN ONLY (no permission is passed, so only ADMIN_EMAILS may use it): a team member can never grant themselves or anyone else more access.
const fail = (err: any) => NextResponse.json({ data: null, error: err?.message === 'not_authorized' ? 'not_authorized' : 'failed' }, { status: err?.message === 'not_authorized' ? 403 : 400 });
export async function GET() { try { await requireAdmin(); return NextResponse.json({ data: { team: await listTeam(createServiceClient()) }, error: null }); } catch (e) { return fail(e); } }
export async function POST(request: Request) {
  try { const a = await requireAdmin(); const r = await saveTeamMember(createServiceClient(), a.email, await request.json().catch(() => ({}))); return NextResponse.json({ data: r.ok ? r : null, error: r.ok ? null : r.error }, { status: r.ok ? 200 : 400 }); } catch (e) { return fail(e); }
}
export async function DELETE(request: Request) {
  try { const a = await requireAdmin(); const b = await request.json().catch(() => ({})); const r = await removeTeamMember(createServiceClient(), a.email, String(b.id ?? '')); return NextResponse.json({ data: r, error: r.ok ? null : 'not_found' }, { status: r.ok ? 200 : 404 }); } catch (e) { return fail(e); }
}
