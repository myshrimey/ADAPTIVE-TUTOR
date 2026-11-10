# Execution Log
Newest first. One entry per execution.

## EX-0035 - 2026-11-10 - founder chat request (add French with syllabus and textbook)
- Summary: v123: French subject added (TASK-091).
- Files: seed/cbse-class10-french*.json; seed-generators/fr_*.py gen_french_*.py build_french.py; core answers/grading/blueprint/translation/taxonomy; AnswerInput; HomeClient; SubjectIcon; tests/t123.ts
- Database: none (seed data only)
- Tests: t123, tsc, full npm test, production build
- Open: Not deployed; seeds not run on the live database; no teacher review

## EX-0034 - 2026-11-09 - founder chat request (continue building)
- Summary: v122: closed two too-open database write rules (TASK-090).
- Files: 0063_close_open_write_rules.sql; core/explanations/ensure-explanation.ts; deploy-check; ROLLBACK_NOTES; DATABASE_SCHEMA; tests/t122.ts
- Database: 0063 (rules only; no tables or columns)
- Tests: scratch Postgres before/after control, undo + re-apply, t122, t95, t101, full npm test, production build
- Open: Not deployed; migration not applied to the live database; live policies read only

## EX-0033 - 2026-11-09 - founder chat request (continue building)
- Summary: v121: onboarding input checked (TASK-089).
- Files: core/onboarding/onboarding-input.ts; api/student/onboarding/route.ts; HomeClient.tsx; tests/t121.ts
- Database: none
- Tests: t121, mutation checks, type check, full npm test, production build
- Open: Not deployed; not seen live

## EX-0032 - 2026-11-09 - founder chat request (continue building)
- Summary: v120: tutor message, answer size and payment claim checked (TASK-088).
- Files: core/safety/chat-input.ts; api/session/message,answer; api/pilot/payment; learn/page.tsx; PilotPaymentForm.tsx; tests/t120.ts
- Database: none
- Tests: t120, mutation checks, type check, full npm test, production build
- Open: Not deployed; not seen live

## EX-0031 - 2026-11-09 - founder chat request (continue building)
- Summary: v119: profile save input cleaned and validated (TASK-087).
- Files: core/profile/profile-input.ts; api/profile/route.ts; profile/page.tsx; tests/t119.ts
- Database: none
- Tests: t119, type check, full npm test, production build
- Open: Not deployed; not seen live

## EX-0030 - 2026-11-09 - founder chat request (continue building)
- Summary: v118: flaky test t57b fixed (TASK-086).
- Files: tests/t57b.ts; tests/t95b.ts; CLAUDE.md
- Database: none
- Tests: t57b x40 runs, mutation check, type check, full npm test
- Open: Test change only; not deployed

## EX-0029 - 2026-11-09 - founder chat request (continue building)
- Summary: v117: password change and reset follow sign-up rules (TASK-085).
- Files: packages/core/auth/identity.ts; apps/web/app/profile/page.tsx; apps/web/app/reset-password/page.tsx; docs/LIVE_JOURNEY_CHECKLIST.md; tests/t117.ts, t95b.ts
- Database: none
- Tests: t117, type check, full npm test, production build
- Open: Reset-link email flow not tested; Supabase password policy not checked by Claude; not deployed

## EX-0028 - 2026-11-09 - founder chat request (continue building)
- Summary: v116: paper library limited to PDF, 10 MB (TASK-084).
- Files: packages/core/papers/upload-rules.ts; apps/web/app/api/papers/route.ts; apps/web/app/papers/page.tsx; packages/db/migrations/0062_papers_bucket_limits.sql; docs; tests/t116.ts, t95.ts, t95b.ts, t101.ts
- Database: 0062 (bucket settings only)
- Tests: t116, scratch Postgres twice, type check, full npm test, production build
- Open: Real upload to the live bucket not tried; review-before-publish not built; not deployed

