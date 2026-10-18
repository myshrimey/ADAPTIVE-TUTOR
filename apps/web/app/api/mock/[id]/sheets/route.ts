import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { MAX_UPLOAD_BYTES, MAX_PAGES, decideImageQuality, getHandwritingConsent, listSheets, loadPaperExam, saveSheet, deleteSheet } from '@adaptive-tutor/core';
import { measureImage, sniffImageType } from '@/lib/image-quality';

export const runtime = 'nodejs';

// Photos of the handwritten pages of a printed blueprint paper. Everything is tied to the signed-in student's own exam.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    await loadPaperExam(service, studentId, id);
    return NextResponse.json({ data: { pages: await listSheets(service, studentId, id), maxPages: MAX_PAGES }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    const consent = await getHandwritingConsent(service, studentId);
    if (!consent.current) return NextResponse.json({ data: null, error: 'consent_required' }, { status: 403 });
    await loadPaperExam(service, studentId, id);

    const form = await request.formData();
    const file = form.get('file');
    const pageNo = Number(form.get('page'));
    if (!(file instanceof File)) return NextResponse.json({ data: null, error: 'missing_file' }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ data: null, error: 'file_too_big' }, { status: 413 });
    const buf = Buffer.from(await file.arrayBuffer());
    if (!sniffImageType(buf)) return NextResponse.json({ data: null, error: 'not_an_image' }, { status: 400 });

    const { metrics, jpeg } = await measureImage(buf);
    const decision = decideImageQuality(metrics);
    if (!decision.ok) return NextResponse.json({ data: { accepted: false, reasons: decision.reasons, message: decision.message }, error: null });
    await saveSheet(service, studentId, id, pageNo, jpeg, { ...metrics, accepted: true }, jpeg.length);
    return NextResponse.json({ data: { accepted: true, message: decision.message, pageNo }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const studentId = await getCurrentStudentId();
    const service = createServiceClient();
    await loadPaperExam(service, studentId, id);
    const page = Number(new URL(request.url).searchParams.get('page'));
    await deleteSheet(service, studentId, id, page);
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err: any) {
    return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 });
  }
}
