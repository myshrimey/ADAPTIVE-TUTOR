# What is left, ranked (v109, 2026-11-08)

Built from the registry rows (prompts 0001 to 0003 now have requirement rows) and the task backlog. "Ready for testing" is NOT counted as finished: nothing here is proven on the live site or with real families. Rank = how much it protects the product or children's data first, then how much it moves learning and revenue.

## A. Claude can build now (no one else needed). In this order
1. Forgot-password through a server route with the same limits as sign-in (today the browser talks to Supabase directly, which skips our limits). Security.
2. Scan the signed-in pages for sideways scrolling on phones (v107 only checked public pages). Quality.
3. Undo notes for the migrations before 0055 (rollback rule R42; today 0055 onward are covered).
4. Interleaving engine, visual learning, error intelligence, learning orchestrator, one student model (rows LR-01, 03, 04, 05, 08, 13). Learning value, but each needs a small design written first so it does not break existing rules.
5. A real-journey test script that the founder can run on the live site (LR-31 asks for a live test of every journey; Claude can write the script and checklist, only you can run it against the live site).

## B. Needs you (the founder)
1. Deploy v102 to v109 together after a backup, then run the checks. Nothing built since v95 has been seen live.
2. Switch on leaked-password protection in Supabase; remove the public file "ERROR_MISTAKE 16 OCOBER 2026.docx".
3. Teaching in front of an AI ("Teach Sahayak" mode, LR-16) and voice (LR-17): each needs a cost and provider decision from you.
4. Teacher payment (docs/TEACHER_PAYMENT_PROPOSAL.md), the landing-page content (example dashboards, founder section), the official CBSE blueprint, the Rs 4,999 versus Rs 14,999 question.
5. Real phones: install button, header, feedback pictures, forgot-password.

## C. Needs teachers
1. Review of the ~420 new questions (v104, v105) and the earlier AI-written ones; quality gates for every subject (no subject has passed any gate).
2. A Hindi teacher to check Hindi wording and grow Hindi questions.
3. Written-answer marks checked by teachers (needed before the readiness dimensions can be combined, V3-09).

## D. Needs the professional legal review (D7)
View As and activity tracking (R24 to R26, R30 to R36), retention of feedback pictures, pictures in the data export, any AI reading of screenshots, consent wording for handwriting photos, the legal pages, and what must be kept when a family deletes data.

## E. Not worth doing yet
Next.js 16 / jsPDF 4 upgrades (nothing reachable today; see docs/DEPENDENCY_SECURITY.md), automatic Excel tracker update (CSV exports are enough), international checkout.
