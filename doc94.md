# v94 build summary (2026-11-01)
Founder instruction: "complete all the D's". Decisions D1, D2, D3 (interim), D5, D6 recorded as decided (FD-11 to FD-15) using Claude's recommendations; the founder can overrule. D7 (professional legal review of children's activity tracking, retention periods and staff viewing accounts) opened: only the founder can arrange it; Claude does not claim legal compliance.
Built: VIEW_AS_DESIGN.md (TASK-034, design only), /admin/retention dry-run page and scripts/retention/purge-older-than.sql (TASK-039; owner-run, not scheduled, never touches learning/payment/consent data), packages/core/retention.
Evidence: t94 50/50, t94b 6/6 (mutation-checked), npm test 71 files 67 passed / 4 known-stale / 0 failed, tsc clean, build ok, signed-out check.
Not done: View As build (TASK-035: needs explicit go + D7), activity events (TASK-041: blocked by TASK-040), live-site test.
