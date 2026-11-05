# Execution Log
Newest first. One entry per execution.

## EX-0013 - 2026-11-02 - SAH-PROMPT-0009
- Summary: v101: rollback notes for 0055 to 0059 (TASK-069).
- Files: docs/ROLLBACK_NOTES.md; tests/t101.ts, t95b.ts; packages/core/deploy-check/index.ts; scripts/control-centre/build-docs.py
- Database: none (round trip on a scratch copy only)
- Tests: t101 (31 checks), undo + re-apply round trip on scratch Postgres, full npm test, type check
- Open: Not run on the live database; migrations before 0055 have no written undo notes; D7 legal review is the founder's

## EX-0012 - 2026-11-02 - SAH-PROMPT-0009
- Summary: v100: record manual test results (TASK-068).
- Files: packages/core/control-centre/qa-results.ts, index.ts; apps/web/app/api/admin/control/qa/route.ts; apps/web/app/admin/control/testing/page.tsx; apps/web/components/ControlActions.tsx; packages/db/migrations/0059_qa_results.sql; packages/core/deploy-check/index.ts; tests/t100.ts, t100b.ts, t95b.ts, run-all.ts
- Database: 0059 qa_results (server-only; run twice on scratch Postgres)
- Tests: t100 (30 checks), t100b (9 page renders), mutation checks, migration twice on scratch Postgres, full npm test, type check, production build
- Open: Not tried on the live site; 0059 not applied live; D7 legal review is the founder's

## EX-0011 - 2026-11-02 - SAH-PROMPT-0009
- Summary: v99: dependency security review and Next.js 15.5.28 patch (TASK-067).
- Files: apps/web/package.json; package-lock.json; docs/DEPENDENCY_SECURITY.md; tests/t99.ts, t95b.ts; packages/core/deploy-check/index.ts
- Database: none
- Tests: t99 (10 checks, mutation-checked), full npm test, type check, production build with the new version
- Open: Not tried on the live site; npm audit still lists warnings that are not reachable; Next 16 move is later; D7 legal review is the founder's

## EX-0010 - 2026-11-01 - SAH-PROMPT-0009
- Summary: v98: hide raw server error text from visitors (TASK-066).
- Files: packages/core/safety/public-error.ts; packages/core/index.ts; 64 files under apps/web/app/api (non-admin); tests/t97.ts, t98.ts, t95b.ts; packages/core/deploy-check/index.ts
- Database: none
- Tests: t98 (179 checks, mutation-checked), t97 tightened, full npm test, type check, production build
- Open: Not tried on the live site; some screens may now show a generic message where a raw one used to appear; admin routes unchanged; D7 legal review is the founder's

## EX-0009 - 2026-11-01 - SAH-PROMPT-0009
- Summary: v97: public-route gate scan (TASK-065) and teacher sign-up hardening.
- Files: apps/web/app/api/teacher/register/route.ts; apps/web/app/teacher/register/page.tsx; packages/core/deploy-check/index.ts; tests/t97.ts, t95b.ts; scripts/control-centre/build-docs.py
- Database: none
- Tests: t97 (42 checks, mutation-checked), t95b updated, full npm test, type check, production build
- Open: Not tried on the live site; 65 routes still echo raw error text; D7 legal review is the founder's

## EX-0008 - 2026-11-01 - SAH-PROMPT-0009
- Summary: v96: sign-in brute-force protection (TASK-064): migration 0058, rules, login route, admin form moved to the server route, wait message on every sign-in form.
- Files: packages/core/auth/throttle.ts; packages/core/index.ts; apps/web/lib/login-throttle.ts; apps/web/app/api/auth/login/route.ts; apps/web/components/AdminSignIn.tsx, HomeClient.tsx, portal/PortalLoginForm.tsx; packages/db/migrations/0058_login_throttle.sql; packages/core/deploy-check/index.ts; tests/t96.ts
- Database: 0058 login_attempts (hashes of failed tries only; server-only; re-run twice on scratch Postgres)
- Tests: t96 (33 checks, mutation-checked), t95/t95b updated, migration twice on scratch Postgres, type check, full npm test, production build
- Open: Not tried on the live site; migration 0058 not applied live; Supabase's own sign-in limits not verified; D7 legal review is the founder's

## EX-0007 - 2026-11-01 - SAH-PROMPT-0009
- Summary: v95: deployment pre-flight for the combined v90 to v95 deployment: full migration chain test on scratch Postgres (twice), Deployment check page, combined delta zip.
- Files: packages/core/deploy-check/index.ts; packages/core/index.ts; apps/web/app/admin/deploy-check/page.tsx; apps/web/lib/admin-menu.ts; tests/t95.ts, t95b.ts, run-all.ts; scripts/control-centre/build-docs.py
- Database: none (the chain test ran on a scratch database only)
- Tests: t95 (58 checks, mutation-checked), t95b (10 page-render checks), full migration chain twice on scratch Postgres, full npm test, type check, production build
- Open: Not tried on the live site; leaked-password protection is still a manual switch; D7 legal review is the founder's

