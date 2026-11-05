# v97 build summary - public-route gate scan + teacher sign-up hardening (2026-11-01)
**Found:** 12 non-admin routes are open on purpose; `teacher/register` lacked sign-up switch, per-address/daily limits, weak-password check, and leaked raw errors.
**Built:** hardened `teacher/register` (route + page messages); `tests/t97.ts` (42 checks): every non-admin route names its caller or is on a written public list with a kind-specific check; ratchet for routes echoing raw errors (65, may only decrease). APP_VERSION v97. TASK-065, EX-0009. No migration.
**Tests:** t97 mutation-checked; npm test 75 files, 71 pass, 4 known-stale, 0 fail (one earlier flaky t57b failure, passed on re-run); tsc clean; production build OK; local check of closed sign-ups.
**Not done:** 65 routes still echo raw errors; /api/public/check has no rate limit; forgot-password goes browser to Supabase directly. Not tried live.
