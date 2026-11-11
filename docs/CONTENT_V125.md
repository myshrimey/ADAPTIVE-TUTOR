# More questions in every subject (v125, 2026-11-11)

503 new multiple-choice questions, all `needs_review`, written for Sahayak (not copied from any textbook or question bank). Founder request: "Add more questions in all subjects".

| Subject | New questions | Where they went |
|---|---|---|
| Hindi Course A | 116 | every one of the 32 skills (2 to 5 each) |
| Hindi Course B | 77 | every one of the 26 skills |
| Social Science | 120 | every on-syllabus skill (3 each plus a few extras; the three skipped skills still have none) |
| Computer Applications | 76 | 2 for every one of the 38 skills |
| English | 42 | 2 for every one of the 21 skills |
| Science | 42 | 3 each for 8 thinnest skills, 1 each for the other 18 |
| Maths (Standard) | 30 | 10 of the thinnest skills, 3 each; every answer and wrong option computed in code |

Files: `packages/db/seed/cbse-class10-<subject>-v125-diagnostic.json` (7 files). Helper: `packages/db/seed-generators/v125_finalize.py` (checks and writes them).

How they were made: written in parallel by helper agents from the curriculum files, then validated by the finalize script (real skill, 4 different options, no repeats of existing prompts, allowed tags, explanation present) and by test t125. Maths numbers were computed in Python and spot-checked by hand (15 of 30 re-worked, all correct). Nothing else was independently fact-checked.

Founder steps after deploying: run `node packages/db/seed-diagnostic.js` (safe to re-run; it skips repeats). Questions in `ready` subjects (Maths, Science) are still kept as needs_review by the loader.

Items the writers flagged as worth a teacher's look first: Madam Rides the Bus, The Thief's Story and Tricki (English literature details); Hindi lesson details (Netaji ka Chashma, Balgobin Bhagat, Mata ka Aanchal, Ek Kahani Yeh Bhi, Naubatkhana, Sanskriti, Surdas) and a few Hindi grammar labels; Social Science Rowlatt Act ("up to two years") and anti-defection (52nd Amendment, 1985); a few weak distractors in Social Science; the old `bgcolor` attribute in a Computer Applications HTML question.
