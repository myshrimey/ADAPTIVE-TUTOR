// t100: recording the founder's manual test results (v100): rules, API route, migration.
import { readFileSync } from 'fs';
import { parseQaResult, latestByItem, summariseQa, isQaItemId, loadQaResults, saveQaResult, QA_CHECKLISTS, QA_KINDS, QA_NOTE_MAX, QA_RESULT_LABEL } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');

// ---- parsing
const good = parseQaResult({ itemId: 'QA-ST-01', result: 'pass', note: ' signed in fine ', appVersion: 'v100' });
ok(good.ok && (good as any).value.note === 'signed in fine' && (good as any).value.appVersion === 'v100', 'a good result is accepted and trimmed');
ok(parseQaResult({ itemId: 'QA-ST-01', result: 'fail' }).ok, 'note and version are optional');
ok(!parseQaResult({ itemId: 'QA-XX-99', result: 'pass' }).ok && (parseQaResult({ itemId: 'QA-XX-99', result: 'pass' }) as any).error === 'unknown_item', 'an unknown checklist item is refused');
ok((parseQaResult({ itemId: 'QA-ST-01', result: 'maybe' }) as any).error === 'bad_result' && (parseQaResult({ itemId: 'QA-ST-01', result: 'accepted' }) as any).error === 'bad_result', 'only worked / did not work / could not try exist (no "accepted" or "completed")');
ok((parseQaResult({ itemId: 'QA-ST-01', result: 'pass', note: 'x'.repeat(QA_NOTE_MAX + 1) }) as any).error === 'note_too_long' && parseQaResult({ itemId: 'QA-ST-01', result: 'pass', note: 'x'.repeat(QA_NOTE_MAX) }).ok, 'note length limit');
for (const bad of ['mail me at rahul@school.in', 'call 98765 43210', 'phone +91 98765-43210 please']) ok((parseQaResult({ itemId: 'QA-ST-01', result: 'pass', note: bad }) as any).error === 'note_has_contact_details', `contact details refused: ${bad.slice(0, 18)}`);
ok(parseQaResult({ itemId: 'QA-ST-01', result: 'pass', note: 'step 3 of 20 questions took 12 seconds' }).ok, 'ordinary numbers in a note are fine');
ok((parseQaResult({ itemId: 'QA-ST-01', result: 'pass', appVersion: '1.2' }) as any).error === 'bad_version', 'version must look like v100');
ok(!parseQaResult(null).ok && !parseQaResult('x').ok && !parseQaResult({}).ok, 'odd input never crashes');
ok(!isQaItemId('__proto__') && !isQaItemId(undefined) && isQaItemId('QA-ST-01'), 'item id check');
ok(Object.keys(QA_RESULT_LABEL).sort().join() === 'blocked,fail,pass,untried' && !/accept|complete/i.test(JSON.stringify(QA_RESULT_LABEL)), 'labels never use the words accepted or completed');

// ---- newest wins; summary
const rows: any[] = [
  { item_id: 'QA-ST-01', result: 'fail', note: null, app_version: 'v99', tested_at: '2026-11-02T10:00:00Z' },
  { item_id: 'QA-ST-01', result: 'pass', note: 'fixed', app_version: 'v100', tested_at: '2026-11-03T10:00:00Z' },
  { item_id: 'QA-ST-02', result: 'blocked', note: null, app_version: null, tested_at: '2026-11-02T10:00:00Z' },
  { item_id: 'NOT-AN-ITEM', result: 'pass', note: null, app_version: null, tested_at: '2026-11-04T10:00:00Z' },
];
const lt = latestByItem(rows);
ok(lt.get('QA-ST-01')!.result === 'pass' && !lt.has('NOT-AN-ITEM'), 'newest result per item wins; unknown ids ignored');
ok(latestByItem([...rows].reverse()).get('QA-ST-01')!.result === 'pass', 'order of rows does not matter');
const sums = summariseQa(rows); const st = sums.find((s) => s.kind === 'student')!;
ok(sums.length === QA_KINDS.length && st.total === QA_CHECKLISTS.student.length && st.pass === 1 && st.blocked === 1 && st.fail === 0 && st.untried === st.total - 2, 'summary counts');
ok(sums.every((s) => s.pass + s.fail + s.blocked + s.untried === s.total), 'every item is counted exactly once');
ok(summariseQa([]).every((s) => s.untried === s.total) && summariseQa(null as any).length === QA_KINDS.length, 'empty history = everything not tried');

