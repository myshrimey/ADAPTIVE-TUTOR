# Launch Checklist

Matches the brief's Section 15 release gates. Do not accept real paid pilot customers until every box that applies is checked, based on real verification, not generated code.

## Reliability
- [ ] A student can sign in and complete the full supported learning flow (diagnostic → learning session → progress).
- [ ] Diagnostic results and answers persist correctly (symptom from Section 7 confirmed fixed, or confirmed to not actually be a bug).
- [ ] Learning history survives refresh and re-login.
- [ ] Progress is calculated and labeled accurately (dashboard and Progress page agree with each other).

## Security
- [ ] Cross-user private data access tested live and denied (two real accounts, not just a code read).
- [ ] No service-role/secret key anywhere in browser-facing code (spot-checked).
- [ ] `feedback`/`previous_papers` open-insert design reviewed and still intentional.

## English/Hindi
- [ ] Core journey (nav, sign-in/up, onboarding, diagnostic instructions, learning nav, messages, progress, pilot offer, payment, legal pages, footer) tested in both languages.
- [ ] No broken/untranslated text in that core journey.
- [ ] Question content is clearly labeled as English-only where it hasn't been translated.

## Payment confirmation
- [ ] UPI ID / QR actually confirmed and in the founder's own hands (never generated or guessed by the app).
- [ ] A student/parent cannot self-confirm their own payment (verified live, not just by reading the RLS policy).
- [ ] Admin confirm/reject workflow tested end to end at `/admin/payments`.

## Legal pages
- [ ] Terms, Privacy, Pilot Limitations, and Payment Policy reviewed by the founder (and ideally a lawyer) and approved for publication.
- [ ] No fabricated address, registration number, or compliance claim present.

## Founder attribution
- [ ] Exact wording approved by the founder.
- [ ] No unverified credential or claim present.

## Deployment
- [ ] Production build verified clean.
- [ ] Live URL smoke-tested using the checklist in `docs/DEPLOYMENT_GUIDE.md`.
- [ ] Rollback steps confirmed to work (know how to "Promote to Production" an older deployment in Vercel).

## Customer/pilot readiness
- [ ] A parent can clearly see what the pilot includes and its limitations before paying.
- [ ] Outstanding known limitations are documented and, where relevant, visible to the customer (Pilot Limitations page).

## v34 additions (Complete Board Preparation)
- [ ] Migration 0013 applied in Supabase; `select slug, status from subjects` shows maths/science = ready, the other four = pilot.
- [ ] Founder confirmed the ₹999 price and the 240-day access length (or changed `BOARD_PREP_OFFER`).
- [ ] Refund/cancellation wording written and approved (currently "handled individually").
- [ ] Sign-up with several subjects works; `/subjects` can add one later; coming-soon subjects can't be added.
- [ ] A new-subject diagnostic (English, Hindi, Computer Applications, Social Science) runs start to finish and the result persists after refresh.
- [ ] Check-in appears before a learning session, can be skipped, and the "how confident now" prompt saves after the session; `/report` shows a confidence trend after a few sessions.
- [ ] Two-account test also covers `session_checkins` (Student B cannot see Student A's check-ins).
- [ ] A teacher has looked at a sample of the pilot-subject questions (see `docs/CONTENT_STATUS.md`) before pilot subjects are promoted or promised in marketing.
- [ ] Decide whether paid access should be enforced (today nothing blocks a non-paying signed-in student).

## v35 additions (Maths levels, mocks, readiness, FAQ, animations)
- [ ] Migrations 0014 and 0015 applied; `select slug, name, status from subjects` shows `maths` = "Mathematics (Standard)" (ready) and `maths-basic` (pilot).
- [ ] A teacher confirms Basic's chapter list and difficulty cap are right for the real CBSE Basic paper before Basic is promoted or promised.
- [ ] Sign-up shows both Maths levels and ticking one unticks the other; a Basic diagnostic and learning session never show a hard (4-5) question.
- [ ] A timed mock runs start to finish: countdown, answers survive a page refresh, submit and auto-submit both give a result with a chapter breakdown; a second mock can be started afterwards.
- [ ] Two-account test also covers `mock_exams` (Student B cannot read or change Student A's mock).
- [ ] `/report` shows a preparation level for each subject with reasons and a next step, and the "not a prediction" wording; the WhatsApp share text includes it.
- [ ] Founder reviewed the readiness thresholds and the FAQ wording (data handling, refunds, access length).
- [ ] Animations checked once on a phone, and once with the device's "reduce motion" setting on (motion should stop).

## Narrower pilot, if a gate fails
If any Security or Payment gate fails, do not accept payments yet — the rest of the product can still be used for a free, unpaid trial with a small number of families while that gate is fixed.
