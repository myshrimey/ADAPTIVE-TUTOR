// t116: the public paper library only takes PDFs up to 10 MB, and the save route only accepts rows the page could have made (v116).
import { readFileSync } from 'fs';
import { checkPaperFile, checkPaperMeta, PAPER_MAX_BYTES, PAPER_ALLOWED_TYPES, PAPER_FILE_MESSAGE } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const pdf = { name: '2023-maths.pdf', type: 'application/pdf', size: 500_000 };

// ---- file check
ok(checkPaperFile(pdf).ok, 'a normal PDF is accepted');
ok(checkPaperFile({ ...pdf, size: PAPER_MAX_BYTES }).ok && !checkPaperFile({ ...pdf, size: PAPER_MAX_BYTES + 1 }).ok, '10 MB is the line');
ok(PAPER_MAX_BYTES === 10 * 1024 * 1024, 'limit is exactly 10 MB');
ok(!checkPaperFile({ ...pdf, size: 0 }).ok, 'an empty file is refused');
for (const [name, type] of [['x.html', 'text/html'], ['x.exe', 'application/octet-stream'], ['x.svg', 'image/svg+xml'], ['x.png', 'image/png'], ['x.jpg', 'image/jpeg'], ['x.pdf', 'text/html'], ['x.html', 'application/pdf'], ['x', 'application/pdf'], ['x.pdf.exe', 'application/pdf'], ['x.PDF', 'text/plain']]) ok(!checkPaperFile({ name, type, size: 100 }).ok, `refused: ${name} as ${type}`);
ok(checkPaperFile({ ...pdf, name: 'PAPER.PDF' }).ok, 'upper-case .PDF is fine');
ok(JSON.stringify(PAPER_ALLOWED_TYPES) === '["application/pdf"]', 'only application/pdf is allowed');
ok(Object.keys(PAPER_FILE_MESSAGE).length === 3 && Object.values(PAPER_FILE_MESSAGE).every((m) => !/error|invalid|fail/i.test(m)), 'refusals are in plain words');

// ---- save-route check
const good = { title: '2023 Maths Board', year: 2023, filePath: 'maths/1731100000000-paper.pdf', solutionFilePath: 'maths/1731100000000-solutions-paper.pdf', notes: 'compartment' };
ok(checkPaperMeta(good).ok, 'a row the page could have made is accepted');
ok(checkPaperMeta({ ...good, year: null, solutionFilePath: null, notes: null }).ok, 'optional parts may be empty');
const bad = (o: any, code: string) => { const r: any = checkPaperMeta({ ...good, ...o }); ok(!r.ok && r.code === code, `refused (${code}): ${JSON.stringify(o).slice(0, 70)}`); };
bad({ title: '' }, 'missing_required_fields'); bad({ title: 'x'.repeat(151) }, 'paper_title_invalid'); bad({ title: 5 }, 'missing_required_fields');
bad({ notes: 'x'.repeat(501) }, 'paper_notes_invalid'); bad({ notes: 5 }, 'paper_notes_invalid');
bad({ year: 1800 }, 'paper_year_invalid'); bad({ year: 2023.5 }, 'paper_year_invalid'); bad({ year: '2023' }, 'paper_year_invalid');
for (const p of ['https://evil.example/x.pdf', '../secrets/1731100000000-a.pdf', 'maths/../1731100000000-a.pdf', 'maths/1731100000000-a.html', 'maths/a.pdf', '/maths/1731100000000-a.pdf', 'maths/1731100000000-a b.pdf', 'feedback-screenshots/x/1731100000000-a.pdf.png', 'MATHS/1731100000000-<script>.pdf']) bad({ filePath: p }, 'paper_path_invalid');
bad({ solutionFilePath: 'https://evil.example/s.pdf' }, 'paper_path_invalid');
bad({ filePath: undefined }, 'missing_required_fields');

// ---- wiring and honesty
const route = R('apps/web/app/api/papers/route.ts');
ok(/checkPaperMeta\(/.test(route) && route.indexOf('checkPaperMeta(') < route.indexOf('addPreviousPaper({') || route.indexOf('checkPaperMeta(') < route.indexOf('addPreviousPaper(supabase'), 'the save route checks BEFORE saving');
const page = R('apps/web/app/papers/page.tsx');
ok(/checkPaperFile\(/.test(page) && page.indexOf('checkPaperFile(') < page.indexOf("storage.from('papers').upload"), 'the page checks the file BEFORE uploading');
const mig = R('packages/db/migrations/0062_papers_bucket_limits.sql');
ok(/file_size_limit = 10485760/.test(mig) && /array\['application\/pdf'\]/.test(mig) && /where id = 'papers'/.test(mig), 'migration sets the same limits on the papers bucket only');
ok(!/create policy|drop policy|delete from|drop table|alter table/i.test(mig.replace(/--.*$/gm, '')), 'migration changes no policy and no table');
const six = R('packages/db/migrations/0006_previous_papers.sql');
ok(/papers_bucket_read/.test(six) && /papers_bucket_insert/.test(six), '0006 policies still present (not weakened or removed)');
ok(/system_changelog/.test(mig) && /v116/.test(mig), 'migration writes its changelog row');
const dc = R('packages/core/deploy-check/index.ts');
ok(/migration: '0062'/.test(dc) && /DB_VERSION_EXPECTED = 'v116'/.test(dc), 'deploy check can verify the bucket setting by hand');
const rb = R('docs/ROLLBACK_NOTES.md');
ok(rb.indexOf('## 0062 ') > -1 && rb.indexOf('## 0062 ') < rb.indexOf('## 0061 '), 'undo note exists, newest first');
console.log(`t116: ${n - f}/${n} passed`); if (f) process.exit(1);
