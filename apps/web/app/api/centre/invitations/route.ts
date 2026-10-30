import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { getPortalUser } from '@/lib/portal';
import { siteOrigin, inviteLink } from '@/lib/site-url';
import { validateInvite, createInvitation, listInvitations, shareLinks } from '@adaptive-tutor/core';

// A coaching centre invites ITS OWN teachers, tutors and students. The centre id comes from the session only. Centre-made invitations
// carry org_user, so the new person joins that centre (a membership row, not access to any student's data). Tutors/teachers still wait for founder approval.
const CENTRE_ROLES = ['student', 'teacher', 'tutor'];
async function centre() { const me = await getPortalUser(); return me && me.role === 'centre' && me.status === 'active' ? me : null; }
export async function GET() {
  const me = await centre(); if (!me) return NextResponse.json({ data: null, error: 'not_authorized' }, { status: 403 });
  const rows = await listInvitations(createServiceClient(), { orgUser: me.userId });
  return NextResponse.json({ data: { rows: rows.map((r) => ({ id: r.id, role: r.role, status: r.status, name: r.invitee_name, expires_at: r.expires_at, created_at: r.created_at })) }, error: null });
}
export async function POST(request: Request) {
  try {
    const me = await centre(); if (!me) return NextResponse.json({ data: null, error: 'not_authorized' }, { status: 403 });
    const body = await request.json().catch(() => ({}));
    if (!CENTRE_ROLES.includes(String(body.role))) return NextResponse.json({ data: null, error: 'A centre can invite its own students, teachers and tutors.' }, { status: 403 });
    const v = validateInvite(body); if (!v.ok) return NextResponse.json({ data: null, error: v.error }, { status: 400 });
    const r = await createInvitation(createServiceClient(), { actor: `centre:${me.userId}`, invite: v.value, source: 'coaching_centre', inviterUser: me.userId, orgUser: me.userId });
    if (!r.ok) return NextResponse.json({ data: null, error: r.error }, { status: 500 });
    const link = inviteLink(siteOrigin(request), r.token);
    return NextResponse.json({ data: { id: r.id, link, warning: r.warning ?? null, role: v.value.role, name: v.value.name, share: shareLinks(v.value.role, link) }, error: null });
  } catch { return NextResponse.json({ data: null, error: 'failed' }, { status: 400 }); }
}
