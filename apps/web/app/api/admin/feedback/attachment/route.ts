import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { FB_ATTACH_BUCKET, isUuid, writeAudit, publicError } from '@adaptive-tutor/core';

export const runtime = 'nodejs';

// v106: admins with the "support" permission look at (GET) or delete (POST) a picture sent with feedback.
// The bucket is private; the image is streamed through here, never linked by address.
export async function GET(request: Request) {
  try {
    await requireAdmin('support');
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!isUuid(id)) return new NextResponse('Not found', { status: 404 });
    const service = createServiceClient();
    const { data: row } = await service.from('feedback_attachments').select('storage_path').eq('id', id).maybeSingle();
    if (!row?.storage_path) return new NextResponse('Not found', { status: 404 });
    const { data: blob, error } = await service.storage.from(FB_ATTACH_BUCKET).download(row.storage_path);
    if (error || !blob) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(Buffer.from(await blob.arrayBuffer()), {
      headers: {
        'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline; filename="feedback-picture.jpg"',
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err, 'not_allowed') }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin('support');
    const b = await request.json().catch(() => ({}));
    if (b.action !== 'delete' || !isUuid(b.id)) return NextResponse.json({ data: null, error: 'bad_request' }, { status: 400 });
    const service = createServiceClient();
    const { data: row } = await service.from('feedback_attachments').select('storage_path').eq('id', b.id).maybeSingle();
    if (!row) return NextResponse.json({ data: null, error: 'not_found' }, { status: 404 });
    try { await service.storage.from(FB_ATTACH_BUCKET).remove([row.storage_path]); } catch { /* the row is removed anyway */ }
    const { error } = await service.from('feedback_attachments').delete().eq('id', b.id);
    if (error) throw error;
    await writeAudit(service, { actorEmail: admin.email, actorRole: 'support', action: 'feedback.picture_delete', entity: 'feedback_attachment', entityId: b.id, outcome: 'success' });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err, 'not_allowed') }, { status: 400 });
  }
}
