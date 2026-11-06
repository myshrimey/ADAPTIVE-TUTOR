import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { FB_ATTACH_MAX_BYTES, isUuid, publicError } from '@adaptive-tutor/core';
import { verifyAttachToken, saveFeedbackPicture, attachIpHash } from '@/lib/feedback-attachments';

export const runtime = 'nodejs';

// v106: add ONE picture to a feedback message that was just sent. Public (visitors can send feedback too), so it is gated by a short-lived
// signed permission (attachToken) that only the sender of that message received, plus limits per message and per internet address.
// The picture is checked by its first bytes and re-encoded as a plain JPEG; it is stored privately and only admins can open it.
export async function POST(request: Request) {
  try {
    const len = Number(request.headers.get('content-length') ?? 0);
    if (len > FB_ATTACH_MAX_BYTES + 20_000) return NextResponse.json({ data: null, error: 'too_big' }, { status: 413 });
    const form = await request.formData().catch(() => null);
    const feedbackId = String(form?.get('feedbackId') ?? ''); const token = form?.get('token'); const file = form?.get('file');
    if (!form || !isUuid(feedbackId) || !(file instanceof File)) return NextResponse.json({ data: null, error: 'not_a_picture' }, { status: 400 });
    if (!verifyAttachToken(feedbackId, token)) return NextResponse.json({ data: null, error: 'attachments_unavailable' }, { status: 403 });
    if (file.size > FB_ATTACH_MAX_BYTES) return NextResponse.json({ data: null, error: 'too_big' }, { status: 413 });
    const r = await saveFeedbackPicture(createServiceClient(), feedbackId, Buffer.from(await file.arrayBuffer()), attachIpHash(request));
    if (!r.ok) return NextResponse.json({ data: null, error: r.error }, { status: r.error === 'too_many_uploads' ? 429 : 400 });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: publicError(err, 'attachments_unavailable') }, { status: 400 });
  }
}
