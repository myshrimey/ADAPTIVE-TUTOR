import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { createCurriculumVersion, supersedeSiblings, writeAudit } from '../config-engine/config-engine';
import { validateUploadMeta, validateFile, EDITABLE_STATUSES, NODE_KINDS, PARENT_KIND, slug, type NodeKind } from './constants';
import { extractFromFile, parseOutlineText, parseCsv, rowsToNodes, type DraftNode, type Extraction } from './parse';
import { checkOutline } from './validate';

const BUCKET = 'curriculum-docs';
const nowIso = () => new Date().toISOString();
export async function addCurriculumEvent(service: SupabaseClient, versionId: string, event: string, actor: string | null, detail: Record<string, unknown> = {}) {
  try { await service.from('curriculum_events').insert({ version_id: versionId, at: nowIso(), event, actor, detail }); } catch { /* history is best effort */ }
}
export const isEditable = (status: string) => (EDITABLE_STATUSES as readonly string[]).includes(status);
async function setStatus(service: SupabaseClient, id: string, status: string, note?: string | null) { await service.from('curriculum_versions').update({ status, status_note: note ?? null, updated_at: nowIso() }).eq('id', id); }

async function writeNodes(service: SupabaseClient, versionId: string, ex: Extraction, replace: boolean) {
  if (replace) await service.from('curriculum_nodes').delete().eq('version_id', versionId);
  const idByKey = new Map<string, string>(); const done: DraftNode[] = [];
  // parents always come before children in extraction order, so one pass is enough
  for (const n of ex.nodes) {
    const parent = n.parentKey ? idByKey.get(n.parentKey) ?? null : null;
    const { data, error } = await service.from('curriculum_nodes').insert({ version_id: versionId, parent_id: parent, kind: n.kind, name: n.name, sequence: n.sequence, source_page: n.page, confidence: n.confidence, stable_key: n.key }).select('id').single();
    if (error || !data) throw new Error('Could not save the outline.');
    idByKey.set(n.key, (data as any).id); done.push(n);
  }
  return done.length;
}

/** Upload: validate, keep the file in the private bucket, create a NEW version (never touching the published one), read what can be read, and put it in review. */
export async function registerUpload(service: SupabaseClient, actor: string, metaIn: unknown, file: { name: string; mime?: string; buffer: Buffer }): Promise<{ ok: true; versionId: string; nodes: number; note: string } | { ok: false; error: string }> {
  const m = validateUploadMeta(metaIn); if (!m.ok) return m;
  const f = validateFile({ name: file.name, size: file.buffer.length, head: new Uint8Array(file.buffer.subarray(0, 512)) }); if (!f.ok) return f;
  let versionId: string;
  try { versionId = await createCurriculumVersion(service, { board: m.value.board, academic_year: m.value.academic_year, class_level: m.value.class_level, subject_label: m.value.subject, language: m.value.language, source_reference: m.value.source_url ?? m.value.source_note }); }
  catch (e: any) { return { ok: false, error: e?.message ?? 'Could not create the version.' }; }
  await setStatus(service, versionId, 'uploaded');
  const sha = createHash('sha256').update(file.buffer).digest('hex'); const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80);
  const path = `${versionId}/${sha.slice(0, 12)}-${safeName}`; let storageError: string | null = null;
  try { const up = await (service as any).storage.from(BUCKET).upload(path, file.buffer, { contentType: file.mime || 'application/octet-stream', upsert: false }); if (up?.error) storageError = String(up.error.message ?? 'storage error').slice(0, 160); }
  catch (e: any) { storageError = String(e?.message ?? 'storage unavailable').slice(0, 160); }
  const { data: doc, error: dErr } = await service.from('curriculum_documents').insert({ version_id: versionId, file_name: file.name.slice(0, 160), mime: file.mime ?? null, size_bytes: file.buffer.length, sha256: sha, storage_path: storageError ? null : path, doc_type: m.value.doc_type, source_url: m.value.source_url ?? null, source_note: m.value.source_note ?? null, source_date: m.value.source_date ?? null, uploaded_by: actor, uploaded_at: nowIso() }).select('id').single();
  if (dErr || !doc) { await setStatus(service, versionId, 'failed', 'Could not record the document.'); return { ok: false, error: 'Could not record the document.' }; }
  await addCurriculumEvent(service, versionId, 'uploaded', actor, { file: file.name.slice(0, 80), bytes: file.buffer.length, stored: !storageError });
  await writeAudit(service, { actorEmail: actor, action: 'curriculum.upload', entity: 'curriculum_version', entityId: versionId, detail: { board: m.value.board, year: m.value.academic_year, class: m.value.class_level, subject: m.value.subject } });
  await setStatus(service, versionId, 'processing');
  const ex = extractFromFile(f.ext, file.buffer); let count = 0;
  try { count = await writeNodes(service, versionId, ex, true); }
  catch (e: any) { await service.from('curriculum_documents').update({ process_method: ex.method, error: String(e?.message ?? 'failed').slice(0, 200) }).eq('id', (doc as any).id); await setStatus(service, versionId, 'failed', 'Processing failed.'); await addCurriculumEvent(service, versionId, 'failed', null, {}); return { ok: false, error: 'Processing failed. The file was kept; you can paste the outline instead.' }; }
  const note = ex.note + (storageError ? ` The original file could not be stored (${storageError}).` : '');
  await service.from('curriculum_documents').update({ process_method: ex.method, process_note: note }).eq('id', (doc as any).id);
  await setStatus(service, versionId, 'needs_review', note);
  await addCurriculumEvent(service, versionId, 'processed', null, { method: ex.method, nodes: count, unrecognised: ex.unrecognised });
  return { ok: true, versionId, nodes: count, note };
}

