# v105 question bank growth: Maths and Science

Written 2026-11-04. Follows v104 (Computer Applications, English, Social Science). Says what was added, where it came from, and what it is NOT.

## What was added (203 questions)
| Subject | New | Notes |
|---|---|---|
| Mathematics | 139 | 55 warm-up (difficulty 1) and 84 harder multi-step (difficulty 4) over 45 skills in all 14 chapters. These are the two levels the bank lacked: it had 92 and 4 of 1,112. |
| Science | 64 | 3 chapters the app did not have (Heredity, The Human Eye and the Colourful World, Our Environment: 8 new skills, 40 questions) plus 24 for the thinnest existing skills (respiration, reflex arc, plant hormones, covalent bonds, right-hand thumb rule). |

## Where it came from
- Syllabus: public 2026-27 syllabus summaries (Science units and chapters confirmed on cbseguidanceweb; Maths chapters already matched). Not the official PDF, which could not be opened from here.
- Questions are written for Sahayak, not copied from any website, guide or sample paper.
- Maths: every answer is computed by program code and checked by a second, independent method (sympy / counting) when the file is generated, and 40+ are re-computed again in the test in a different language (t105). Correct arithmetic does not make a question good: a teacher should still check wording and level.
- Science: written by hand from standard textbook facts.

## IMPORTANT: status and safety
Maths and Science are `ready` subjects. The loader used to give every new question there the status `verified`. In v105 the loader was changed so each question can state its own status, and every v105 question says `needs_review`. They are NOT teacher-verified and NOT approved by CBSE. Pilot or not, needs_review questions are still shown to students in this app (only `rejected` ones are hidden). That is your decision: if you do not want unreviewed questions in the two paid subjects yet, do not run the loader step until a teacher has looked, or set them to `rejected`/review first in Supabase.

## How to load (founder, not done by Claude)
1. `node packages/db/seed.js` (adds the 3 new Science chapters; safe to repeat).
2. `node packages/db/seed-diagnostic.js` (adds the 203 questions; skips ones already loaded; safe to repeat).
3. Ask a Maths teacher and a Science teacher to read their questions and set each to `verified` or `rejected` (`/admin/reviews` or Supabase Table Editor).

## Not done
- Short-answer / written questions for Science, diagrams and figures, numerical Science items (Ohm's law, lens and mirror already have 150+ each).
- Other Maths topics with no skill yet (for example Thales' theorem, area of a triangle by coordinates, trigonometric heights at 30 degrees). They need new skills and are a separate piece of work.
- Hindi growth (needs a Hindi teacher).
- Any teacher review.
