# SAHAYAK Control Centre (documents)

Purpose: so no master prompt, requirement, decision or unfinished task is ever lost, and the founder stays in control of what is built next. These files are the permanent record. They do not depend on any chat.

Created 2026-10-31 for SAH-PROMPT-0009. Phase 0 only: documents, no app code, no database change, no deployment.

## Read in this order at the start of any new conversation
1. SESSION_RESUME.md (the resume report)
2. CURRENT_PRIORITY.md (what the founder chose; what is running)
3. MASTER_PROMPT_REGISTRY.md and MASTER_OBJECTIVE_TRACKER.md
4. TASK_BACKLOG.md and DEPENDENCY_REGISTER.md
5. DECISION_REGISTER.md
6. EXECUTION_LOG.md (last entry), RELEASE_HISTORY.md
7. PHASE0_AUDIT.md (how the current system is built)

If a file and the conversation disagree: tell the founder, do not guess.

## Rules (short form of the master prompt)
- Every new master prompt gets the next ID (SAH-PROMPT-00NN) and its text is saved word for word in MASTER_PROMPT_ARCHIVE/. Old prompts are never edited or overwritten. A revised prompt is a new ID that points to the old one.
- Each prompt is split into objectives (O1...), requirements (R01...), tasks (TASK-nnn), tests and evidence.
- Allowed statuses: RECEIVED, REGISTERED, ANALYSED, NOT STARTED, IN PROGRESS, PARTIALLY COMPLETED, BLOCKED, READY FOR TESTING, TESTING, COMPLETED, ACCEPTED BY FOUNDER, DEFERRED, CANCELLED.
- COMPLETED needs evidence (a test result or a check that was actually run). Written code alone is not completed. ACCEPTED BY FOUNDER is separate and only the founder can give it.
- Claude may recommend a priority but never changes the founder's choice. Changing a priority does not start work; only an explicit instruction does.
- A new prompt arriving during work: register it, analyse it, find conflicts and dependencies, update the backlog, keep the current task's progress, show the overall position, then ask what is next. Do not start it automatically.
- One major objective is active at a time unless the founder allows parallel work. Small necessary fixes are allowed and recorded.
- Never change production data or settings, and never deploy, without the founder's explicit approval.
- After every execution: update statuses, backlog, files changed, database changes, tests, open problems, EXECUTION_LOG.md and SESSION_RESUME.md. End the reply with sections A to K (summary, prompt status, requirement tracker, files changed, database changes, test results, security and privacy, remaining work, next tasks, founder decision needed, persistence confirmation).

## Where the numbers come from
The trackers are generated together from one list, so the counts always add up. The roadmap rows for older prompts are read from `apps/web/app/admin/roadmap/page.tsx`.

## What exists and what does not (2026-10-31, after v90)
Exists: these documents; the registry in the database (migration 0056) and the admin screens /admin/control, /admin/control/objectives, /admin/control/tasks, /admin/control/decisions and one page per prompt (after v90 is applied: run `npm run db:migrate`, deploy, open /admin/control and press "Load from documents"); the existing admin pages listed in PHASE0_AUDIT.md section 2; all test scripts inside the repository (`npm test`).
How the documents are made: `python3 scripts/control-centre/build-docs.py` writes these files and `packages/core/control-centre/registry-data.ts` from ONE list, so the numbers always add up. After editing the list, run it, then `npm test`.
Does not exist yet: current-execution screen, dependency and testing screens (TASK-020, 022), the account directory with "view as", the central activity log, activity analytics, direct-API security tests.
