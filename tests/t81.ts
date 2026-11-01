import { fakeDb } from './fakedb2';
import { readFileSync } from 'fs';
import * as core from '../packages/core';
const { parseCsv, rowsToNodes, parseOutlineText, docxToText, xlsxToRows, extractFromFile, validateUploadMeta, validateFile, checkOutline, registerUpload, replaceOutline, editNode, addNode, deleteNode, approveVersion, publishVersion, rollbackVersion, unapproveVersion, versionDetail, diffVersions, publishedVersionForSubject, linkNode, suggestLinks, canMoveCurriculum,
  BRAND, makeExportMeta, exportId, safeFileName, metaText, exportHeaders, asciiOnly, PRIVACY_LABEL, buildStudentReport } = core as any;
const FX = 'tests/fx/';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
process.env.ADMIN_EMAILS = 'founder@x.com';
(async () => {
  // ---- parsing ----
  const rows = parseCsv('unit,chapter,topic,source_page\n"U, one",C1,T1,5\n,,T2,6\n,C2,T3,\n');
  ok(rows.length === 4 && rows[1][0] === 'U, one', 'csv quoting');
  const t = rowsToNodes(rows); const kinds = t.nodes.map((x: any) => x.kind).join();
  ok(kinds === 'unit,chapter,topic,topic,chapter,topic', 'csv hierarchy carries parents down: ' + kinds);
  ok(t.nodes.find((x: any) => x.name === 'T2').parentKey === t.nodes.find((x: any) => x.name === 'C1').key, 'T2 sits under C1');
  ok(t.nodes.find((x: any) => x.name === 'T1').page === 5 && t.nodes.find((x: any) => x.name === 'T3').page === null, 'pages kept, missing page stays empty');
  ok(rowsToNodes(parseCsv('foo,bar\n1,2\n')).nodes.length === 0, 'unknown columns give nothing (no guessing)');
  const o = parseOutlineText('Unit 1: Alpha\nChapter 2 - Beta [p.12]\nTopic: Gamma (page 13)\nLO: Do x\nsome random text\n\nAO: Reason well');
  ok(o.nodes.length === 5 && o.unrecognised === 1, 'outline: 5 nodes, 1 skipped line');
  ok(o.nodes.find((x: any) => x.name === 'Beta').page === 12 && o.nodes.find((x: any) => x.name === 'Gamma').page === 13, 'outline pages');
  ok(o.nodes.every((x: any) => x.confidence <= 0.9), 'automatic reading is never 100% confident');
  const dx = docxToText(readFileSync(FX + 't.docx'))!; ok(dx.includes('Alpha & Beta [p.2]'), 'docx text + entities');
  const de = extractFromFile('docx', readFileSync(FX + 't.docx')); ok(de.nodes.length === 5 && de.unrecognised === 1, 'docx outline: ' + de.nodes.length);
  const xr = xlsxToRows(readFileSync(FX + 't.xlsx'))!; ok(xr.length === 3 && xr[1][0] === 'U1' && xr[1][3] === '7', 'xlsx rows incl. numbers and shared strings');
  const xe = extractFromFile('xlsx', readFileSync(FX + 't.xlsx')); ok(xe.nodes.map((x: any) => x.name).join() === 'U1,C1,T1,T2', 'xlsx outline ' + xe.nodes.map((x: any) => x.name));
  const pe = extractFromFile('pdf', readFileSync(FX + 't.pdf')); ok(pe.nodes.length === 0, 'sync entry does not read a PDF (the upload uses the async reader, tested in t83)');
  ok(extractFromFile('docx', Buffer.from('not a zip')).nodes.length === 0, 'bad docx handled');

  // ---- validation ----
  const meta = { board: 'CBSE', academic_year: '2026-27', class_level: '10', subject: 'Mathematics', language: 'en', doc_type: 'syllabus', source_note: 'CBSE syllabus 2026-27' };
  ok(validateUploadMeta(meta).ok, 'meta ok'); ok(!validateUploadMeta({ ...meta, academic_year: '2026' }).ok, 'year format'); ok(!validateUploadMeta({ ...meta, source_note: '' }).ok, 'source required');
  ok(!validateUploadMeta({ ...meta, source_url: 'javascript:alert(1)', source_note: '' }).ok, 'javascript: source refused');
  ok(!validateFile({ name: 'a.exe', size: 10, head: new Uint8Array(4) }).ok, 'exe refused'); ok(!validateFile({ name: 'a.pdf', size: 5 * 1024 * 1024, head: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }).ok, 'too big');
  ok(!validateFile({ name: 'a.pdf', size: 10, head: new Uint8Array([1, 2, 3, 4]) }).ok, 'renamed file refused (magic bytes)'); ok(validateFile({ name: 'a.PDF', size: 10, head: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }).ok, 'real pdf ok');
  ok(!validateFile({ name: 'a.docx', size: 10, head: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }).ok, 'pdf renamed docx refused'); ok(!validateFile({ name: 'a.csv', size: 10, head: new Uint8Array([65, 0, 66]) }).ok, 'binary csv refused'); ok(!validateFile({ name: 'a.pdf', size: 0, head: new Uint8Array(0) }).ok, 'empty refused');

  // ---- checks ----
  const c0 = checkOutline([]); ok(c0.errors === 1, 'empty outline is an error');
  const c1 = checkOutline([{ id: 'a', kind: 'chapter', name: 'C' }, { id: 'b', kind: 'chapter', name: 'C' }, { id: 'c', kind: 'topic', name: 'T', parent_id: 'a', flagged: true }]);
  ok(c1.issues.some((i: any) => /Duplicate/.test(i.message)) && c1.flagged === 1 && c1.completeness.chaptersWithTopics === 50, 'duplicates, flagged, completeness');
  ok(c1.issues.some((i: any) => /nothing is invented|No learning outcomes/.test(i.message)), 'missing outcomes reported, not invented');

  // ---- workflow ----
  const mkdb = () => { const db: any = fakeDb({ curriculum_versions: [], curriculum_documents: [], curriculum_nodes: [], curriculum_events: [], audit_logs: [], chapters: [{ id: 'ch1', subject_id: 's1', name: 'Real Numbers' }], topics: [{ id: 'tp1', chapter_id: 'ch1', name: 'Euclid division lemma' }], skills: [] }); const up: any[] = []; db.storage = { from: () => ({ upload: async (p: string) => { up.push(p); return { error: null }; } }) }; db._up = up; return db; };
  const db = mkdb(); const T = db._tables;
  const csv = Buffer.from('unit,chapter,topic,learning_outcome,source_page\nU1,Real Numbers,Euclid division lemma,Apply the lemma,4\n,Polynomials,Zeros,,9\n');
  const r1: any = await registerUpload(db, 'ed@x.com', meta, { name: 'syl.csv', mime: 'text/csv', buffer: csv });
  ok(r1.ok && r1.nodes === 6, 'upload csv → nodes: ' + JSON.stringify(r1));
  let v = T.curriculum_versions[0]; ok(v.status === 'needs_review' && v.version === 1, 'lands in needs_review');
  ok(T.curriculum_documents.length === 1 && T.curriculum_documents[0].sha256.length === 64 && db._up.length === 1, 'document recorded + stored privately');
  ok(!db._up[0].includes('..') && db._up[0].startsWith(v.id), 'storage path under version id');
  ok(T.curriculum_events.some((e: any) => e.event === 'uploaded') && T.audit_logs.some((a: any) => a.action === 'curriculum.upload'), 'upload audited');
  const bad: any = await registerUpload(db, 'ed@x.com', meta, { name: 'x.pdf', buffer: readFileSync(FX + 'fake.pdf') }); ok(!bad.ok && T.curriculum_versions.length === 1, 'invalid file creates nothing');
  const pdf: any = await registerUpload(db, 'ed@x.com', { ...meta, subject: 'Science' }, { name: 'sci.pdf', mime: 'application/pdf', buffer: readFileSync(FX + 't.pdf') });
  ok(pdf.ok && pdf.nodes === 0, 'PDF registers with 0 items awaiting pasted outline');
  ok(!(await approveVersion(db, 'f', pdf.versionId)).ok, 'cannot approve an empty outline');
  const rep: any = await replaceOutline(db, 'ed@x.com', pdf.versionId, 'Unit: S1\nChapter: Acids [p.3]\nTopic: pH', 'outline'); ok(rep.ok && rep.nodes === 3, 'paste outline for the PDF');
  // edit + flag + approve rules
  const nodes = T.curriculum_nodes.filter((x: any) => x.version_id === v.id); const topic = nodes.find((x: any) => x.kind === 'topic');
  ok((await editNode(db, 'ed', topic.id, { flagged: true, flag_note: 'check' })).ok, 'flag');
  const ap0: any = await approveVersion(db, 'founder@x.com', v.id); ok(!ap0.ok && /flagged/.test(ap0.error), 'flagged item blocks approval');
  ok((await editNode(db, 'ed', topic.id, { flagged: false, name: 'Euclid division lemma (corrected)' })).ok && T.curriculum_nodes.find((x: any) => x.id === topic.id).confidence === 1, 'edit clears flag and marks as person-checked');
  ok(!(await editNode(db, 'ed', topic.id, { name: '  ' })).ok, 'empty name refused'); ok(!(await editNode(db, 'ed', topic.id, { source_page: -3 as any })).ok, 'bad page refused');
  ok((await addNode(db, 'ed', v.id, { kind: 'topic', name: 'Added topic', parentId: nodes.find((x: any) => x.kind === 'chapter').id })).ok, 'add topic');
  ok(!(await addNode(db, 'ed', v.id, { kind: 'topic', name: 'Wrong', parentId: nodes.find((x: any) => x.kind === 'unit').id })).ok, 'topic cannot sit directly under a unit');
  const ap: any = await approveVersion(db, 'founder@x.com', v.id); ok(ap.ok && T.curriculum_versions[0].status === 'approved' && T.curriculum_versions[0].approved_by === 'founder@x.com', 'approved');
  ok(!(await editNode(db, 'ed', topic.id, { name: 'Sneaky edit' })).ok && !(await deleteNode(db, 'ed', topic.id)).ok && !(await replaceOutline(db, 'ed', v.id, 'Unit: x', 'outline')).ok, 'approved version is frozen');
  ok(!(await rollbackVersion(db, 'f', v.id)).ok, 'cannot roll back to a version that was never published');
  // publish v1
  const p1: any = await publishVersion(db, 'founder@x.com', v.id); ok(p1.ok && T.curriculum_versions[0].status === 'published' && p1.superseded.length === 0, 'published, nothing superseded yet');
  ok(!(await publishVersion(db, 'f', v.id)).ok, 'cannot publish twice');
  ok(T.audit_logs.some((a: any) => a.action === 'curriculum.publish') && T.curriculum_events.some((e: any) => e.event === 'published'), 'publish audited');
  // newer upload must NOT replace published
  const csv2 = Buffer.from('unit,chapter,topic,source_page\nU1,Real Numbers,Euclid division lemma (corrected),4\n,Statistics,Mean,20\n');
  const r2: any = await registerUpload(db, 'ed@x.com', meta, { name: 'syl2.csv', mime: 'text/csv', buffer: csv2 });
  ok(r2.ok && T.curriculum_versions.find((x: any) => x.id === r2.versionId).version === 2, 'second upload is version 2'); ok(T.curriculum_versions[0].status === 'published', 'uploading a newer file does NOT replace the published version');
  const pf1: any = await publishedVersionForSubject(db, null); ok(pf1 === null, 'no subject = no stamp');
  await approveVersion(db, 'founder@x.com', r2.versionId); const p2: any = await publishVersion(db, 'founder@x.com', r2.versionId);
  ok(p2.ok && p2.superseded.length === 1 && T.curriculum_versions[0].status === 'superseded' && T.curriculum_versions.find((x: any) => x.id === r2.versionId).status === 'published', 'v2 published, v1 superseded (kept)');
  ok(p2.diff.added.some((s: string) => /Statistics/.test(s)) && p2.diff.removed.some((s: string) => /Polynomials/.test(s)), 'diff shows what changed: +' + p2.diff.added.length + ' -' + p2.diff.removed.length);
  ok(T.curriculum_nodes.filter((x: any) => x.version_id === v.id).length === nodes.length + 1, 'old version outline untouched after the new one was published');
  const rb: any = await rollbackVersion(db, 'founder@x.com', v.id); ok(rb.ok && T.curriculum_versions[0].status === 'published' && T.curriculum_versions.find((x: any) => x.id === r2.versionId).status === 'superseded', 'rollback restores v1, v2 kept');
  ok(T.audit_logs.some((a: any) => a.action === 'curriculum.rollback'), 'rollback audited'); const d = await versionDetail(db, v.id); ok(d.events.map((e: any) => e.event).includes('rolled_back'), 'history shows rollback');
  // stamp on reports
  T.curriculum_versions[0].subject_id = 'sub1'; T.curriculum_versions[0].published_at = '2026-10-30T00:00:00Z';
  const st: any = await publishedVersionForSubject(db, 'sub1'); ok(st && st.id === v.id && /CBSE 2026-27 Class 10 Mathematics v1/.test(st.label), 'stamp label: ' + st?.label);
  // links
  T.curriculum_versions[0].subject_id = 's1'; const sg = await suggestLinks(db, r2.versionId, 's1'); ok(sg.some((x: any) => x.table === 'chapters' && x.name === 'Real Numbers'), 'identical-name suggestion only');
  const real = T.curriculum_nodes.find((x: any) => x.version_id === r2.versionId && x.name === 'Real Numbers');
  ok(!(await linkNode(db, 'ed', real.id, 'chapters', 'nope')).ok, 'link to unknown learning item refused'); ok(!(await linkNode(db, 'ed', real.id, 'users' as any, 'ch1')).ok, 'unknown link table refused');
  ok(canMoveCurriculum('published', 'superseded') && !canMoveCurriculum('uploaded', 'published') && !canMoveCurriculum('superseded', 'approved'), 'state machine');

  // ---- branding / export service ----
  ok(BRAND.website === 'https://cbse-tutor.vercel.app/' && BRAND.tagline === 'Measure Your Growth, Master Your Subjects.' && BRAND.logoPath === '/logo.png', 'central brand');
  const m = makeExportMeta({ title: 'Metrics', kind: 'metrics', classification: 'confidential', at: new Date('2026-10-30T10:00:00Z') });
  ok(/^SHK-20261030-METRICS-[0-9A-Z]{4}$/.test(m.id), 'export id format ' + m.id); ok(exportId('metrics', new Date('2026-10-30T10:00:00Z')) === exportId('metrics', new Date('2026-10-30T23:00:00Z')), 'same kind/day = same CSV id');
  ok(exportId('metrics', new Date('2026-10-30'), 'a') !== exportId('metrics', new Date('2026-10-30'), 'b'), 'salt differs');
  const h = exportHeaders(m, 'a b/c.csv', 'text/csv'); ok(h['Content-Disposition'] === 'attachment; filename="a_b_c.csv"' && h['X-Sahayak-Website'] === BRAND.website && h['Cache-Control'] === 'no-store', 'headers safe');
  ok(!/@|ravi|kabir/i.test(JSON.stringify(h)), 'no personal data in headers'); ok(safeFileName('My Data!', 'CSV', new Date('2026-10-30')) === 'sahayak-my-data-2026-10-30.csv', 'safe file name');
  const mt = metaText(m, 'x.csv'); ok(mt.includes(BRAND.website) && mt.includes(m.id) && mt.includes('Confidential') && mt.includes('Generated: 2026-10-30'), 'companion note has brand, id, date, privacy');
  ok(asciiOnly('गणित रिपोर्ट') === 'Sahayak report' && asciiOnly('Diagnostic: Maths') === 'Diagnostic: Maths', 'ASCII header text');
  ok(Object.keys(PRIVACY_LABEL).length === 4, 'four privacy levels');
  // the CSV body must stay machine readable: helper never touches the body
  const { csvResponse } = await import('../apps/web/lib/export');
  const resp = csvResponse('a,b\n1,2\n', { kind: 'metrics', title: 'Metrics', classification: 'internal' }); const body = await resp.text();
  ok(body === 'a,b\n1,2\n' && resp.headers.get('content-type')!.startsWith('text/csv') && /^SHK-/.test(resp.headers.get('x-sahayak-export-id')!), 'CSV body untouched; branding in headers');
  const bb = new Uint8Array(await csvResponse('a\n', { kind: 'k', title: 't', bom: true }).arrayBuffer()); const nb = new Uint8Array(await csvResponse('a\n', { kind: 'k', title: 't' }).arrayBuffer()); ok(bb[0] === 0xef && bb[1] === 0xbb && nb[0] === 0x61, 'BOM only when asked');
  console.log(`t81: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
