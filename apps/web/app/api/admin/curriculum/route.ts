import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin';
import { registerUpload, replaceOutline, editNode, addNode, deleteNode, approveVersion, unapproveVersion, publishVersion, rollbackVersion, linkNode, versionDetail, diffVersions, suggestLinks } from '@adaptive-tutor/core';

// Upload, edit and read: academic team or Super Admin. APPROVE, PUBLISH and ROLLBACK: Super Admin only (no permission passed).
const fail = (e: any) => NextResponse.json({ data: null, error: e?.message === 'not_authorized' ? 'not_authorized' : 'failed' }, { status: e?.message === 'not_authorized' ? 403 : 400 });
const out = (r: any, extra: any = {}) => NextResponse.json({ data: r.ok ? { ok: true, ...extra } : null, error: r.ok ? null : r.error ?? 'failed' }, { status: r.ok ? 200 : 400 });

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin('academic');
    const form = await request.formData().catch(() => null); const file = form?.get('file');
    if (!form || !(file instanceof File)) return NextResponse.json({ data: null, error: 'Please choose a file.' }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ data: null, error: 'The file is larger than 4 MB. Please split it, or use the CSV template.' }, { status: 413 });
    const meta = Object.fromEntries(['board', 'academic_year', 'class_level', 'subject', 'language', 'doc_type', 'source_url', 'source_note', 'source_date'].map((k) => [k, String(form.get(k) ?? '')]));
    const r = await registerUpload(createServiceClient(), admin.email, meta, { name: file.name, mime: file.type, buffer: Buffer.from(await file.arrayBuffer()) });
    return NextResponse.json({ data: r.ok ? r : null, error: r.ok ? null : r.error }, { status: r.ok ? 200 : 400 });
  } catch (e) { return fail(e); }
}
export async function GET(request: Request) {
  try {
    await requireAdmin('academic'); const service = createServiceClient(); const u = new URL(request.url);
    const dl = u.searchParams.get('download');
    if (dl) { const { data: d } = await service.from('curriculum_documents').select('storage_path').eq('id', dl).maybeSingle(); if (!(d as any)?.storage_path) return NextResponse.json({ data: null, error: 'not_stored' }, { status: 404 });
      const s = await service.storage.from('curriculum-docs').createSignedUrl((d as any).storage_path, 60); return NextResponse.json({ data: { url: s.data?.signedUrl ?? null }, error: s.error ? 'failed' : null }); }
    const diff = u.searchParams.get('diff'); if (diff) { const [a, b] = diff.split(','); return NextResponse.json({ data: await diffVersions(service, a, b), error: null }); }
    const id = u.searchParams.get('id'); if (!id) return NextResponse.json({ data: null, error: 'missing_id' }, { status: 400 });
    const d = await versionDetail(service, id); return d ? NextResponse.json({ data: d, error: null }) : NextResponse.json({ data: null, error: 'not_found' }, { status: 404 });
  } catch (e) { return fail(e); }
}
export async function PATCH(request: Request) {
  try {
    const b = await request.json().catch(() => ({})); const action = String(b.action ?? ''); const service = createServiceClient();
    if (['approve', 'unapprove', 'publish', 'rollback'].includes(action)) {
      const a = await requireAdmin(); // Super Admin only
      if (action === 'approve') return out(await approveVersion(service, a.email, String(b.id)));
      if (action === 'unapprove') return out(await unapproveVersion(service, a.email, String(b.id)));
      if (action === 'publish') { const r = await publishVersion(service, a.email, String(b.id)); return out(r, { superseded: r.superseded?.length ?? 0, diff: r.diff ?? null }); }
      return out(await rollbackVersion(service, a.email, String(b.id)));
    }
    const a = await requireAdmin('academic');
    if (action === 'outline') return out(await replaceOutline(service, a.email, String(b.id), String(b.text ?? ''), b.format === 'csv' ? 'csv' : 'outline'));
    if (action === 'edit') return out(await editNode(service, a.email, String(b.nodeId), { name: b.name, source_page: b.source_page === '' ? null : b.source_page, flagged: b.flagged, flag_note: b.flag_note }));
    if (action === 'add') return out(await addNode(service, a.email, String(b.id), { kind: String(b.kind), name: String(b.name ?? ''), parentId: b.parentId || null, page: b.page ? Number(b.page) : null }));
    if (action === 'delete') return out(await deleteNode(service, a.email, String(b.nodeId)));
    if (action === 'link') return out(await linkNode(service, a.email, String(b.nodeId), b.table || null, b.linkId || null));
    if (action === 'suggest') { const { data: v } = await service.from('curriculum_versions').select('subject_id').eq('id', String(b.id)).maybeSingle(); return NextResponse.json({ data: { suggestions: await suggestLinks(service, String(b.id), (v as any)?.subject_id ?? null) }, error: null }); }
    return NextResponse.json({ data: null, error: 'unknown_action' }, { status: 400 });
  } catch (e) { return fail(e); }
}
