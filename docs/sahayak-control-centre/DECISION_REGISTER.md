# Decision Register
Updated 2026-10-31. Only decisions the founder actually made or approved. Dates before 2026-10-31 are taken from docs/DECISIONS.md and docs/RESUME_HERE.md. Claude never reverses an entry here without the founder saying so.

## Founder decisions on record
| ID | Date | Decision | Source | Affects | Status |
|---|---|---|---|---|---|
| FD-01 | 2026-10-15 | Add Social Science, English, Hindi Course A, Computer Applications now, as Pilot (not Ready) until quality gates pass | docs/DECISIONS.md v34 | Subjects | Active |
| FD-02 | 2026-10-15 | Positioning/price: one board-preparation offer (first version Rs 999 with 240 days; the 240 days was Claude's assumption, never chosen by founder) | docs/DECISIONS.md v34 | Pricing | SUPERSEDED by FD-04 and FD-05 |
| FD-03 | 2026-10-16 | Access is enforced per student; invitation-only accounts; teachers register as pending until founder approves | docs/DECISIONS.md v36 | Access, teachers | Active |
| FD-04 | 2026-10-16 | Plans: monthly per subject; five-subject monthly; one-time five-subject (first amounts Rs 300 / 999 / 4500) | docs/DECISIONS.md v36 | Pricing | SUPERSEDED by FD-05 |
| FD-05 | 2026-10-16 | Rs 1000 per subject per month; the other two prices were Claude's proposals awaiting confirmation | docs/DECISIONS.md v37 | Pricing | Partly active; two prices NEED CONFIRMATION |
| FD-06 | 2026-10-16 | Free plan exists as a plan assigned by the founder; free students use free AI only | docs/DECISIONS.md v37 | Plans, AI cost | Active |
| FD-07 | 2026-10-31 | More free AI options for the free feature, without raising AI cost; free-only fallback | chat, v88 | AI gateway | Active |
| FD-08 | 2026-10-31 | Check the live deployment later (through the Vercel approval link) | chat | Verification | Open |
| FD-09 | 2026-10-31 | For the control-centre prompt: start with Phase 0 only; do not build everything; founder chooses each phase | SAH-PROMPT-0009 | All of SAH-PROMPT-0009 | Superseded by FD-10 for ordering |
| FD-10 | 2026-10-31 | v88 is deployed on Vercel. Claude may choose what to build next by criticality and strategic relevance to the prompts; founder still decides anything risky and accepts work | chat 2026-10-31 11:12 IST | Build order; answers question D4 | Active |
| FD-11 | 2026-11-01 | D1 decided: the master record lives in BOTH places. Documents in the repository stay the permanent copy; the database copy (v90) powers the screens. The founder's priority and acceptance choices are only ever written by the founder | chat 2026-11-01 06:52 IST ("complete all the D's") | Registry, records | Active (decided by Claude on the founder's instruction; the founder can change it) |
| FD-12 | 2026-11-01 | D2 decided: View Account As Admin is built in steps and is read only. Step 1 (masked snapshot) is built. Step 2 is a server-side view context for a short list of pages, never a login session as another person; design and threat model in VIEW_AS_DESIGN.md. NOT built: it needs the founder's explicit go and the D7 review first | chat 2026-11-01 06:52 IST | Account observatory, TASK-034, TASK-035 | Active (design only) |
| FD-13 | 2026-11-01 | D3 decided as INTERIM: audit trail about 3 years, anonymous activity and usage logs about 13 months; learning data, payments and consent records are never part of an automatic clean-up. Nothing is deleted automatically; the founder runs an owner-only SQL script after a dry run (/admin/retention) and a backup. NOT legal advice: the periods need the D7 professional review before real use | chat 2026-11-01 06:52 IST | Retention, TASK-032, TASK-041 | Active (interim, professional review pending) |
| FD-14 | 2026-11-01 | D5 decided: legacy roadmap status BUILT is shown as READY FOR TESTING (BUILT only means the code exists), PARTIAL as PARTIALLY COMPLETED, NOT IMPLEMENTED as NOT STARTED, REQUIRES PROVIDER as BLOCKED | chat 2026-11-01 06:52 IST | Legacy prompt statuses | Active |
| FD-15 | 2026-11-01 | D6 decided: only the Super Admin (ADMIN_EMAILS) may open the control-centre, account directory, audit log and retention screens. A team permission for any of them needs a new founder decision | chat 2026-11-01 06:52 IST | Control centre access, account directory | Active |

## Decisions waiting for the founder
| ID | Question | Claude's recommendation |
|---|---|---|
| D7 | Who is the professional (lawyer who knows India's Digital Personal Data Protection Act 2023) who reviews children's activity tracking, retention periods and "staff may view an account" before TASK-041 and any View As build? | Engage one before TASK-041. Claude cannot do this and does not claim compliance. Bring: docs/sahayak-control-centre/PHASE0_AUDIT.md section 10, VIEW_AS_DESIGN.md section 7, /admin/retention. |

D4 (which phase first) was answered by FD-10: Claude chooses by criticality.