/** Paste outline text or CSV text into a version that is still editable (the way a PDF's content is entered). Replaces the outline; the audit trail records it. */
export async function replaceOutline(service: SupabaseClient, actor: string, versionId: string, text: string, format: 'outline' | 'csv'): Promise<{ ok: boolean; error?: string; nodes?: number; note?: string }> {
  const { data: v } = await service.from('curriculum_versions').select('status').eq('id', versionId).maybeSingle();
  if (!v) return { ok: false, error: 'Version not found.' };
  if (!isEditable((v as any).status)) return { ok: false, error: 'This version is frozen. Upload a new version instead.' };
  const body = String(text ?? '').slice(0, 400000); const ex = format === 'csv' ? rowsToNodes(parseCsv(body)) : parseOutlineText(body);
  if (!ex.nodes.length) return { ok: false, error: ex.note };
  const n = await writeNodes(service, versionId, ex, true); await setStatus(service, versionId, 'needs_review', ex.note);
  await addCurriculumEvent(service, versionId, 'outline_replaced', actor, { format, nodes: n }); await writeAudit(service, { actorEmail: actor, action: 'curriculum.outline', entity: 'curriculum_version', entityId: versionId, detail: { nodes: n } });
  return { ok: true, nodes: n, note: ex.note };
}

