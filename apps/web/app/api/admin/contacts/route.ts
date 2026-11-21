import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { updateContact, writeAudit, CONTACT_ERROR_TEXT } from '@adaptive-tutor/core';

// v136: Contact book edit. Super Admin only (no permission name given). The audit line names the fields changed, never their values.
export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const userId = String(body.userId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ data: null, error: 'contact_not_found', message: CONTACT_ERROR_TEXT.contact_not_found }, { status: 400 });
    const service = createServiceClient();
    const r = await updateContact(service, userId, body, admin.email);
    await writeAudit(service, { actorEmail: admin.email, actorRole: 'super_admin', action: 'contact.edit', entity: 'user', entityId: userId, targetAccount: userId, outcome: r.ok ? 'success' : 'failed', reason: r.ok ? null : r.code, detail: { fields: r.ok ? r.changed.join(',') : '' } });
    if (!r.ok) return NextResponse.json({ data: null, error: r.code, message: CONTACT_ERROR_TEXT[r.code] }, { status: r.code === 'contact_not_found' ? 404 : r.code === 'contact_save_failed' ? 500 : 400 });
    return NextResponse.json({ data: { changed: r.changed }, error: null });
  } catch (e: any) {
    if (e?.message === 'not_authorized') return NextResponse.json({ data: null, error: 'not_authorized' }, { status: 403 });
    return NextResponse.json({ data: null, error: 'contact_save_failed', message: CONTACT_ERROR_TEXT.contact_save_failed }, { status: 500 });
  }
}
