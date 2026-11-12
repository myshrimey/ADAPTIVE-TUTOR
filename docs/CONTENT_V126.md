# Computer Applications: 1,076 more questions (v126, 2026-11-12)

Founder request: "Add 1000+ questions covering each skill in computer application". 1,076 new multiple-choice questions, all `needs_review`, original wording, covering all 38 skills (27 to 30 new questions per skill). Computer Applications now has about 1,250 questions in the seed files (172 before).

Files: `packages/db/seed/cbse-class10-computer-applications-v126a..f-diagnostic.json` (six files, one per writing batch). Helper: `packages/db/seed-generators/v126_finalize.py`. Test: t126.

Difficulty mix: 138 easy (1), 222 (2), 446 medium (3), 193 (4), 77 hard (5). Medium is the biggest group; hard questions are fewer than asked for.

How they were made: six parallel helper agents wrote the questions per group of skills (three of them were interrupted by usage limits and re-run). Boolean truth tables, equivalences and cell-reference copying were computed in Python; spreadsheet results, HTML/CSS snippets and facts were checked by reading, not by running a browser or spreadsheet. The finalize script rejects exact repeated prompts only; 13 pairs in De Morgan are deliberate variations of one rule with different expressions.

What a teacher should look at first:
- Old HTML attributes (bgcolor, align, border, cellspacing, font) used in some questions: they match the usual Class 10 style but are deprecated in HTML5.
- Link colours (blue/purple) describe browser defaults.
- Spreadsheet and mail-merge steps follow Microsoft Office names.
- Some wrong options in mobile technologies are plain or odd ("2G only voice").
- One rowspan question is slightly open about what the rest of the row contains.
- Some questions in a skill test closely related facts; near-repeats are possible beyond the 13 De Morgan pairs.

Founder step after deploying: `node packages/db/seed-diagnostic.js` (safe to re-run).
