# v104 question bank growth (Computer Applications, English, Social Science)

Written 2026-11-03. This file says what was added, where it came from, and what it is NOT.

## What was added (218 questions, all multiple choice)
| Subject | New questions | Notes |
|---|---|---|
| Computer Applications | 75 | 17 new skills in 3 new chapters that follow the official 2026-27 units: Networking (15 marks), HTML (25), Cyber Ethics (10). HTML has the most questions because it carries the most marks. |
| English Language & Literature | 63 | 3 for each of the 21 existing skills (literature, grammar, writing, reading). |
| Social Science | 80 | 2 for each skill whose chapter is on the 2026-27 list. |

Not touched this round: Mathematics and Science (already about 1,000 and 900 questions), Hindi A and B (46 and 54; they follow the 2026-27 syllabus since v43 and need a Hindi teacher before more are added).

## Where it came from
- The SYLLABUS (which units and topics) was read from public syllabus summaries (educart, cbseguidanceweb, aglasem, oswal publishers, 2026-27). The full official CBSE PDF could not be opened from here, so the topic lists are summaries and must be checked against cbseacademic.nic.in.
- The QUESTIONS were written for Sahayak. They are not copied from any question bank, sample paper, guide or website. Only well known textbook facts are used.
- Social Science: three skills were skipped because their chapters are deleted from the board syllabus or are project-work only: Democracy and Diversity, Challenges to Democracy, Consumer Rights. Check the current CBSE circular.

## Important finding about Computer Applications
The 21 questions already in the app cover Boolean logic, spreadsheets, mail merge, algorithms and flowcharts. Those topics are NOT in the 2026-27 syllabus summaries (which list only Networking, HTML and Cyber Ethics, plus practicals). They were left in place, because removing live content is the founder's call. Recommended: a Computer Applications teacher confirms the syllabus, then the five off-syllabus chapters (Boolean Logic, Productivity Tools, Algorithmic Thinking and parts of the older Networking/Internet chapters) are hidden or removed.

## Status of every new question
`needs_review` (loaded that way by `seed-diagnostic.js` because all three subjects are Pilot). They are not teacher-verified, and they are not approved by CBSE. A subject teacher must read each question and answer and set it to `verified` or `rejected` (Table Editor, or `/admin/quality`). English literature points are the most important to check (details of the stories and poems).

## How to load (founder, not done by Claude)
1. `node packages/db/seed.js` (adds the 3 new Computer Applications chapters; safe to repeat).
2. `node packages/db/seed-diagnostic.js` (adds the 218 questions; skips ones already loaded; safe to repeat).
3. Students will see these questions in the Pilot subjects (marked Pilot). They stay in needs_review until a teacher verifies them.

## Not done
- Short-answer and written questions (only MCQ added).
- Figures (images) and Hindi-script questions.
- Hindi, Maths and Science growth.
- Any teacher review.
