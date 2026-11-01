# v95 build summary (2026-11-01)
Pre-flight for the founder's combined v90-v95 deployment. TASK-063 -> READY FOR TESTING.
Evidence: schema.sql + all 57 migrations applied twice from empty on scratch Postgres with no error (149 tables, 0 without RLS, audit columns and triggers present, 6 control tables, guard_user_role search path fixed). New read-only /admin/deploy-check (version, 10 migration probes, settings present/missing without values, 3 read-only SQL checks). t95 58/58 and t95b 10/10 (mutation-checked), npm test 73 files 69 passed / 4 known-stale / 0 failed, tsc clean, production build ok.
Not done: live-site and live-database verification (Vercel link not used), D7 legal review (founder), View As build, activity events.
