// t101: rollback notes for migrations 0055-0059 are complete, safe, and actually work (v101).
import { readFileSync, readdirSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const doc = R('docs/ROLLBACK_NOTES.md');
const MIGS = ['0055', '0056', '0057', '0058', '0059'];
const section = (m: string) => { const i = doc.indexOf(`## ${m} `); if (i < 0) return ''; const j = doc.indexOf('\n## ', i + 5); return doc.slice(i, j < 0 ? undefined : j); };
const migFile = (m: string) => readdirSync('packages/db/migrations').find((x) => x.startsWith(m + '_'))!;

ok(/Take a backup first/.test(doc) && /Supabase SQL editor/.test(doc) && /not a promise about your live database/.test(doc), 'backup rule and honest limit are written down');
ok(!/COMPLIANT|compliance|guarantee/i.test(doc.replace(/not a promise/gi, '')), 'no compliance or guarantee claims');
const order = MIGS.map((m) => doc.indexOf(`## ${m} `)); ok(order.every((x) => x > 0) && order.every((x, i) => i === 0 || x < order[i - 1]), 'all five migrations covered, newest first');
let allSql = '';
for (const m of MIGS) {
  const s = section(m), sql = (s.match(/```sql\n([\s\S]*?)```/) ?? [])[1] ?? '';
  ok(/What you lose/.test(s), `${m}: says what is lost`);
  ok(sql.trim().length > 0, `${m}: has undo SQL`);
  const live = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  ok(!/\b(truncate|delete\s+from|update\s+\w)/i.test(live), `${m}: undo never deletes or edits rows`);
  ok(!/\bdrop\s+table\b(?!\s+if\s+exists)/i.test(live) && !/\bcascade\b/i.test(live), `${m}: drops are "if exists" and never cascade`);
  // every table the migration creates is dropped, and nothing else is
  const mig = R('packages/db/migrations/' + migFile(m)).replace(/--.*$/gm, '');
  const created = [...mig.matchAll(/create table if not exists (?:public\.)?(\w+)/gi)].map((x) => x[1]);
  const dropped = [...live.matchAll(/drop table if exists (?:public\.)?(\w+)/gi)].map((x) => x[1]);
  ok(created.slice().sort().join() === dropped.slice().sort().join(), `${m}: drops exactly the tables it created (${created.join(', ') || 'none'})`);
  allSql += `-- ${m}\n${live}\n`;
}
ok(/reset search_path/.test(section('0055')) && /trg_audit_logs_no_update_delete/.test(section('0057')) && /trg_audit_logs_no_truncate/.test(section('0057')), 'function and trigger undo are named');
ok(!/audit_logs;?\s*$/m.test(allSql.replace(/on public\.audit_logs;/g, '')) , 'the audit table itself is never dropped');
ok(!/drop table[^\n]*(users|students|student_access|audit_logs|system_changelog)\b/i.test(allSql), 'no undo drops accounts, students, access, audit or changelog tables');
require('fs').writeFileSync(process.env.ROLLBACK_SQL_OUT ?? '/tmp/rollback-extracted.sql', allSql);
console.log(`t101: ${n - f}/${n} passed`); if (f) process.exit(1);