// ---- store behaviour with fakes
(async () => {
  const mk = (err: any = null, throwIt = false): any => ({ from: (t: string) => ({
    insert: async (r: any) => { if (throwIt) throw new Error('down'); (mk as any).last = { t, r }; return { error: err }; },
    select: () => ({ order: () => ({ limit: async () => { if (throwIt) throw new Error('down'); return err ? { data: null, error: err } : { data: rows, error: null }; } }) }) }) });
  const s1 = await saveQaResult(mk(), { itemId: 'QA-ST-01', result: 'pass', note: 'n', appVersion: 'v100' }, 'founder@x.in');
  ok(s1.ok && (mk as any).last.t === 'qa_results' && (mk as any).last.r.tested_by === 'founder@x.in' && (mk as any).last.r.item_id === 'QA-ST-01', 'saved into qa_results with who tested');
  ok((await saveQaResult(mk({ code: '42P01', message: 'relation does not exist' }), { itemId: 'QA-ST-01', result: 'pass', note: null, appVersion: null }, 'a')).error === 'tables_missing', 'missing table is reported as tables_missing');
  ok((await saveQaResult(mk({ message: 'boom' }), { itemId: 'QA-ST-01', result: 'pass', note: null, appVersion: null }, 'a')).error === 'save_failed' && (await saveQaResult(mk(null, true), { itemId: 'QA-ST-01', result: 'pass', note: null, appVersion: null }, 'a')).error === 'save_failed', 'other failures: save_failed, never a crash and never the raw message');
  ok((await loadQaResults(mk()))!.length === 4 && (await loadQaResults(mk({ message: 'x' }))) === null && (await loadQaResults(mk(null, true))) === null, 'reading returns null (not an empty list) when the table cannot be read');

  // ---- the API route is gated, validated, audited, and touches nothing else
  const r = R('apps/web/app/api/admin/control/qa/route.ts');
  ok(/requireAdmin\(\)/.test(r) && !/requireAdmin\(['"`]/.test(r), 'Super Admin only (no team permission)');
  ok(r.indexOf('requireAdmin()') < r.indexOf('request.json()') && r.indexOf('requireAdmin()') < r.indexOf('createServiceClient()'), 'gate comes before reading the request or the database');
  ok(/parseQaResult\(/.test(r) && /writeAudit\(/.test(r) && /qa\.record/.test(r), 'validated and audited');
  ok(!/note/.test(r.slice(r.indexOf('writeAudit('))), 'the free-text note is not copied into the audit line');
  ok(!/control_requirements|control_tasks|control_prompts|founder_acceptance|setAcceptance|importRegistry/.test(r), 'recording a result cannot touch requirement status or acceptance');
  // ---- migration
  const m = R('packages/db/migrations/0059_qa_results.sql');
  ok(/enable row level security/.test(m) && !/create policy/i.test(m), 'server-only: RLS on, no policy');
  ok(/check \(result in \('pass', 'fail', 'blocked'\)\)/.test(m) && /create table if not exists/.test(m) && /where not exists/.test(m), 'only three results allowed; re-runnable');
  ok(!/student_id|email|phone|name text/i.test(m.replace(/--.*$/gm, '')), 'holds no student or contact data');
  console.log(`t100: ${n - f}/${n} passed`); if (f) process.exit(1);
})();
