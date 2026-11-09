#!/usr/bin/env python3
"""Works out, on a scratch Postgres, exactly what each migration adds (before/after catalog comparison) and prints undo SQL.
usage: gen-undo.py FIRST LAST   (e.g. 41 54). Needs database `sc2` already holding stubs + schema + migrations below FIRST."""
import subprocess, sys, glob, os, re
def psql(args, f=None):
    cmd = ['su','postgres','-c', 'psql -q -d sc2 -v ON_ERROR_STOP=1 -At ' + args]
    return subprocess.run(cmd, capture_output=True, text=True)
def snap():
    r = psql('-f /tmp/snapshot.sql'); assert r.returncode == 0, r.stderr
    return set(l for l in r.stdout.splitlines() if l)
first, last = int(sys.argv[1]), int(sys.argv[2])
out = {}
for n in range(first, last + 1):
    fs = sorted(glob.glob(f'/tmp/migs/{n:04d}_*.sql'))  # two files can share a number (0023): treated as one change
    before = snap()
    for f in fs:
        r = psql('-f ' + f); assert r.returncode == 0, (f, r.stderr)
    after = snap()
    out[n] = ('+'.join(os.path.basename(f) for f in fs), sorted(after - before))
import json; print(json.dumps(out))
