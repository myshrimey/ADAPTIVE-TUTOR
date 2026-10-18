# Master prompt v3 (Oct 2026): requirement map

Written 2026-10-17 for v42. Method: each v3 section compared with the code and schema in this repository. "Built" means present and built clean; nothing here is proven with real families yet.

Question the founder asked: "has everything from MVP v2 been built?" Answer: all of it except Hindi Course A vs B, true animated diagrams and automatic teacher pay (`docs/MASTER_PROMPT_COVERAGE.md`).

## Already built before v42
| v3 section | What exists |
|---|---|
| 4-5, 41 principles, privacy basics | Evidence-first wording, no diagnosing, RLS owner pattern, server-only secrets, minors' data not public |
| 8 offline payment | `/pilot` claim form, `/admin/payments` (reference, verified, dates, notes), `/admin/students` (create student, plan, subjects, expiry) |
| 9, 10 board, subjects, status | CBSE Class 10 fixed; registered subjects limited by plan; subject status ready / pilot / in development / coming soon from the database |
| 11 language | English and Hindi interface; questions mostly English (stated on the site; not claimed as bilingual) |
| 12-14 diagnostic and learning persistence | Stored per attempt, answer, skill; sessions, hints, time, mastery stored (migration 0018 adds timing) |
| 15-16 check-in, confidence trend | Five-question check-in; last / 7-day / 30-day / direction; confidence vs performance note |
| 17, 29 parent dashboard and report | `/report`, parent link, WhatsApp text, 30-day change, subject matrix, engagement; "insufficient evidence" is a real answer |
| 18 board readiness | Bands with reasons and evidence coverage; not a prediction |
| 22 question metadata | Columns for marks, expected time, cognitive level, language (empty until people set them) |
| 32-33 trust, founder, legal | `/trust`, `/about`, terms, privacy, refund (draft), payment policy, scope and limits; founder name in footer |
| 40 quality gates | `/admin/quality` ten gates, founder sign-off |

## Built in v42
| v3 section | What |
|---|---|
| 7 Founding Family offer | Plan `founding_family` (Rs 4,999, 5 subjects, till 31 Mar 2027), real 50-place counter on `/pilot`, one switch (`FOUNDING_FAMILY.enabled`) in `plans.ts`; price is a test value, not permanent |
| 26 empirical difficulty | `/admin/questions`: answers, % correct, average time, hint use, written vs observed difficulty; judged only after 20 answers |
| 28 dynamic study plan | `/plan`: weekly minutes split by priority, prerequisite repair first, mock added when due, stage by days left; rebuilt each visit |
| 30-31 landing proposition | Hero now "How ready is your child for CBSE Class X 2027?" with the three promises and the Assess to Improve line |
| 37-39 funnel and economics | `/admin/funnel`: funnel from real data, revenue, AI cost, teacher cost, gross margin (blank when no revenue); CSV downloads for Google Sheets (funnel, students, sales, product, economics) |
| 44 project memory | `/SAHAYAK_PROJECT_MEMORY.md` |

## Not built yet (and why)
| v3 section | Status | What it needs |
|---|---|---|
| 19-21 handwritten mock: print paper, photo upload, vision reading, AI marking, confidence, teacher review queue, AI-vs-teacher agreement | BUILT v46 (upload, quality check, AI marking, teacher queue, agreement table); NOT proven: no real photos or AI image reading tested yet | Test on about 20 real answer sheets; lawyer check of consent wording |
| 22-25 full blueprint-driven CBSE mock, PDF paper, Challenge Mode | BUILT v46: planning blueprints (Maths, Science, Social Science), Challenge Mode, print / Save-as-PDF paper; papers are PARTIAL until the bank has 3/4/5-mark questions | Official CBSE blueprint numbers per subject (from sample papers) and teacher-set marks |
| 18 readiness dimensions 6, 8, 9, 10 (retention, question-type coverage, written-answer quality, recurring error patterns) | Partly shown separately; not combined | Written-answer marks checked by teachers first |
| 31 landing sections: example readiness dashboard, example mock analysis, "complements school/tuition", founder section | Partly (sample report, FAQ, pricing, trust exist) | Content from founder |
| 34-36 marketing scripts and content calendar | Not code | Claude can draft on request |
| 41 export and delete a student's data | BUILT v44: `/my-data`, `/admin/data-requests` | Founder to agree what must be kept (e.g. payment records) with an accountant/lawyer |
| Hindi Course A vs B; animated diagrams; automatic teacher pay | NOT BUILT | Course content; topic choice; your payment decision |

## Decisions needed before the handwritten mock (cost, privacy, legal)
1. Photos of a child's handwriting are personal data of a minor. They would be kept in Supabase Storage (free tier: about 1 GB) and shown only to the family, the founder and reviewing teachers. Do you accept this, and will the consent line be shown to parents at sign-up?
2. Reading handwriting needs an AI that can see images. Gemini's free tier can; accuracy on handwritten maths is unknown until tested on real sheets and the free daily limit may stop many uploads. Start with a test of 20 real sheets before promising anything to parents?
3. How many photos per mock page are allowed, and how long are photos kept (suggestion: delete 90 days after the exam date)?

## Added v45
Self sign-up (username, optional email, parent/guardian consent, abuse limits) - built. Forgot-password works only for accounts with an email; others contact the founder (admin reset exists).
