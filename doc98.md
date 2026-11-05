# v98 build summary - raw server errors hidden from visitors (2026-11-01)
**Found:** 64 non-admin routes returned raw error messages (constraint/table/column names).
**Built:** `publicError()` in `packages/core/safety/public-error.ts` (own short codes pass; others -> unknown_error, logged server-side); 64 routes switched; APP_VERSION v98; TASK-066, EX-0010. No migration.
**Tests:** t98 179 checks (mutation-checked), t97 ratchet now 0 and regex tightened (it missed a parenthesised form; found by the mutation check); npm test 76 files, 72 pass, 4 known-stale, 0 fail; tsc clean; build OK; signed-out local calls give short codes.
**Not done / limits:** 27 admin routes unchanged on purpose; some screens may show a generic message where a raw one used to show; forgot-password and /api/public/check limits; not tried live.
