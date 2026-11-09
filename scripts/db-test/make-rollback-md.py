#!/usr/bin/env python3
"""Turns /tmp/diff.json (from gen-undo.py) into rollback-note sections, newest first."""
import json, re, glob, os
d = json.load(open('/tmp/diff.json'))
fk = [l.split('>') for l in open('/tmp/fk.txt').read().split() if '>' in l]
strip = lambda s: s.replace('public.', '')
def order_tables(ts):
    ts = list(ts); out = []
    # child first: a table can go once no remaining table points at it
    while ts:
        for t in sorted(ts):
            if not any(strip(c) != t and strip(p) == t and strip(c) in ts for c, p in fk):
                out.append(t); ts.remove(t); break
        else: out += sorted(ts); break
    return out
WHAT = {}
def title(n, f):
    names = f.split('+'); slug = '+'.join(x[5:-4] for x in names)
    first = open(f'/tmp/migs/{names[0]}').readline().strip().lstrip('-').strip()
    v = re.search(r'\b(v\d+[a-z]?)(?:-v\d+)?\b', first)
    desc = re.sub(r'^(v\d+[a-z]?(-v\d+)?)\s*[:\-]?\s*', '', first)
    desc = re.split(r'(?<=[a-z\)])\. |: ', desc)[0].strip().rstrip('.')
    desc = re.sub(r'\s*(Additive|Re-?runnable).*$', '', desc)
    return f'## {n:04d} {slug} ({v.group(1) if v else "early"}) - {desc[:100]}'
PROTECTED = {'users', 'students', 'student_access', 'audit_logs', 'system_changelog'}  # never dropped by an undo: accounts, plans, the audit trail
secs = []
for n in sorted((int(k) for k in d), reverse=True):
    f, items = d[str(n)]
    tabs = [i.split('|', 1)[1] for i in items if i.startswith('table|')]
    cols = [i.split('|', 1)[1] for i in items if i.startswith('column|')]
    existing_cols = [c for c in cols if c.split('.')[0] not in tabs]
    cons = [strip(i.split('|', 1)[1]) for i in items if i.startswith('constraint|') and strip(i.split('|', 1)[1]).split('.')[0] not in tabs]
    idx = [i.split('|', 1)[1] for i in items if i.startswith('index|') and i.split('|', 1)[1].split('.')[0] not in tabs]
    pol = [i.split('|', 1)[1] for i in items if i.startswith('policy|') and i.split('|')[1].split('.')[1] not in tabs]
    trg = [i.split('|', 1)[1] for i in items if i.startswith('trigger|')]
    fns = [i.split('|', 1)[1] for i in items if i.startswith('function|')]
    bkt = [i.split('|', 1)[1] for i in items if i.startswith('bucket|')]
    sql = []
    for t, c in (x.split('.', 1) for x in trg): sql.append(f'drop trigger if exists {c} on public.{t};')
    for c in cons: t, cn = c.split('.', 1); sql.append(f'alter table public.{t} drop constraint if exists {cn};')
    for i in idx: sql.append(f'drop index if exists public.{i.split(".", 1)[1]};')
    for c in existing_cols: t, cn = c.split('.', 1); sql.append(f'alter table public.{t} drop column if exists {cn};')
    kept_tabs = [t for t in tabs if t in PROTECTED]
    for t in order_tables([t for t in tabs if t not in PROTECTED]): sql.append(f'drop table if exists public.{t};')
    for fn in fns: sql.append(f'drop function if exists public.{fn};')
    lose = []
    drop_tabs = [t for t in tabs if t not in PROTECTED]
    if drop_tabs: lose.append('everything saved in the new table' + ('s ' if len(drop_tabs) > 1 else ' ') + ', '.join(drop_tabs))
    if kept_tabs: lose.append('nothing from ' + ', '.join(kept_tabs) + ' (that table holds accounts, plans or the audit trail, so an undo never drops it; it stays in place)')
    if existing_cols:
        bytable = {}
        for c in existing_cols: bytable.setdefault(c.split('.')[0], []).append(c.split('.')[1])
        lose.append('the values in the columns this change added to existing tables (' + '; '.join(f'{t}: {", ".join(v)}' for t, v in bytable.items()) + '); the rows themselves stay')
    if pol: lose_note = ' Rules (policies) this change added to tables that already existed are NOT removed: taking away a protection is never part of an undo, and a table with row security on and no rule would lock every family out.'
    else: lose_note = ''
    if trg or fns: lose.append('the database guard ' + ', '.join(trg + fns))
    if not lose: lose.append('nothing saved: this change only refreshed settings or added setting rows')
    extra = lose_note
    if bkt: extra += f' The storage bucket `{bkt[0]}` is NOT removed by this undo (it may hold uploaded files): empty and delete it in Supabase -> Storage yourself if you want it gone.'
    if any('guard_user_role' in x for x in trg + fns): extra += ' WARNING: this guard stops a signed-in person changing their own role. Undoing it removes that protection; undo it only together with redeploying a version that does not need it, and re-apply it (run the migration again) as soon as possible.'
    extra += ' Rows this change inserted into system_changelog, settings or other existing tables are not deleted (undo never deletes rows); they are harmless.' if True else ''
    body = '\n'.join(sql) if sql else '-- nothing structural to undo'
    secs.append(f'{title(n, f)}\nWhat you lose: {"; ".join(lose)}.{extra}\n```sql\n{body}\n```\n')
open('/tmp/rollback_new.md', 'w').write('\n'.join(secs))
print(len(secs), 'sections')
