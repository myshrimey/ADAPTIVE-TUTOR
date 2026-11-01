# Current Priority and Current Execution
Updated 2026-10-31. This file records what the FOUNDER chose. Claude may recommend but must not change it.

## Founder-selected priority
FD-10 (2026-10-31): the founder said version v88 is deployed and asked Claude to choose what to build next by criticality and strategic relevance to his prompts. Claude chose, in this order: security fix (TASK-016), tests into the repository (TASK-015), then Phase 1 of SAH-PROMPT-0009 (TASK-010 to TASK-014). The founder can overrule any of this at any time, and on the Task Backlog screen can mark one task as "next".

## Current execution record
- Active prompt: SAH-PROMPT-0009
- Active objective: O1 and O2 (registry and its screens)
- Active task: none running. v90 to v95 delivered; the founder will apply several versions together.
- Completed (evidence in TASK_BACKLOG.md): TASK-001 to TASK-005, TASK-015. Partly: TASK-016 (founder must switch on leaked-password protection).
- Ready for testing by the founder: TASK-010, 011, 012, 013 (and 014 partly).
- Files changed: see EXECUTION_LOG.md EX-0002 and EX-0003.
- Tests performed: see INSTRUCTIONS.txt (TESTED / NOT TESTED).
- Known problems: v82 to v90 are not on GitHub (it had v81 this morning); migrations 0055, 0056 and 0057 are not applied to the live database (open /admin/deploy-check after deploying to see); leaked-password protection is off; live Vercel site not checked yet.
- Next recommended action: founder applies v90 (unzip, db:migrate, deploy), opens /admin/control, presses "Load from documents", and checks it. Then Claude recommends: TASK-021, 020, 022, 023 (resume report, current execution page, dependency and QA pages), then recommended by criticality: the legal review for children's activity tracking (TASK-040, yours), then direct-API tests of the live site and the retention rule (Decision D3).
- Decisions waiting: D7 only (the professional legal review). D1, D2, D3 (interim), D5 and D6 were decided on 2026-11-01 (FD-11 to FD-15); you can change any of them.
