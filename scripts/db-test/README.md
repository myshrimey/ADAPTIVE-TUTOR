# Scratch-database checks (v113)
These run ONLY on a throw-away local Postgres, never on your live database.
Setup (Linux, as root): start Postgres, then
```
cp scripts/db-test/stub.sql /tmp/stub2.sql; cp scripts/db-test/snapshot.sql /tmp/snapshot.sql
cp packages/db/schema.sql /tmp/schema.sql; mkdir -p /tmp/migs; cp packages/db/migrations/*.sql /tmp/migs/; chmod -R a+rX /tmp/migs /tmp/*.sql
python3 scripts/db-test/undo-roundtrip.py 41 54
```
It applies the chain with stand-ins for Supabase's `auth` and `storage`, runs the undo blocks in docs/ROLLBACK_NOTES.md newest first, and checks the database returns to its earlier state, then that re-applying gives the same result. `gen-undo.py` + `make-rollback-md.py` write those undo blocks from a before/after comparison.
Limits: stand-in Supabase pieces, no real data, and the storage bucket is left on purpose.
