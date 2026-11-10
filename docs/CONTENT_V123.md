# French content (v123, 2026-11-10)

French (Class X) is a new **pilot** subject. The question bank is written by Claude for Sahayak. It is **not** reviewed by a French teacher and nothing was seen live.

## Sources used
- CBSE Class X French (code 018) 2026-27 syllabus (the attached PDF): the planning follows its units: reading comprehension, writing, grammar, and the cultural content of the textbook.
- *Entre Jeunes* Class X textbook (attached text): lessons 2-8 and 10 are used for the culture chapters and the vocabulary. Lessons 1 and 9 are not in the 2026-27 list and are not covered. Questions are original; no textbook sentence, exercise or passage is copied.

## What was added
- Curriculum `packages/db/seed/cbse-class10-french.json`: 19 chapters, 71 skills (9 grammar chapters, reading comprehension, writing tasks, 8 culture chapters).
- Question files: `cbse-class10-french-diagnostic.json` (71, one per skill, the easiest) and `cbse-class10-french-v123-diagnostic.json` (285). Total 356 (355 multiple choice, 1 short answer), all `needs_review`.
- Verb answer keys (tenses, imperative, subjunctive) were computed with the rule-based conjugator `verbecc`, not typed from memory; every other question was written by hand and spell-checked with a French word list.
- Typing: answers with accents use a French letters keypad (é è ê ë à â ç î ï ô ù û œ and the apostrophe). Grading is strict about accents (a missing accent is wrong) but accepts a curly apostrophe and decomposed accents.
- French is left out of Hindi-medium translation, uses the language family of misconception tags, has a blueprint `french-planning-v1` (50 marks planning shape; objective practice only) and an icon on the home list.

## What this does NOT do
- Writing tasks (letter, message, dialogue) are practised through objective questions (format, phrases, order). Free writing cannot be marked automatically yet.
- No listening or speaking.
- Class IX French is not built.
- Questions are not teacher-verified. A French teacher should read the bank before it is promoted from pilot (the answer keys for the culture facts in particular).

## Founder steps after deploying
1. `node packages/db/seed.js` (adds the subject, chapters and skills; safe to re-run).
2. `node packages/db/seed-diagnostic.js` (adds the questions as needs_review; safe to re-run, it skips duplicates).
3. Have a French teacher review the questions. Until then the subject stays pilot.
