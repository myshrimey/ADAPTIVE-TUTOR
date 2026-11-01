# Phase 0 Audit (SAH-PROMPT-0009)
Date: 2026-10-31. Method: read the repository in /home/claude/build (version v88 plus v89 documents) and read the LIVE Supabase project with the read-only connector (table list, security advisor, a few counts of rows by type). No student answers, messages or personal records were read. Nothing was changed. The live website on Vercel was NOT checked (waiting for the founder's approval link), so "live" below means the live database, not the live site.

Plain-words summary: Sahayak already has a strong admin area, role-based accounts, and several separate activity logs. It has NO "view as another account" feature, NO central activity log, and NO tamper-protected audit trail, and the automated tests are not stored in the repository. Everything in this prompt can be built on top of what exists, mostly by extending it.

## 1. Architecture
- One monorepo. `apps/web`: Next.js (App Router) website and APIs. `packages/core`: all the product logic, exported through a single `index.ts`. `packages/db/migrations`: numbered SQL files, 0001 to 0054, run with `npm run db:migrate`. Supabase for database and sign-in; Vercel for hosting; GitHub for code.
- All data writes by the product go through the server using a service key. Browsers use a restricted key.
- 52 admin page folders under `apps/web/app/admin`. 34 API groups under `apps/web/app/api`; the `/api/admin` group alone has 32 route folders.

## 2. Existing admin functionality (reusable, so do not duplicate)
| Needed by this prompt | What already exists | Plan |
|---|---|---|
| Master prompt registry / roadmap | `/admin/roadmap` (31 numbered rows plus 5 prompt rows, typed into the page code) | Extend: fill from database, keep the page as the overview |
| Task list | `/admin/tasks` backed by `founder_tasks` (business tasks: sales, funding) | Keep for business tasks. Development tasks get their own tables |
| Project memory / decisions | `/admin/memory` (`founder_memory`, 15 sections), `docs/DECISIONS.md` | Link; Decision Register gets its own table with dates and conflict flag |
| Change history | `/admin/changelog` (`system_changelog`, 27 rows) | Reuse for Release History |
| Audit | `/admin/audit-log` (`audit_logs`, 1 row) | Upgrade in place (section 5) |
| Account lists | `/admin/users`, `/admin/students`, `/admin/teachers`, `/admin/invitations`, `/admin/team`, `/admin/devices` | Account directory should reuse these queries, not copy them |
| Analytics | `/admin/metrics`, `/admin/funnel`, `/admin/traffic`, `/admin/engagement`, `/admin/investor-metrics`, `/admin/command-centre` | Activity analytics should feed the same layout |
| Gate and menu | `requireAdmin(perm?)`, `adminPageGate(perm?)`, `AdminNav`, team permissions | Reuse as is |

## 3. Account types and roles
- `users.role` allows: student, parent, teacher, tutor, centre, admin. Live count: 17 students, 1 parent, nothing else. There are no teacher, tutor or centre accounts yet, so those checklists need test accounts.
- "Admin" is decided by the email list `ADMIN_EMAILS` (Super Admin = founder) plus the `admin_team` table (permission-limited members). No user row holds the role admin.
- Centre membership: `org_members` allows member roles student, teacher, tutor. There is no centre administrator or staff role and no School Admin role. The prompt lists "coaching-centre administrators and other staff": this is a gap, not yet a feature.
- Relationships: `student_links` (parent, tutor, centre to student), `teacher_assignments`, `batches`/`batch_students`. Role changes are requests the founder approves (`role_changes`).

## 4. Authentication and authorisation
- Sign-in by username or email through Supabase. The login API (`/api/auth/login`) records nothing about the login itself (no event, no failed-attempt log).
- Admin pages and APIs call a server-side gate (`requireAdmin`). A page with no permission listed is Super Admin only. This is the right pattern.
- Row Level Security is ON for every table in the live database. 69 policies on 60 tables (the owner-reads-own-row pattern). 83 tables have RLS on and no policies on purpose: only the server can read them. Earlier fix already closed a role self-edit path (migration 0049).
- No impersonation or "view as" exists anywhere in the code (searched).

## 5. Existing activity tracking (8 separate sources, no central one)
| Table | Holds | Limit for this prompt |
|---|---|---|
| `learning_events` | student session and mastery events (14 event types) | student-only; no login, no errors |
| `engagement_events` | gamification (XP, missions) | student-only |
| `page_views` | anonymous visits, channel, device | by visitor, not by account |
| `feature_usage` | feature counters | counters, not a timeline |
| `ai_usage` | AI provider, model, tokens, timing, cost; never text | no account-level view |
| `signup_log`, `account_devices` | sign-ups, device counts | narrow |
| `commerce_events` | payment/commerce steps (22 rows) | not linked to a timeline |
| `audit_logs` | admin config changes (fields: time, email, action, entity, detail) | no target account, no reason, no outcome, can be edited or deleted by anyone with database rights, about 12 files use its writer |
Not recorded anywhere today: login, logout, failed login, profile update, plan activated/expired as an event, report generated/viewed (partly), permission denied, API failure, request latency, upload failure. No retention or deletion rule exists in code.

## 6. Existing test infrastructure
- The repository has no test folder and no `npm test`. The checks (numbered scripts t1 to t88) were written and run in the working area outside the repository, so they are not saved with the code. Four old ones (t3, t4, t42a, t42c) are out of date and fail for known reasons unrelated to this work.
- `eval/run-eval.ts` exists for AI answer quality only.
- Gap: nothing automated tests access control through the real APIs.

## 7. Database and security (live, 2026-10-31)
- Supabase security advisor: 83 notes "RLS on, no policies" (intended: server-only tables); WARN `guard_user_role` function has no fixed search path; WARN leaked-password protection is off in Auth.
- The database's own migration list is empty because this project applies migrations with its own script. Evidence of what is applied comes from the tables and columns themselves: migrations 0052 to 0054 are applied.

## 8. Gaps against the master prompt
| Part | Status today |
|---|---|
| 2-3 Registry, priorities, resume | Only documents just created. No screens, no database, no tooling |
| 4 Control Centre screens | Roadmap and tasks pages exist but are not prompt-aware |
| 5 Account Observatory | Directory pieces exist; "view as" does not exist; no per-type test checklists |
| 6 Activity Intelligence | 8 partial sources; no central table, no timeline, no retention |
| 6.5 Audit | Exists in basic form; not tamper-resistant |
| 7 Security and privacy | Strong base; two small warnings; legal review for children's tracking not done |
| 9 Testing | No tests in the repository |

## 9. Proposed architecture
1. **Registry**: documents in the repository stay the permanent record. Add server-only tables (`control_prompts`, `control_objectives`, `control_requirements`, `control_tasks`, `control_decisions`, `control_executions`) so the admin screens can filter and the founder can mark the next task. Importer loads the documents into the tables and never overwrites the founder's choices. (Founder Decision D1.)
2. **Screens**: new folder `/admin/control/...` using `adminPageGate()` (Super Admin only) and the existing layout components.
3. **Audit**: add columns (target account, reason, outcome, request ID) to the existing `audit_logs`, and a database rule that blocks edits and deletes. Do not create a second audit table.
4. **Activity**: one new server-only table `activity_events` with the fields the prompt suggests (account, actor, role, type, category, entity, short metadata, status, time, correlation id), indexes on account+time and type+time, and a retention routine. A small `recordActivity()` helper that never breaks the product, also called from existing event writers. No backfill of old data. Starts only after the legal review.
5. **View as admin**: today every page reads "who is signed in" from the browser session. Two ways to show "the app as that account sees it": (a) mint a login session as that person, which is exactly the shared-credential risk the prompt forbids, or (b) a server-side "view context" in which a short list of pages loads data for the chosen account with the admin's own session, read only, with banner, exit and expiry. Recommended: (b), in steps (Decision D2). First an account detail page (masked data, plan, links, subjects, last activity) which is already useful and has little risk.
6. **Tests**: move the scripts into the repository first (TASK-015), then add direct-API tests for no-login, wrong-role and other-account cases.

## 10. Privacy and legal flags (for professional review; this is NOT a compliance claim)
- Sahayak serves school students, many under 18. India's Digital Personal Data Protection Act 2023 has special rules for children's data, including parental consent and limits on tracking or monitoring children. Whether and how account-level activity timelines are allowed, and the retention periods, need advice from a lawyer who knows this law before Phase 4 (TASK-040).
- Minimise: event names, times, results and durations; never message text, answers or device details.
- The committed file `ERROR_MISTAKE 16 OCOBER 2026.docx` in the public GitHub repository contains five email addresses and unrelated terminal text; recommend removing it.

## 11. Risks and complexity
| Item | Risk | Size |
|---|---|---|
| View Account As Admin | Highest: leaking one family's data, or changing a child's record by mistake | XL |
| Activity events for minors | Legal | M (code), plus legal review |
| Audit immutability | Needs a database rule; must not break the existing writers | M |
| Registry importer | Must never overwrite the founder's choices | M |
| Test move into repository | Some tests need the scratch database; keep them runnable without it where possible | M |

## 12. Recommended sequence
P1 registry tables and screens, with TASK-015 (tests into repository) and TASK-016 (security warnings) alongside; then P2 execution control and resume; then P3 account directory and audit upgrade, then view-as in read-only form; P4 activity (after legal review); P5 analytics; P6 security and workflow tests. The founder chooses; nothing starts without that.

Full task list with IDs: TASK_BACKLOG.md.