async function nodeAndVersion(service: SupabaseClient, nodeId: string) {
  const { data: n } = await service.from('curriculum_nodes').select('id, version_id, kind, name, parent_id, flagged').eq('id', nodeId).maybeSingle(); if (!n) return null;
  const { data: v } = await service.from('curriculum_versions').select('status').eq('id', (n as any).version_id).maybeSingle();
  return { node: n as any, status: (v as any)?.status as string };
}
export async function editNode(service: SupabaseClient, actor: string, nodeId: string, patch: { name?: string; source_page?: number | null; flagged?: boolean; flag_note?: string | null }): Promise<{ ok: boolean; error?: string }> {
  const nv = await nodeAndVersion(service, nodeId); if (!nv) return { ok: false, error: 'Item not found.' };
  if (!isEditable(nv.status)) return { ok: false, error: 'This version is frozen. Upload a new version instead.' };
  const u: Record<string, unknown> = {};
  if (patch.name !== undefined) { const n = String(patch.name).replace(/\s+/g, ' ').trim().slice(0, 300); if (!n) return { ok: false, error: 'The name cannot be empty.' }; u.name = n; u.confidence = 1; } // a person has now checked it
  if (patch.source_page !== undefined) { const p = patch.source_page === null ? null : Number(patch.source_page); if (p !== null && (!Number.isInteger(p) || p < 1 || p > 9999)) return { ok: false, error: 'Page must be a whole number.' }; u.source_page = p; }
  if (patch.flagged !== undefined) { u.flagged = !!patch.flagged; u.flag_note = patch.flagged ? String(patch.flag_note ?? '').slice(0, 200) || null : null; }
  await service.from('curriculum_nodes').update(u).eq('id', nodeId);
  await addCurriculumEvent(service, nv.node.version_id, 'node_edited', actor, { node: nodeId, fields: Object.keys(u) });
  return { ok: true };
}
export async function addNode(service: SupabaseClient, actor: string, versionId: string, p: { kind: string; name: string; parentId?: string | null; page?: number | null }): Promise<{ ok: boolean; error?: string }> {
  const { data: v } = await service.from('curriculum_versions').select('status').eq('id', versionId).maybeSingle(); if (!v) return { ok: false, error: 'Version not found.' };
  if (!isEditable((v as any).status)) return { ok: false, error: 'This version is frozen. Upload a new version instead.' };
  if (!(NODE_KINDS as readonly string[]).includes(p.kind)) return { ok: false, error: 'Unknown kind.' };
  const kind = p.kind as NodeKind; const name = String(p.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 300); if (!name) return { ok: false, error: 'The name cannot be empty.' };
  let parentKey = ''; if (p.parentId) { const { data: par } = await service.from('curriculum_nodes').select('id, kind, stable_key, version_id').eq('id', p.parentId).maybeSingle(); if (!par || (par as any).version_id !== versionId) return { ok: false, error: 'Parent not found.' }; if (PARENT_KIND[kind] && (par as any).kind !== PARENT_KIND[kind] && kind !== 'learning_outcome') return { ok: false, error: `A ${kind.replace('_', ' ')} goes under a ${String(PARENT_KIND[kind]).replace('_', ' ')}.` }; parentKey = (par as any).stable_key + '/'; }
  const { data: ex } = await service.from('curriculum_nodes').select('stable_key').eq('version_id', versionId); const used = new Set(((ex ?? []) as any[]).map((r) => r.stable_key));
  const base = parentKey + kind + '-' + slug(name); let key = base, i = 2; while (used.has(key)) key = base + '-' + i++;
  const { count } = await service.from('curriculum_nodes').select('id', { count: 'exact', head: true }).eq('version_id', versionId);
  const { error } = await service.from('curriculum_nodes').insert({ version_id: versionId, parent_id: p.parentId ?? null, kind, name, sequence: (count ?? 0) + 1, source_page: p.page ?? null, confidence: 1, stable_key: key });
  if (error) return { ok: false, error: 'Could not add.' }; await addCurriculumEvent(service, versionId, 'node_added', actor, { kind }); return { ok: true };
}
export async function deleteNode(service: SupabaseClient, actor: string, nodeId: string): Promise<{ ok: boolean; error?: string }> {
  const nv = await nodeAndVersion(service, nodeId); if (!nv) return { ok: false, error: 'Item not found.' };
  if (!isEditable(nv.status)) return { ok: false, error: 'This version is frozen. Upload a new version instead.' };
  await service.from('curriculum_nodes').delete().eq('id', nodeId); await addCurriculumEvent(service, nv.node.version_id, 'node_deleted', actor, { kind: nv.node.kind }); return { ok: true };
}

export async function versionOutline(service: SupabaseClient, versionId: string) {
  const { data } = await service.from('curriculum_nodes').select('id, parent_id, kind, name, sequence, source_page, confidence, flagged, flag_note, stable_key, linked_table, linked_id').eq('version_id', versionId).order('sequence', { ascending: true }).limit(6000);
  return (data ?? []) as any[];
}
export async function versionDetail(service: SupabaseClient, versionId: string) {
  const { data: v } = await service.from('curriculum_versions').select('*').eq('id', versionId).maybeSingle(); if (!v) return null;
  const nodes = await versionOutline(service, versionId);
  const { data: docs } = await service.from('curriculum_documents').select('id, file_name, mime, size_bytes, doc_type, source_url, source_note, source_date, uploaded_by, uploaded_at, process_method, process_note, error, storage_path').eq('version_id', versionId).order('uploaded_at', { ascending: true });
  const { data: ev } = await service.from('curriculum_events').select('id, at, event, actor, detail').eq('version_id', versionId).order('at', { ascending: true }).limit(300);
  return { version: v as any, nodes, documents: (docs ?? []) as any[], events: (ev ?? []) as any[], check: checkOutline(nodes) };
}

