# Content Status

What each subject actually contains, how far it has been checked, and what Sahayak may claim about it. Update this file whenever a subject's status or review state changes. The `subjects.status` column in the database is the source of truth the app reads; this file explains it.

## What the labels mean
- **Ready** — the question bank is large, has been used by real students, and nothing wrong has been reported. It has **not** been independently reviewed by a subject teacher against the official CBSE marking scheme. ("Ready" means "fit for the paid promise so far", not "teacher-certified".)
- **Pilot** — works end to end (diagnostic, learning, quiz, report) but the questions and answer keys are AI-written and not yet reviewed by a person. Shown to students/parents with a "Pilot" tag.
- **In development / Coming soon** — listed at most; cannot be registered or tested.
- Per-question `content_status`: **verified** (a person checked it), **needs_review** (default for anything AI-generated or in a non-ready subject), **rejected** (never served again).

## Per-subject state (as of 2026-10-15, v34 — not yet deployed)
| Subject | App status | Curriculum | Diagnostic bank | Review state |
|---|---|---|---|---|
| Mathematics (Standard) | ready | 14 chapters, 41 skills | ~1000+ questions | Curated earlier; no teacher review on record |
| Mathematics (Basic) | pilot | same chapters/skills as Standard (cloned) | Standard's difficulty 1-3 questions copied; AI top-up capped at 3 | needs_review; teacher should confirm scope vs the real CBSE Basic paper |
| Science | ready | 10 chapters, 18 skills | ~900+ questions | Curated earlier; no teacher review on record |
| Social Science | pilot | 24 chapters (seeded earlier) | thin | needs_review |
| English Language & Literature | pilot | 8 chapters, 21 skills | 21 (1 per skill) | AI-written; needs_review |
| Hindi Course A | pilot | 8 chapters, 20 skills | 20 (1 per skill) | AI-written; needs_review. Questions are in Latin script/English only |
| Computer Applications | pilot | 8 chapters, 21 skills | 21 (1 per skill) | AI-written; chapter list follows a general brief, **not a checked copy of the official CBSE syllabus** |

Depth beyond those starter questions comes from the generate-and-persist mechanism (v32/v33): AI-generated questions are saved as `needs_review`.

## Known limitations / things a teacher should look at first
- Hindi: the "Kanyadaan" poem question tests a general reading rather than a specific fact; Lekhan (formal letter / notice) questions are general rather than tied to a specific marking rule.
- Computer Applications: verify the chapter list against the current official CBSE Class 10 syllabus (cbseacademic.nic.in) before calling it anything beyond pilot.
- English: only one `short_answer` question exists; the rest are MCQ. Written-answer quality is not assessed anywhere yet.
- Hindi Course A vs B is **not** a separate course yet. Mathematics Basic exists (v35) but is a derived, Pilot copy of Standard at lower difficulty.
- Timed mock exams (v35) are objective-style practice papers drawn from the question bank — not a board-style paper (no long answer / case study sections).

## Promotion checklist (pilot → ready)
Follow master-prompt quality gates 1–10: official syllabus mapped; a teacher reviews questions and answer keys (flip rows to `verified`, reject bad ones); diagnostic produces sensible results on real students; results persist across refresh/logout; mastery updates correctly; parent report matches database evidence; two-account privacy test passes; a parent and student finish the flow unaided; no critical errors. Then `update subjects set status = 'ready' where slug = '...'`.

## How to review in Supabase (no code)
Table Editor → `diagnostic_questions` (or `questions`) → filter `content_status` = `needs_review` → read prompt/answer/explanation → set `content_status` to `verified` or `rejected`.
