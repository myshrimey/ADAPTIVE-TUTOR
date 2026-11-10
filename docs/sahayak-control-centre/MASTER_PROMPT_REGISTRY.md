# Master Prompt Registry
Updated 2026-10-31. One row per master prompt. Originals are never overwritten. "Founder priority" is only what the founder said; Claude never fills it in.

IMPORTANT, in plain words: the ORIGINAL TEXT of prompts 0001 to 0008 is not in the repository. Claude only has the founder's later notes and the build records. For those, this registry tracks the headline and the roadmap rows, NOT every sentence. If you want word-for-word tracking, send each original again and it will be archived as a new file.

| Prompt ID | Title | Received | Original text kept? | Requirements tracked | Status | Founder priority |
|---|---|---|---|---|---|---|
| SAH-PROMPT-0001 | MVP master prompt (54 sections) | before 2026-10-16 (exact date not recorded) | No. Evidence: docs/MASTER_PROMPT_COVERAGE.md | 32 section rows (v109) | PARTIALLY COMPLETED (not built: Hindi Course A vs B, animated diagrams, teacher pay, automatic Excel tracker) | not set |
| SAH-PROMPT-0002 | Master prompt v3 | about 2026-10-17 (v42) | No. Evidence: docs/V3_REQUIREMENTS_MAP.md | 23 section rows (v109) | Per that document; not re-evaluated | not set |
| SAH-PROMPT-0003 | Adaptive-learning master prompt (numbered sections 3 to 56) | not recorded | No. Evidence: the roadmap page rows | 26 roadmap rows (see below) | PARTIALLY COMPLETED | not set |
| SAH-PROMPT-0004 | Feedback Intelligence and Human Review Engine | about v67 | No | 1 roadmap row | PARTIALLY COMPLETED | not set |
| SAH-PROMPT-0005 | Social Media Growth Engine | about v72 | No | 1 roadmap row | PARTIALLY COMPLETED | not set |
| SAH-PROMPT-0006 | Acquisition and Referral Intelligence | about v76 | No | 1 roadmap row | PARTIALLY COMPLETED | not set |
| SAH-PROMPT-0007 | Role-based accounts, invitations, team, Help | about v79 | No | 1 roadmap row | PARTIALLY COMPLETED | not set |
| SAH-PROMPT-0008 | Curriculum management and branded exports | about v81 | No | 1 roadmap row | PARTIALLY COMPLETED | not set |
| SAH-PROMPT-0009 | Founder Command and Development Control System | 2026-10-31 10:59 IST | Yes: MASTER_PROMPT_ARCHIVE/SAH-PROMPT-0009.md | 74 requirements, 67 tasks | PARTIALLY COMPLETED. Phase 0 done; Phase 1 registry tables and screens built (v90), not yet applied or seen live | Founder handed ordering to Claude by criticality (FD-10) |

Order of 0004 to 0008 is by the build version that first delivered them, not by a verified date of receipt.

## How legacy roadmap rows were given a status
The roadmap page uses BUILT / PARTIAL / NOT IMPLEMENTED / REQUIRES PROVIDER. Under this system "completed" needs verification evidence, and the roadmap itself says BUILT "does not mean proven with real families". So they are mapped like this (Founder Decision D5, to confirm):
- BUILT becomes READY FOR TESTING
- PARTIAL becomes PARTIALLY COMPLETED
- NOT IMPLEMENTED becomes NOT STARTED
- REQUIRES PROVIDER becomes BLOCKED (waiting for a provider/cost choice)

## SAH-PROMPT-0003 roadmap rows (read from apps/web/app/admin/roadmap/page.tsx, 2026-10-31)
Counts: READY FOR TESTING 10, PARTIALLY COMPLETED 13, NOT STARTED 2, BLOCKED 1. Total 26.

| Row | Section(s) | What | Roadmap status | Mapped status |
|---|---|---|---|---|
| LR-01 | 3, 38, 39 | One student model; evidence from every source | PARTIAL | PARTIALLY COMPLETED |
| LR-02 | 4-5 | Adaptive diagnostic and baseline (goes down to earlier classes) | BUILT | READY FOR TESTING |
| LR-03 | 6 | Learning strategy orchestrator | PARTIAL | PARTIALLY COMPLETED |
| LR-04 | 7 | Full learning loop | PARTIAL | PARTIALLY COMPLETED |
| LR-05 | 8 | Error intelligence | PARTIAL | PARTIALLY COMPLETED |
| LR-06 | 9 | Mastery states | PARTIAL | PARTIALLY COMPLETED |
| LR-07 | 10 | Spaced revision scheduler | BUILT | READY FOR TESTING |
| LR-08 | 11 | Interleaving engine | PARTIAL | PARTIALLY COMPLETED |
| LR-09 | 12 | Worked example and fading-support engine | BUILT | READY FOR TESTING |
| LR-10 | 13 | Metacognition prompts and calibration | PARTIAL | PARTIALLY COMPLETED |
| LR-11 | 14 | Teach Sahayak mode | NOT IMPLEMENTED | NOT STARTED |
| LR-12 | 15-16 | Voice Sahayak (speaking and listening) | REQUIRES PROVIDER | BLOCKED |
| LR-13 | 17 | Visual learning | PARTIAL | PARTIALLY COMPLETED |
| LR-14 | 18 | Handwritten mock evaluation | BUILT | READY FOR TESTING |
| LR-15 | 19-20 | Parent intelligence and next-best action | BUILT | READY FOR TESTING |
| LR-16 | 21-24 | Tutor and coaching-centre intelligence | PARTIAL | PARTIALLY COMPLETED |
| LR-17 | 25, 44 | Roles, privacy, audit | PARTIAL | PARTIALLY COMPLETED |
| LR-18 | 26-30 | Feedback intelligence and human review gate | PARTIAL | PARTIALLY COMPLETED |
| LR-19 | 31-35 | AI router, fallback, ledger, economics | BUILT | READY FOR TESTING |
| LR-20 | 36-37 | Engagement without addiction | BUILT | READY FOR TESTING |
| LR-21 | 40 | Exam readiness | BUILT | READY FOR TESTING |
| LR-22 | 41-42 | Multi-board and language architecture | PARTIAL | PARTIALLY COMPLETED |
| LR-23 | 45 | Founder Command Centre | BUILT | READY FOR TESTING |
| LR-24 | 46 | Experiments | PARTIAL | PARTIALLY COMPLETED |
| LR-25 | 47 | Safety wording | BUILT | READY FOR TESTING |
| LR-26 | 55-56 | Live test of every journey, role-boundary test | NOT IMPLEMENTED | NOT STARTED |

## SAH-PROMPT-0004 to 0008 roadmap rows
| Prompt | What | Roadmap status |
|---|---|---|
| 0004 | Feedback Intelligence and Human Review Engine (/admin/feedback-intelligence) | PARTIAL |
| 0008 | Curriculum management and branded exports (/admin/curriculum) | PARTIAL |
| 0007 | Role-based accounts, invitations, admin team, Help (/admin/users, /admin/invitations, /admin/team, /help) | PARTIAL |
| 0006 | Acquisition & Referral Intelligence (/admin/acquisition) | PARTIAL |
| 0005 | Social Media Growth Engine (/admin/social-growth) | PARTIAL |
