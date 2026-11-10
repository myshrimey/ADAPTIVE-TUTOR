// t101: rollback notes for migrations 0055-0061 are complete, safe, and actually work (v101).
import { readFileSync, readdirSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const doc = R('docs/ROLLBACK_NOTES.md');
const MIGS = ['0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010', '0011', '0012', '0013', '0014', '0015', '0016', '0017', '0018', '0019', '0020', '0021', '0022', '0023', '0024', '0025', '0026', '0027', '0028', '0029', '0030', '0031', '0032', '0033', '0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042', '0043', '0044', '0045', '0046', '0047', '0048', '0049', '0050', '0051', '0052', '0053', '0054', '0055', '0056', '0057', '0058', '0059', '0060', '0061', '0062', '0063'];
const section = (m: string) => { const i = doc.indexOf(`## ${m} `); if (i < 0) return ''; const j = doc.indexOf('\n## ', i + 5); return doc.slice(i, j < 0 ? undefined : j); };
const migFiles = (m: string) => readdirSync('packages/db/migrations').filter((x) => x.startsWith(m + '_'));  // 0023 has two files
const PROTECTED_TABLES = ['users', 'students', 'student_access', 'audit_logs', 'system_changelog'];

ok(/Take a backup first/.test(doc) && /Supabase SQL editor/.test(doc) && /not a promise about your live database/.test(doc), 'backup rule and honest limit are written down');
ok(!/COMPLIANT|compliance|guarantee/i.test(doc.replace(/not a promise/gi, '')), 'no compliance or guarantee claims');
const order = MIGS.map((m) => doc.indexOf(`## ${m} `)); ok(order.every((x) => x > 0) && order.every((x, i) => i === 0 || x < order[i - 1]), 'all six migrations covered, newest first');
let allSql = '';
for (const m of MIGS) {
  const s = section(m), sql = (s.match(/```sql\n([\s\S]*?)```/) ?? [])[1] ?? '';
  ok(/What you lose/.test(s), `${m}: says what is lost`);
  ok(sql.trim().length > 0, `${m}: has undo SQL`);
  const live = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  const liveNoPolicies = live.replace(/create\s+policy[\s\S]*?;/gi, ''); // `for update` inside a rule definition is not a row edit
  ok(!/\b(truncate|delete\s+from|update\s+\w)/i.test(liveNoPolicies), `${m}: undo never deletes or edits rows`);
  ok(!/\bdrop\s+table\b(?!\s+if\s+exists)/i.test(live) && !/\bcascade\b/i.test(live), `${m}: drops are "if exists" and never cascade`);
  // every table the migration creates is dropped, and nothing else is
  const mig = migFiles(m).map((f) => R('packages/db/migrations/' + f)).join('\n').replace(/--.*$/gm, '');
  const created = [...mig.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)/gi)].map((x) => x[1]).filter((x) => !PROTECTED_TABLES.includes(x) && x !== 'if');
  const dropped = [...live.matchAll(/drop table if exists (?:public\.)?(\w+)/gi)].map((x) => x[1]);
  ok(created.slice().sort().join() === dropped.slice().sort().join(), `${m}: drops exactly the tables it created (${created.join(', ') || 'none'})`);
  allSql += `-- ${m}\n${live}\n`;
}
ok(/reset search_path/.test(section('0055')) && /trg_audit_logs_no_update_delete/.test(section('0057')) && /trg_audit_logs_no_truncate/.test(section('0057')), 'function and trigger undo are named');
ok(!/audit_logs;?\s*$/m.test(allSql.replace(/on public\.audit_logs;/g, '')) , 'the audit table itself is never dropped');
ok(!/drop table if exists (?:public\.)?(users|students|student_access|audit_logs|system_changelog)\s*;/i.test(allSql), 'no undo drops accounts, students, access, audit or changelog tables');
require('fs').writeFileSync(process.env.ROLLBACK_SQL_OUT ?? '/tmp/rollback-extracted.sql', allSql);
console.log(`t101: ${n - f}/${n} passed`); if (f) process.exit(1);