/** Approve: a person confirms the outline matches the source. Needs a source, no empty outline, no open errors, nothing still flagged. */
export async function approveVersion(service: SupabaseClient, actor: string, versionId: string): Promise<{ ok: boolean; error?: string }> {
  const d = await versionDetail(service, versionId); if (!d) return { ok: false, error: 'Version not found.' };
  if (d.version.status !== 'needs_review') return { ok: false, error: `A version that is "${d.version.status}" cannot be approved.` };
  if (!d.version.source_reference) return { ok: false, error: 'Enter the official source before approving.' };
  if (d.check.errors) return { ok: false, error: d.check.issues.find((i) => i.level === 'error')!.message };
  if (d.check.flagged) return { ok: false, error: `${d.check.flagged} flagged item(s) must be cleared first.` };
  await service.from('curriculum_versions').update({ status: 'approved', approved_by: actor, approved_at: nowIso(), updated_at: nowIso() }).eq('id', versionId);
  await addCurriculumEvent(service, versionId, 'approved', actor, { nodes: d.nodes.length }); await writeAudit(service, { actorEmail: actor, action: 'curriculum.approve', entity: 'curriculum_version', entityId: versionId, detail: {} });
  return { ok: true };
}
export async function unapproveVersion(service: SupabaseClient, actor: string, versionId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: v } = await service.from('curriculum_versions').select('status').eq('id', versionId).maybeSingle(); if (!v) return { ok: false, error: 'Version not found.' };
  if ((v as any).status !== 'approved') return { ok: false, error: 'Only an approved version can be sent back to review.' };
  await setStatus(service, versionId, 'needs_review'); await addCurriculumEvent(service, versionId, 'sent_back', actor); return { ok: true };
}
export type VersionDiff = { added: string[]; removed: string[]; kept: number };
export async function diffVersions(service: SupabaseClient, olderId: string, newerId: string): Promise<VersionDiff> {
  const [a, b] = await Promise.all([versionOutline(service, olderId), versionOutline(service, newerId)]);
  const ka = new Map(a.map((n) => [n.stable_key as string, n])), kb = new Map(b.map((n) => [n.stable_key as string, n]));
  const label = (n: any) => `${String(n.kind).replace('_', ' ')}: ${n.name}`;
  return { added: b.filter((n) => !ka.has(n.stable_key)).map(label), removed: a.filter((n) => !kb.has(n.stable_key)).map(label), kept: b.filter((n) => ka.has(n.stable_key)).length };
}
/** Publish an approved version. The version it replaces becomes "superseded" (kept, never deleted) and can be restored by rollback. */
export async function publishVersion(service: SupabaseClient, actor: string, versionId: string): Promise<{ ok: boolean; error?: string; superseded?: string[]; diff?: VersionDiff | null }> {
  const { data: v } = await service.from('curriculum_versions').select('status').eq('id', versionId).maybeSingle(); if (!v) return { ok: false, error: 'Version not found.' };
  if ((v as any).status !== 'approved') return { ok: false, error: 'Only an approved version can be published.' };
  const superseded = await supersedeSiblings(service, versionId);
  await service.from('curriculum_versions').update({ status: 'published', published_at: nowIso(), published_by: actor, updated_at: nowIso() }).eq('id', versionId);
  const diff = superseded[0] ? await diffVersions(service, superseded[0], versionId) : null;
  await addCurriculumEvent(service, versionId, 'published', actor, { superseded: superseded.length, added: diff?.added.length ?? null, removed: diff?.removed.length ?? null });
  for (const s of superseded) await addCurriculumEvent(service, s, 'superseded', actor, { by: versionId });
  await writeAudit(service, { actorEmail: actor, action: 'curriculum.publish', entity: 'curriculum_version', entityId: versionId, detail: { superseded: superseded.length } });
  return { ok: true, superseded, diff };
}
/** Rollback: make an earlier (superseded) version the published one again. Reports made under either version keep their own version stamp. */
export async function rollbackVersion(service: SupabaseClient, actor: string, versionId: string): Promise<{ ok: boolean; error?: string }> {
  const { data: v } = await service.from('curriculum_versions').select('status').eq('id', versionId).maybeSingle(); if (!v) return { ok: false, error: 'Version not found.' };
  if ((v as any).status !== 'superseded') return { ok: false, error: 'Only an earlier, superseded version can be restored.' };
  const sup = await supersedeSiblings(service, versionId);
  await service.from('curriculum_versions').update({ status: 'published', published_at: nowIso(), published_by: actor, updated_at: nowIso() }).eq('id', versionId);
  await addCurriculumEvent(service, versionId, 'rolled_back', actor, { replaced: sup.length }); for (const s of sup) await addCurriculumEvent(service, s, 'superseded', actor, { by: versionId, rollback: true });
  await writeAudit(service, { actorEmail: actor, action: 'curriculum.rollback', entity: 'curriculum_version', entityId: versionId, detail: { replaced: sup.length } });
  return { ok: true };
}
export async function listCurriculumOverview(service: SupabaseClient) {
  const { data } = await service.from('curriculum_versions').select('id, board, academic_year, class_level, subject_label, language, version, status, source_reference, published_at, updated_at').order('academic_year', { ascending: false }).order('updated_at', { ascending: false }).limit(300);
  const rows = (data ?? []) as any[]; const out = [];
  for (const r of rows) { const { count } = await service.from('curriculum_nodes').select('id', { count: 'exact', head: true }).eq('version_id', r.id); out.push({ ...r, nodes: count ?? 0 }); }
  return out;
}

