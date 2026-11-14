# Task Backlog
Updated 2026-10-31. 70 tasks for SAH-PROMPT-0009. Effort sizes are rough guesses, not hours: S small, M medium, L large, XL very large. "Actual effort" is not tracked yet. Last updated for every row: 2026-10-31.

Tasks by status: BLOCKED 1, COMPLETED 6, NOT STARTED 11, PARTIALLY COMPLETED 5, READY FOR TESTING 47.

Changing a priority here does NOT start work. Work starts only when the founder says so in the chat.

| Task | Phase | Task description | Objective | Requirements | Depends on | Size | Status | Verification |
|---|---|---|---|---|---|---|---|---|
| TASK-001 | P0 | Audit repository: architecture, admin pages, roles, auth, analytics, tests | O8 | R41, R50 | - | M | COMPLETED | document checked against repo |
| TASK-002 | P0 | Check live database structure and security advisor (read only, Supabase connector) | O8 | R41, R43 | - | S | COMPLETED | document checked against repo |
| TASK-003 | P0 | Write gap report against the prompt and proposed architecture | O8 | R50 | TASK-001,TASK-002 | M | COMPLETED | document checked against repo |
| TASK-004 | P0 | Create markdown control-centre documents and register all known prompts | O8 | R01, R02, R03, R51 | TASK-003 | M | COMPLETED | document checked against repo |
| TASK-005 | P0 | Present findings and proposed Phase 1 to the founder | O8 | R52 | TASK-004 | S | COMPLETED | document checked against repo |
| TASK-010 | P1 | Design and add database tables for prompts, objectives, requirements, tasks, decisions, execution (server-only, migration 0055 or later) | O1 | R01, R02, R10, R42 | - | M | READY FOR TESTING | none yet |
| TASK-011 | P1 | Importer that loads these markdown trackers into the tables (safe to re-run, never overwrites founder choices) | O1 | R01, R10 | TASK-010 | M | READY FOR TESTING | none yet |
| TASK-012 | P1 | Admin pages: Dashboard, Master Prompt Registry, Objective Tracker (read only), using existing admin layout | O2 | R12, R13, R14, R21 | TASK-011 | M | READY FOR TESTING | none yet |
| TASK-013 | P1 | Task Backlog page with filter/sort and "mark as next task" (writes the choice only; never runs anything) | O2 | R15, R06 | TASK-012 | M | READY FOR TESTING | none yet |
| TASK-014 | P1 | Decision Register page with conflict flag | O2 | R19 | TASK-011 | S | PARTIALLY COMPLETED | none yet |
| TASK-015 | P1 | Move the numbered test scripts (t1 to t88) from the working area into the repository with one command to run them | O7 | R44, R48 | - | M | COMPLETED | document checked against repo |
| TASK-016 | P1 | Fix the two security warnings: guard_user_role search path (migration) and leaked-password protection (Supabase setting, founder) | O5 | R37, R38 | - | S | PARTIALLY COMPLETED | none yet |
| TASK-020 | P2 | Current Execution page and exportable SESSION_RESUME text | O2 | R16, R07, R09 | TASK-013 | M | READY FOR TESTING | none yet |
| TASK-021 | P2 | Resume report generator (counts from the tables) | O1 | R09, R10 | TASK-011 | S | READY FOR TESTING | none yet |
| TASK-022 | P2 | Dependency Register and Testing & QA pages | O2 | R17, R18 | TASK-012 | M | READY FOR TESTING | none yet |
| TASK-023 | P2 | Execution History: every delivery adds a row | O2 | R20, R08 | TASK-011 | S | READY FOR TESTING | none yet |
| TASK-030 | P3 | Account directory (read only, masked) at /admin/accounts | O3 | R22, R23 | - | L | READY FOR TESTING | none yet |
| TASK-031 | P3 | Account detail snapshot: plan, access, links, subjects, last activity | O3 | R22, R39 | TASK-030 | M | READY FOR TESTING | none yet |
| TASK-032 | P3 | Upgrade audit_logs: target account, reason, outcome, request ID; block edit and delete | O4 | R34, R35 | - | M | READY FOR TESTING | none yet |
| TASK-033 | P3 | Log every account the admin opens (audit event) | O4 | R34 | TASK-032,TASK-031 | S | READY FOR TESTING | none yet |
| TASK-034 | P3 | Design study and threat model for View Account As Admin; choose approach | O3 | R24, R27 | - | M | READY FOR TESTING | none yet |
| TASK-035 | P3 | Build View Account As Admin, read only, for the chosen pages (banner, exit, expiry) | O3 | R24, R25, R29 | TASK-034,TASK-032 | XL | NOT STARTED | none yet |
| TASK-036 | P3 | Read-only enforcement for all write APIs while inspecting | O3 | R25, R39 | TASK-035 | L | NOT STARTED | none yet |
| TASK-037 | P3 | Test mode with recorded reason, and dedicated test accounts | O3 | R26 | TASK-036 | L | NOT STARTED | none yet |
| TASK-038 | P3 | Test checklists for each account type, from features that really exist | O3 | R28 | TASK-030 | M | PARTIALLY COMPLETED | none yet |
| TASK-039 | P3 | Retention dry-run report and owner-only purge script (interim periods) | O4 | R35 | TASK-032 | S | READY FOR TESTING | none yet |
| TASK-040 | P4 | Legal and privacy review of activity tracking for minors (founder with a professional) | O5 | R36, R40 | - | M | BLOCKED | none yet |
| TASK-041 | P4 | Add central activity_events table with indexes, server-only access and retention | O4 | R30, R35 | TASK-040 | M | NOT STARTED | none yet |
| TASK-042 | P4 | recordActivity helper (never breaks the product) and link existing event writers | O4 | R30, R31 | TASK-041 | M | NOT STARTED | none yet |
| TASK-043 | P4 | Record missing events: login/logout, profile, plan, payment steps, report generated/viewed, permission denied, upload and AI failures | O4 | R31, R36 | TASK-042 | L | NOT STARTED | none yet |
| TASK-044 | P4 | Account timeline page with filters | O4 | R32 | TASK-041 | M | NOT STARTED | none yet |
| TASK-050 | P5 | Metrics from existing tables: active users, registrations, completions, with "unavailable" labels | O4 | R33 | TASK-041 | M | NOT STARTED | none yet |
| TASK-051 | P5 | Funnel, retention and feature adoption views | O4 | R33 | TASK-050 | M | NOT STARTED | none yet |
| TASK-052 | P5 | Error-rate and AI failure panels | O4 | R33, R31 | TASK-043 | M | NOT STARTED | none yet |
| TASK-060 | P6 | Direct-API tests: no login, wrong role, expired session, another account | O7 | R46, R48 | TASK-015 | L | PARTIALLY COMPLETED | none yet |
| TASK-061 | P6 | Audit protection and retention tests | O7 | R47, R35 | TASK-032,TASK-041 | M | PARTIALLY COMPLETED | none yet |
| TASK-062 | P6 | End-to-end workflow checks for each account type | O7 | R45, R46, R47 | TASK-038,TASK-035 | L | NOT STARTED | none yet |
| TASK-063 | P6 | Deployment pre-flight: whole migration chain test and a Deployment check page | O7 | R10, R44, R48 | TASK-015 | S | READY FOR TESTING | none yet |
| TASK-064 | P6 | Sign-in brute-force protection (limit on wrong passwords, admin form included) | O7 | R48 | TASK-015 | S | READY FOR TESTING | none yet |
| TASK-065 | P6 | Public-route gate scan: every non-admin API route names its caller or is on a written public list; harden teacher sign-up | O7 | R48 | TASK-015 | S | READY FOR TESTING | none yet |
| TASK-066 | P6 | Stop raw server error text reaching visitors (non-admin routes) | O7 | R48 | TASK-065 | S | READY FOR TESTING | none yet |
| TASK-067 | P6 | Dependency security review and Next.js security patch (15.5.28) | O7 | R48 | TASK-065 | S | READY FOR TESTING | none yet |
| TASK-068 | P3 | Record manual test results on the Testing and QA page | O3 | R18, R28, R49 | TASK-038 | S | READY FOR TESTING | none yet |
| TASK-069 | P6 | Written rollback notes for the database changes about to be deployed (0055 to 0059), tested | O6 | R42 | TASK-015 | S | READY FOR TESTING | none yet |
| TASK-070 | P6 | Install-the-app button on every page (installable web app: manifest, no-cache service worker, device-aware button) | O6 | R53 | TASK-015 | M | READY FOR TESTING | none yet |
| TASK-071 | P6 | Request limit on the free public readiness check (/api/public/check) | O7 | R48 | TASK-065 | S | READY FOR TESTING | none yet |
| TASK-072 | P6 | Grow the question bank for thin subjects (Computer Applications, English, Social Science) from the 2026-27 syllabus | O6 | R54 | TASK-015 | L | READY FOR TESTING | none yet |
| TASK-073 | P6 | Grow the Maths and Science question banks (gap levels and missing 2026-27 Science chapters) without labelling unreviewed questions verified | O6 | R55 | TASK-072 | L | READY FOR TESTING | none yet |
| TASK-074 | P6 | Let people attach screenshots/pictures to feedback, stored privately and visible only to support admins | O6 | R56 | TASK-073 | L | READY FOR TESTING | none yet |
| TASK-075 | P6 | Fix the phone header that made public pages scroll sideways | O6 | R57 | TASK-074 | S | READY FOR TESTING | none yet |
| TASK-076 | P6 | Add a Control centre shortcut to the admin top bar | O6 | R58 | TASK-075 | S | READY FOR TESTING | none yet |
| TASK-077 | P6 | Break prompts 0001-0003 into requirement rows and rank what is left | O6 | R59 | TASK-076 | M | READY FOR TESTING | none yet |
| TASK-078 | P6 | Move forgot-password to a limited server route | O6 | R60 | TASK-077 | S | READY FOR TESTING | none yet |
| TASK-079 | P6 | Stop tables widening phone pages | O6 | R61 | TASK-078 | S | READY FOR TESTING | none yet |
| TASK-080 | P6 | Smoke test, live journey checklist and safety headers | O6 | R62 | TASK-079 | S | READY FOR TESTING | none yet |
| TASK-081 | P6 | Undo notes for migrations 0041-0054 | O6 | R63 | TASK-080 | M | READY FOR TESTING | none yet |
| TASK-082 | P6 | Interleaving rules and wiring design (not connected) | O6 | R64 | TASK-081 | M | READY FOR TESTING | none yet |
| TASK-083 | P6 | Undo notes for migrations 0002-0040 | O6 | R65 | TASK-082 | M | READY FOR TESTING | none yet |
| TASK-084 | P6 | Limit uploads to the public paper library | O6 | R66 | TASK-083 | S | READY FOR TESTING | none yet |
| TASK-085 | P6 | Same password rules on change and reset | O6 | R67 | TASK-084 | S | READY FOR TESTING | none yet |
| TASK-086 | P6 | Fix the flaky test t57b | O6 | R68 | TASK-085 | S | READY FOR TESTING | none yet |
| TASK-087 | P6 | Validate and cap profile save input on the server | O6 | R69 | TASK-086 | S | READY FOR TESTING | none yet |
| TASK-088 | P6 | Check tutor message, answer size and payment claim on the server | O6 | R70 | TASK-087 | S | READY FOR TESTING | none yet |
| TASK-089 | P6 | Check onboarding input on the server | O6 | R71 | TASK-088 | S | READY FOR TESTING | none yet |
| TASK-090 | P6 | Close the open question-edit and payment-insert database rules | O6 | R72 | TASK-089 | S | READY FOR TESTING | none yet |
| TASK-091 | P6 | Add French (Class X) subject, content, keypad and grading | O6 | R73 | TASK-090 | S | READY FOR TESTING | none yet |
| TASK-092 | P6 | Fix answer checking for three forms of correct answers a student typed | O6 | R74 | TASK-091 | S | READY FOR TESTING | none yet |
| TASK-093 | P6 | Add more questions in all subjects (thin subjects to 2+ per skill) | O6 | R75 | TASK-092 | M | READY FOR TESTING | none yet |
| TASK-094 | P6 | Add 1000+ Computer Applications questions covering every skill | O6 | R76 | TASK-093 | M | READY FOR TESTING | none yet |
| TASK-095 | P6 | Add 500+ Social Science questions | O6 | R77 | TASK-094 | M | READY FOR TESTING | none yet |