## EX-0027 - 2026-11-08 - founder chat request (continue building)
- Summary: v115: undo notes for database changes 0002-0040 (TASK-083).
- Files: docs/ROLLBACK_NOTES.md; scripts/db-test/*; tests/t101.ts, t95b.ts
- Database: none (documentation and test scripts only)
- Tests: t101 (306 checks), undo round trip 0002-0054 on scratch Postgres, mutation check, type check, full npm test
- Open: Stand-in Supabase pieces; never run on the live database; not deployed

## EX-0026 - 2026-11-08 - founder chat request (continue building)
- Summary: v114: interleaving rules and design, not connected (TASK-082).
- Files: packages/core/pedagogy/interleave.ts; packages/core/index.ts; docs/INTERLEAVING_DESIGN.md; tests/t114.ts, t95b.ts
- Database: none
- Tests: t114, type check, full npm test
- Open: Not wired into the tutor; never tried with a real student; not deployed

## EX-0025 - 2026-11-08 - founder chat request (continue building)
- Summary: v113: undo notes for database changes 0041-0054 (TASK-081).
- Files: docs/ROLLBACK_NOTES.md; scripts/db-test/*; tests/t101.ts, t95b.ts
- Database: none (documentation and test scripts only)
- Tests: t101 (111 checks), undo round-trip on scratch Postgres, mutation check, type check, full npm test
- Open: Stand-in Supabase pieces; never run on the live database; 0002-0040 not covered; not deployed

## EX-0024 - 2026-11-08 - founder chat request (continue building)
- Summary: v112: smoke test, live journey checklist, browser safety headers (TASK-080).
- Files: scripts/smoke/smoke-test.mjs; docs/LIVE_JOURNEY_CHECKLIST.md; apps/web/next.config.js; tests/t112.ts, t95b.ts
- Database: none
- Tests: t112, smoke test against a local production build with a stand-in database, negative run against a dead server, type check, full npm test
- Open: Never run against the live site; CSP and HSTS deliberately not added; not deployed

## EX-0023 - 2026-11-08 - founder chat request (continue building)
- Summary: v111: tables scroll inside their own box on phones (TASK-079).
- Files: apps/web/app/globals.css; tests/t111.ts; tests/t95b.ts
- Database: none
- Tests: t111 (mutation-checked), phone-width render of the new style, type check, full npm test
- Open: Only a code scan and a test page: real signed-in pages were not opened; not deployed

## EX-0022 - 2026-11-08 - founder chat request (continue building)
- Summary: v110: forgot-password through a limited server route (TASK-078).
- Files: apps/web/app/api/auth/forgot-password/route.ts; apps/web/lib/password-reset-limit.ts; packages/core/safety/rate-limit.ts; apps/web/components/HomeClient.tsx; tests/t110.ts, t97.ts, t95b.ts
- Database: none (reuses public_check_log)
- Tests: t110, t97, type check, full npm test
- Open: Reset email delivery not tested; not deployed

## EX-0021 - 2026-11-08 - founder chat request
- Summary: v109: requirement rows for prompts 0001-0003 and a ranked remaining-work list (TASK-077).
- Files: scripts/control-centre/build-docs.py; packages/core/control-centre/registry-data.ts; docs/REMAINING_WORK_RANKED.md; tests/t90.ts, t90b.ts, t95b.ts
- Database: none (Load from documents copies the rows)
- Tests: t90, t90b, full npm test, type check
- Open: Row statuses come from older evaluation documents, not a fresh check of the code; 0004-0008 still headline-only; not deployed

## EX-0020 - 2026-11-06 - founder chat report
- Summary: v108: Control centre shortcut (TASK-076).
- Files: apps/web/components/AdminMenu.tsx; apps/web/app/globals.css; tests/t108.ts, t95b.ts
- Database: none
- Tests: t108, full npm test, type check, build
- Open: Not checked on a deployed site; not deployed

## EX-0019 - 2026-11-05 - Claude finding during v106 testing
- Summary: v107: phone header fix (TASK-075).
- Files: apps/web/app/globals.css; tests/t107.ts, t95b.ts
- Database: none
- Tests: t107, browser width scan at 320/360/375/414px, full npm test, type check, build
- Open: Not tested on real phones; only 10 public pages scanned (signed-in pages not scanned); not deployed

## EX-0018 - 2026-11-05 - founder chat request
- Summary: v106: screenshots in feedback (TASK-074).
- Files: packages/db/migrations/0061_feedback_attachments.sql; packages/core/feedback-attachments; apps/web/lib/feedback-attachments.ts; apps/web/app/api/feedback/attachment; apps/web/app/api/admin/feedback/attachment; apps/web/components/FeedbackWidget.tsx, FeedbackPictureAdmin.tsx; apps/web/app/admin/feedback/page.tsx; tests/t106.ts
- Database: 0061
- Tests: t106, scratch Postgres twice + undo, full npm test, type check, build
- Open: Not deployed; not tested on real phones or live storage; no AI reading; not in data export; retention is the founder's / D7

## EX-0017 - 2026-11-04 - founder chat request
- Summary: v105: Maths and Science question growth (TASK-073).
- Files: packages/db/seed/cbse-class10-maths-v105-diagnostic.json, cbse-class10-science-v105-diagnostic.json, cbse-class10-science.json; packages/db/seed-diagnostic.js; packages/db/seed-generators/gen_v105_*.py; docs/CONTENT_V105.md, CONTENT_STATUS.md; tests/t105.ts, t95b.ts
- Database: none
- Tests: t105 (15), mutation checks, full npm test, type check
- Open: Not teacher-verified; not loaded into the live database; some Maths topics have no skill yet; Hindi not grown; D7 legal review is the founder's

## EX-0016 - 2026-11-03 - founder chat request
- Summary: v104: question bank growth (TASK-072).
- Files: packages/db/seed/cbse-class10-*-v104-diagnostic.json (3); packages/db/seed/cbse-class10-computer-applications.json; packages/db/seed-generators/gen_v104_*.py, v104_lib.py; docs/CONTENT_V104.md, CONTENT_STATUS.md; tests/t104.ts, t95b.ts
- Database: none
- Tests: t104 (24 checks, mutation-checked), full npm test, type check
- Open: Not teacher-verified; not loaded into the live database; Hindi, Maths, Science not grown; off-syllabus Computer Applications chapters left in place; D7 legal review is the founder's

## EX-0015 - 2026-11-03 - SAH-PROMPT-0009
- Summary: v103: request limit on the free readiness check (TASK-071).
- Files: apps/web/app/api/public/check/route.ts; apps/web/app/check/page.tsx; apps/web/lib/public-check-limit.ts; packages/core/safety/rate-limit.ts, index.ts; packages/db/migrations/0060_public_check_limit.sql; packages/core/deploy-check/index.ts; docs/DATABASE_SCHEMA.md, ROLLBACK_NOTES.md; tests/t103.ts, t101.ts, t95b.ts
- Database: 0060 public_check_log (server-only)
- Tests: t103 (26), t101 (36), migration twice + undo on scratch Postgres, full npm test, type check, production build
- Open: Not tried on the live site; 0060 not applied live; D7 legal review is the founder's

## EX-0014 - 2026-11-02 - founder chat request
- Summary: v102: install-the-app button on every page (TASK-070).
- Files: packages/core/install-app/index.ts, index.ts; apps/web/components/InstallApp.tsx; apps/web/app/manifest.ts; apps/web/public/sw.js; apps/web/app/layout.tsx; apps/web/app/globals.css; apps/web/middleware.ts; tests/t102.ts, t102b.ts, t95b.ts, run-all.ts
- Database: none
- Tests: t102 (46), t102b (26, mutation-checked), full npm test, type check, production build, local manifest and service-worker checks
- Open: Not tried on real devices; no store listing; D7 legal review is the founder's

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
