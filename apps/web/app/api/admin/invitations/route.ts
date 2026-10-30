import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { siteOrigin, inviteLink } from '@/lib/site-url';
import { validateInvite, createInvitation, listInvitations, inviteStats, syncProgress, actOnInvitation, invitationDetail, inviteToken, shareLinks, type InviteAction } from '@adaptive-tutor/core';

// ADMIN / TEAM ONLY (permission "invitations"). Role, expiry and status are decided here on the server; nothing from the browser is trusted.
const fail = (err: any) => NextResponse.json({ data: null, error: err?.message === 'not_authorized' ? 'not_authorized' : (err?.message ?? 'unknown_error') }, { status: err?.message === 'not_authorized' ? 403 : 400 });
const cleanSrc = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9_.\- ]/g, '').trim().slice(0, 40) || null;

export async function GET(request: Request) {
  try {
    await requireAdmin('invitations');
    const service = createServiceClient(); const u = new URL(request.url); const origin = siteOrigin(request);
    const id = u.searchParams.get('id');
    if (id) {
      const d = await invitationDetail(service, id); if (!d) return NextResponse.json({ data: null, error: 'not_found' }, { status: 404 });
      const token = await inviteToken(service, id); const link = token ? inviteLink(origin, token) : null;
      return NextResponse.json({ data: { ...d, link, share: link && ['pending', 'opened'].includes(d.inv.status) ? shareLinks(d.inv.role, link, d.inv.campaign) : null }, error: null });
    }
    await syncProgress(service).catch(() => 0);
    const rows = await listInvitations(service, { status: u.searchParams.get('status') ?? undefined, role: u.searchParams.get('role') ?? undefined, q: u.searchParams.get('q') ?? undefined, createdBy: u.searchParams.get('createdBy') ?? undefined, source: u.searchParams.get('source') ?? undefined });
    return NextResponse.json({ data: { rows, stats: inviteStats(rows) }, error: null });
  } catch (err) { return fail(err); }
}
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin('invitations');
    const body = await request.json().catch(() => ({}));
    const v = validateInvite(body);
    if (!v.ok) return NextResponse.json({ data: null, error: v.error }, { status: 400 });
    const service = createServiceClient();
    const r = await createInvitation(service, { actor: admin.email, invite: v.value, source: cleanSrc(body.source) ?? 'invitation', campaign: cleanSrc(body.campaign), referralCode: cleanSrc(body.referralCode) });
    if (!r.ok) return NextResponse.json({ data: null, error: r.error }, { status: 500 });
    const link = inviteLink(siteOrigin(request), r.token);
    return NextResponse.json({ data: { id: r.id, link, warning: r.warning ?? null, role: v.value.role, name: v.value.name, share: shareLinks(v.value.role, link, cleanSrc(body.campaign)) }, error: null });
  } catch (err) { return fail(err); }
}
export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin('invitations');
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? '') as InviteAction;
    if (!['revoke', 'cancel', 'reissue', 'extend'].includes(action)) return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
    const r = await actOnInvitation(createServiceClient(), admin.email, String(body.id ?? ''), action, { reason: body.reason, days: body.days });
    if (!r.ok) return NextResponse.json({ data: null, error: r.error }, { status: 400 });
    return NextResponse.json({ data: { id: r.id ?? body.id, link: r.token ? inviteLink(siteOrigin(request), r.token) : null }, error: null });
  } catch (err) { return fail(err); }
}
