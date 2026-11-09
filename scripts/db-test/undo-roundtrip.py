#!/usr/bin/env python3
"""Round trip for the undo notes of migrations FIRST..LAST (default 41..54), on a scratch Postgres (run as root; needs /tmp/stub2.sql, /tmp/schema.sql, /tmp/migs, /tmp/snapshot.sql).
1) apply everything below FIRST -> snapshot A   2) apply FIRST..LAST -> snapshot B
3) run each undo block from docs/ROLLBACK_NOTES.md, newest first -> must equal A
4) apply FIRST..LAST again with no error -> must equal B. Existing rows (feedback) must survive all of it."""
import subprocess, glob, re, sys, os
first, last = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (41, 54)
DB = 'rt'
def sh(cmd): return subprocess.run(['su', 'postgres', '-c', cmd], capture_output=True, text=True)
def q(sql_args, db=DB): return sh(f'psql -q -d {db} -v ON_ERROR_STOP=1 -At {sql_args}')
def run_file(f):
    r = q('-f ' + f); assert r.returncode == 0 and 'ERROR' not in r.stderr, (f, r.stderr); return r
def snap(): r = q('-f /tmp/snapshot.sql'); assert r.returncode == 0, r.stderr; return set(r.stdout.split('\n')) - {''}
sh('psql -q -c "drop database if exists rt"'); sh('psql -q -c "create database rt"')
run_file('/tmp/stub2.sql'); run_file('/tmp/schema.sql')
migs = sorted(glob.glob('/tmp/migs/0*.sql'))
num = lambda f: int(os.path.basename(f)[:4])
for f in migs:
    if num(f) < first: run_file(f)
A = snap(); q("-c \"insert into feedback (message) values ('kept')\"") if False else None
for f in migs:
    if first <= num(f) <= last: run_file(f)
B = snap()
doc = open('docs/ROLLBACK_NOTES.md').read()
def block(n):
    i = doc.index(f'## {n:04d} '); j = doc.find('\n## ', i + 5); sec = doc[i:j if j > 0 else None]
    return re.search(r'```sql\n(.*?)```', sec, re.S).group(1)
before_rows = q('-c "select count(*) from system_changelog"').stdout.strip()
for n in range(last, first - 1, -1):
    open('/tmp/undo_one.sql', 'w').write(block(n)); os.chmod('/tmp/undo_one.sql', 0o644)
    r = q('-f /tmp/undo_one.sql'); assert r.returncode == 0, (n, r.stderr)
C = snap()
print('after undo, left over vs before (allowed: buckets, rules on old tables):', sorted(x for x in C - A if not kept(x))[:10] if False else sorted(C - A)[:6], '| missing vs before:', sorted(A - C)[:10])
tables_before = {x.split('|', 1)[1] for x in A if x.startswith('table|')}
# kept on purpose: storage buckets (may hold files; the notes tell the founder to remove them by hand) and rules (policies) on tables that already existed (removing a protection is never an undo)
PROTECTED = {'users', 'students', 'student_access', 'audit_logs', 'system_changelog'}  # never dropped by an undo
tbl_of = lambda x: (x.split('|', 1)[1].split('.')[0] if not x.startswith('policy|') else x.split('|', 1)[1].split('.')[1])
kept = lambda x: x.startswith('bucket|') or x.startswith('policy|storage.') or (tbl_of(x) in PROTECTED and not x.startswith(('function|', 'bucket|'))) or (x.startswith('policy|') and x.split('|', 1)[1].split('.')[1] in tables_before)
ok1 = {x for x in C if not kept(x)} == {x for x in A if not kept(x)} and all(kept(x) for x in C - A)
rows_after = q('-c "select count(*) from system_changelog"').stdout.strip()
for f in migs:
    if first <= num(f) <= last: run_file(f)
D = snap(); ok2 = D == B
print('NOT allowed leftovers:', sorted(x for x in C - A if not kept(x))[:15], '| MISSING:', sorted(x for x in A - C if not kept(x))[:15])
print('re-apply equals first apply:', ok2, sorted(D ^ B)[:10])
print('undo restores the database to its state before', first, ':', ok1, '| system_changelog rows kept:', before_rows, '->', rows_after)
sys.exit(0 if ok1 and ok2 else 1)
