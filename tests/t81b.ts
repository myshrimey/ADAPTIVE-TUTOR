import { readFileSync, readdirSync, statSync } from 'fs';
import { fakeDb } from './fakedb2';
import { saveTestReports, publishedVersionForSubject } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync('' + p, 'utf8');
const api = R('apps/web/app/api/admin/curriculum/route.ts');
ok(/\['approve', 'unapprove', 'publish', 'rollback'\]\.includes\(action\)\) \{\s*const a = await requireAdmin\(\);/.test(api), 'approve/publish/rollback: Super Admin only');
ok((api.match(/requireAdmin\('academic'\)/g) ?? []).length === 3, 'upload, read and edit gated to academic team');
ok(/4 \* 1024 \* 1024/.test(api), 'size limit enforced in the route');
const mig = R('packages/db/migrations/0051_curriculum_management.sql');
ok(/'curriculum-docs', 'curriculum-docs', false/.test(mig) && !/public\) values \('curriculum-docs', 'curriculum-docs', true/.test(mig), 'bucket is private');
for (const t of ['curriculum_documents', 'curriculum_nodes', 'curriculum_events']) ok(new RegExp(`alter table ${t} enable row level security`).test(mig), 'RLS on ' + t);
ok(!/create policy/.test(mig) && !/drop table|delete from|truncate/i.test(mig), 'no policies, no destructive statements');
ok(/superseded/.test(mig) && /unique index if not exists uq_curr_nodes_key/.test(mig), 'states + stable keys');
// every page under /admin/curriculum is gated
ok(/adminPageGate\('academic'\)/.test(R('apps/web/app/admin/curriculum/page.tsx')) && /adminPageGate\('academic'\)/.test(R('apps/web/app/admin/curriculum/[id]/page.tsx')), 'pages gated');
// exports: every download route uses the shared service
const routes = ['export/[sheet]', 'acquisition/export', 'metrics/export', 'social-growth/export', 'commerce/export', 'teachers/activity', 'founder/export', 'founder/memory-export'];
for (const r of routes) ok(/@\/lib\/export/.test(R(`apps/web/app/api/admin/${r}/route.ts`)) && !/'Content-Disposition'/.test(R(`apps/web/app/api/admin/${r}/route.ts`)), 'shared export service: ' + r);
ok(/fileResponse/.test(R('apps/web/app/api/student/export/route.ts')) && !/'Content-Disposition'/.test(R('apps/web/app/api/student/export/route.ts')), 'student export uses it');
// no route anywhere builds its own attachment header any more (except the CSV template, a fixed public file)
const walk = (d: string): string[] => readdirSync(d).flatMap((x) => { const p = d + '/' + x; return statSync(p).isDirectory() ? walk(p) : [p]; });
const own = walk('apps/web/app/api').filter((p) => /Content-Disposition/.test(readFileSync(p, 'utf8')));
ok(own.every((p) => /curriculum\/template|feedback\/attachment/.test(p)), 'remaining own headers: ' + own.map((p) => p.split('/api/')[1]).join(','));
const pdf = R('apps/web/lib/download-pdf.ts'); ok(/BRAND\.name/.test(pdf) && /pageLabel/.test(pdf) && /meta\.id/.test(pdf) && /BRAND\.website/.test(pdf) && /loadLogo/.test(pdf), 'PDF header/footer from central brand');
ok(/catch \{ return null; \}/.test(pdf), 'missing logo never blocks the PDF');
const pb = R('apps/web/components/reports/PrintButton.tsx'); ok(/printBranded/.test(pb) && /afterprint/.test(pb), 'print is branded');
ok(!/dangerouslySetInnerHTML/.test(R('apps/web/components/curriculum/ReviewBoard.tsx')), 'no raw HTML in review screen');
// report stamping
(async () => {
  const db: any = fakeDb({ test_reports: [], curriculum_versions: [{ id: 'v1', board: 'CBSE', academic_year: '2026-27', class_level: '10', version: 2, subject_id: 's1', subject_label: 'Maths', status: 'published', published_at: '2026-10-01' }] }, { unique: {} });
  const input: any = { kind: 'diagnostic', title: 'Diagnostic: Maths', score: 1, total: 2, inMarks: false, items: [{ id: 'q', prompt: 'p', studentAnswer: '1', correctAnswer: '1', correct: true, explanation: null, group: 'g' }] };
  ok(await saveTestReports(db, { studentId: 'st', subjectId: 's1', sourceId: 'x', input }), 'saved');
  ok(db._tables.test_reports.length === 2 && db._tables.test_reports.every((r: any) => r.data.curriculum?.id === 'v1' && /v2/.test(r.data.curriculum.label)), 'both report versions carry the curriculum version');
  const db2: any = fakeDb({ test_reports: [], curriculum_versions: [] }); await saveTestReports(db2, { studentId: 'st', subjectId: 's1', sourceId: 'x', input });
  ok(db2._tables.test_reports.length === 2 && db2._tables.test_reports.every((r: any) => r.data.curriculum === null), 'no published version = null, report still saved');
  const broken: any = { from: () => { throw new Error('db down'); } }; ok((await publishedVersionForSubject(broken, 's1')) === null, 'stamp lookup never throws');
  console.log(`t81b: ${n - f}/${n} passed`); process.exit(f ? 1 : 0);
})();
