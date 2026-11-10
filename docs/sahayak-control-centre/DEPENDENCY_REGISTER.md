# Dependency Register
Updated 2026-10-31.

## Task dependencies
| Task | Needs first |
|---|---|
| TASK-003 | TASK-001,TASK-002 |
| TASK-004 | TASK-003 |
| TASK-005 | TASK-004 |
| TASK-011 | TASK-010 |
| TASK-012 | TASK-011 |
| TASK-013 | TASK-012 |
| TASK-014 | TASK-011 |
| TASK-020 | TASK-013 |
| TASK-021 | TASK-011 |
| TASK-022 | TASK-012 |
| TASK-023 | TASK-011 |
| TASK-031 | TASK-030 |
| TASK-033 | TASK-032,TASK-031 |
| TASK-035 | TASK-034,TASK-032 |
| TASK-036 | TASK-035 |
| TASK-037 | TASK-036 |
| TASK-038 | TASK-030 |
| TASK-039 | TASK-032 |
| TASK-041 | TASK-040 |
| TASK-042 | TASK-041 |
| TASK-043 | TASK-042 |
| TASK-044 | TASK-041 |
| TASK-050 | TASK-041 |
| TASK-051 | TASK-050 |
| TASK-052 | TASK-043 |
| TASK-060 | TASK-015 |
| TASK-061 | TASK-032,TASK-041 |
| TASK-062 | TASK-038,TASK-035 |
| TASK-063 | TASK-015 |
| TASK-064 | TASK-015 |
| TASK-065 | TASK-015 |
| TASK-066 | TASK-065 |
| TASK-067 | TASK-065 |
| TASK-068 | TASK-038 |
| TASK-069 | TASK-015 |
| TASK-070 | TASK-015 |
| TASK-071 | TASK-065 |
| TASK-072 | TASK-015 |
| TASK-073 | TASK-072 |
| TASK-074 | TASK-073 |
| TASK-075 | TASK-074 |
| TASK-076 | TASK-075 |
| TASK-077 | TASK-076 |
| TASK-078 | TASK-077 |
| TASK-079 | TASK-078 |
| TASK-080 | TASK-079 |
| TASK-081 | TASK-080 |
| TASK-082 | TASK-081 |
| TASK-083 | TASK-082 |
| TASK-084 | TASK-083 |
| TASK-085 | TASK-084 |
| TASK-086 | TASK-085 |
| TASK-087 | TASK-086 |

## Outside dependencies (things only a person can do or decide)
| Item | Who | Blocks |
|---|---|---|
| (decided FD-11) D1: master record lives in both places | - | - |
| (decided FD-12) D2: view-as approach: read-only, design only | - | TASK-035 still needs the founder's go and D7 |
| D7: professional legal review (children's activity, retention, staff viewing) | Founder, with a lawyer | TASK-040, TASK-041, TASK-035 |
| Legal review of tracking children's activity (India) | Founder with a lawyer | TASK-041 onward (R36) |
| Push versions v82 to v88 to GitHub and deploy | Founder | Anything that must be checked on the live site |
| Vercel approval link (team access) | Founder | Checking the live deployment and environment variable names |
| Turn on leaked-password protection in Supabase | Founder | TASK-016 (part) |

## Possible conflicts with earlier work
- Existing admin pages /admin/roadmap, /admin/tasks, /admin/memory, /admin/changelog and /admin/audit-log already do parts of this. They must be extended, not copied (see PHASE0_AUDIT.md).
- Part 6 asks for account-level activity tracking; earlier decisions say no covert surveillance and minimal data for minors. Not a conflict if the design stays minimal, but it needs the legal review first.