## EX-0006 - 2026-11-01 - SAH-PROMPT-0009
- Summary: v94: all open decisions D1, D2, D3 (interim), D5, D6 recorded as decided on the founder's instruction (FD-11 to FD-15); D7 (professional legal review) opened; View As design study and threat model (TASK-034); retention dry-run report and purge script (TASK-039).
- Files: docs/sahayak-control-centre/VIEW_AS_DESIGN.md; packages/core/retention/index.ts; packages/core/index.ts; apps/web/app/admin/retention/page.tsx; apps/web/lib/admin-menu.ts; scripts/retention/purge-older-than.sql; scripts/control-centre/build-docs.py; tests/t90.ts, t93.ts, t93b.ts, t94.ts, t94b.ts
- Database: none (purge script is a template for the founder, not run)
- Tests: t94 and t94b (see INSTRUCTIONS.txt), full npm test, type check, production build
- Open: D7 professional legal review (only the founder can arrange); View As not built; retention periods not legally confirmed

## EX-0005 - 2026-11-01 - SAH-PROMPT-0009
- Summary: v93: Control Centre screens 2: current execution with downloadable session resume, dependency register, testing and QA checklists, execution history (TASK-020 to 023, 038 part).
- Files: packages/core/control-centre/logic.ts (currentExecution, dependencyReport, resumeText), qa.ts, index.ts; apps/web/app/admin/control/{current,dependencies,testing,history}/page.tsx; apps/web/app/api/admin/control/resume/route.ts; apps/web/components/ControlNav.tsx; apps/web/lib/admin-menu.ts; tests/t93.ts, t93b.ts, run-all.ts; scripts/control-centre/build-docs.py
- Database: none
- Tests: t93 (181 checks, mutation-checked: a wrong recommendation and a made-up page are both caught), t93b (19 page-render checks), full npm test, type check, production build
- Open: Founder has not looked at these pages on the live site; results of manual checklists are not recorded anywhere

## EX-0004 - 2026-10-31 - SAH-PROMPT-0009
- Summary: v92: read-only account directory and masked account snapshot with audited opens (TASK-030, 031, 033).
- Files: packages/core/accounts/* (logic, store); packages/core/index.ts; apps/web/app/admin/accounts/page.tsx and [id]/page.tsx; apps/web/lib/admin-menu.ts; tests/t92.ts, t92b.ts, t67.ts, run-all.ts; scripts/control-centre/build-docs.py
- Database: none (reads existing tables only)
- Tests: t92 (58 checks, mutation-checked twice: a hidden write and an unmasked email are both caught), t92b (13 page-render checks), full npm test, type check, production build
- Open: Decision D6 (who besides the Super Admin may see accounts); login events; View As (D2) not built

## EX-0003 - 2026-10-31 - SAH-PROMPT-0009
- Summary: v91: tamper-resistant audit trail (TASK-032), 14 more admin actions audited, access-control scan test (TASK-060 part, TASK-061 part).
- Files: packages/db/migrations/0057_audit_trail.sql; packages/core/config-engine/config-engine.ts (writeAudit, listAudit); apps/web/app/admin/audit-log/page.tsx; admin API routes payments/[id], students, students/[id], devices/reset, data-requests/execute, partners/[id], teachers, teachers/[id], commerce, commerce/export, reviews/apply, quality, ai; tests/t91.ts; scripts/control-centre/build-docs.py
- Database: 0057 (audit_logs: 5 new columns, 2 indexes, append-only triggers). Run twice on scratch Postgres only; NOT applied to the live database.
- Tests: t91 (399 checks, mutation-checked twice), migration 0057 run twice and update/delete/truncate/purge tried on scratch Postgres, type check, full npm test, production build
- Open: Apply 0057; retention length (Decision D3) still open; login events not yet recorded

## EX-0002 - 2026-10-31 - SAH-PROMPT-0009
- Summary: v90: security fix (TASK-016), tests moved into the repository (TASK-015), Phase 1 registry tables, importer and admin screens (TASK-010 to 014).
- Files: packages/db/migrations/0055_guard_user_role_search_path.sql, 0056_control_centre.sql; packages/core/control-centre/*; apps/web/app/admin/control/*; apps/web/app/api/admin/control/route.ts; apps/web/components/ControlActions.tsx; apps/web/lib/admin-menu.ts; tests/ (64 files); scripts/control-centre/build-docs.py; package.json (test script)
- Database: 0055 (function search path), 0056 (six server-only tables). Run twice on scratch Postgres only; NOT applied to the live database.
- Tests: t90 (74 checks), t90b (30 page-render checks), full npm test run, type check, production build, migrations 0055 and 0056 run twice on scratch Postgres
- Open: Apply migrations; leaked-password protection is a founder switch in Supabase; pages not seen on the live site; no direct-API test yet (TASK-060)

## EX-0001 - 2026-10-31 - SAH-PROMPT-0009
- Summary: Phase 0 (v89, documents only): read the repository and the live Supabase structure; wrote the gap report and the control-centre documents; registered 9 prompts.
- Files: docs/sahayak-control-centre/* (14 files), doc89.md; modified CLAUDE.md, SAHAYAK_PROJECT_MEMORY.md, docs/BUILD_LOG.md, docs/RESUME_HERE.md, INSTRUCTIONS.txt
- Database: none
- Tests: document checks only
- Open: Founder to choose the next phase (answered later by FD-10)