// ---- link to the learning content, and the version stamp on reports ----
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** Suggest (never apply) links between outline items and existing chapters/topics of the same subject, by identical wording only. */
export async function suggestLinks(service: SupabaseClient, versionId: string, subjectId: string | null) {
  if (!subjectId) return [];
  const nodes = (await versionOutline(service, versionId)).filter((n) => (n.kind === 'chapter' || n.kind === 'topic') && !n.linked_id);
  const { data: ch } = await service.from('chapters').select('id, name').eq('subject_id', subjectId); const chIds = ((ch ?? []) as any[]).map((c) => c.id);
  const { data: tp } = chIds.length ? await service.from('topics').select('id, name').in('chapter_id', chIds) : { data: [] as any[] };
  const byCh = new Map(((ch ?? []) as any[]).map((c) => [norm(c.name), c.id])), byTp = new Map(((tp ?? []) as any[]).map((t) => [norm(t.name), t.id]));
  const out: { nodeId: string; name: string; table: 'chapters' | 'topics'; id: string }[] = [];
  for (const n of nodes) { const id = n.kind === 'chapter' ? byCh.get(norm(n.name)) : byTp.get(norm(n.name)); if (id) out.push({ nodeId: n.id, name: n.name, table: n.kind === 'chapter' ? 'chapters' : 'topics', id }); }
  return out;
}
export async function linkNode(service: SupabaseClient, actor: string, nodeId: string, table: 'chapters' | 'topics' | 'skills' | null, id: string | null): Promise<{ ok: boolean; error?: string }> {
  const nv = await nodeAndVersion(service, nodeId); if (!nv) return { ok: false, error: 'Item not found.' };
  if (table && !['chapters', 'topics', 'skills'].includes(table)) return { ok: false, error: 'Unknown link type.' };
  if (table && id) { const { data } = await service.from(table).select('id').eq('id', id).maybeSingle(); if (!data) return { ok: false, error: 'That learning item does not exist.' }; }
  await service.from('curriculum_nodes').update({ linked_table: table, linked_id: table ? id : null }).eq('id', nodeId);
  await addCurriculumEvent(service, nv.node.version_id, 'node_linked', actor, { table }); return { ok: true };
}
/** The published version for a subject (by subject id). Used to stamp reports; null when nothing is published. Never throws. */
export async function publishedVersionForSubject(service: SupabaseClient, subjectId: string | null | undefined): Promise<{ id: string; label: string } | null> {
  try {
    if (!subjectId) return null;
    const { data } = await service.from('curriculum_versions').select('id, board, academic_year, class_level, version, subject_label').eq('subject_id', subjectId).eq('status', 'published').order('published_at', { ascending: false }).limit(1);
    const r = (data ?? [])[0] as any; return r ? { id: r.id, label: `${r.board} ${r.academic_year} Class ${String(r.class_level).replace(/^class\s*/i, '')} ${r.subject_label ?? ''} v${r.version}`.replace(/\s+/g, ' ').trim() } : null;
  } catch { return null; }
}

/** v82: best-effort stamp of the published curriculum version on a result row. Never throws; works only after migration 0052.
 *  Returns the version id used (or null). Pass useVersionId to reuse the version the check started with. */
export async function stampCurriculumVersion(service: SupabaseClient, table: 'baseline_sessions' | 'student_baselines', rowId: string | null | undefined, subjectId: string | null | undefined, useVersionId?: string | null): Promise<string | null> {
  try {
    if (!rowId) return null;
    const id = useVersionId || (await publishedVersionForSubject(service, subjectId))?.id || null;
    if (!id) return null;
    const { error } = await service.from(table).update({ curriculum_version_id: id }).eq('id', rowId);
    return error ? null : id;
  } catch { return null; }
}
