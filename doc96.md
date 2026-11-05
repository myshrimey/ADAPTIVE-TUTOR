# v96 build summary - sign-in brute-force protection (2026-11-01)
**Why:** `/api/auth/login` had no limit on wrong passwords, and the admin sign-in form called Supabase from the browser (no limit possible).
**Built:** migration 0058 `login_attempts` (hashes of failed tries only, server-only, 24h); rules `packages/core/auth/throttle.ts` (8 per account / 40 per address / 15 min); `apps/web/lib/login-throttle.ts` (check before password, record on failure, clear on success, fails open on database problems); login route returns 429 + Retry-After; AdminSignIn now uses the server route; neutral wait message on all forms; deploy-check probe 0058, APP_VERSION v96, DB_VERSION_EXPECTED v96; TASK-064, EX-0008.
**Tests:** t96 33 checks (mutation-checked: removing the check, or the account rule, fails). t95/t95b updated. Migration run twice on scratch Postgres. tsc clean. npm test 74 files: 70 pass, 4 known-stale, 0 fail. Production build OK.
**Not tested:** live site/database; Supabase built-in limits.
**Limits:** deliberate lock-out of a real account for 15 min is possible; thresholds are my starting values.
**Founder:** apply after v90-v95; `npm run db:migrate`.
