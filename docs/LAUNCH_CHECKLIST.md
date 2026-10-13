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

## Narrower pilot, if a gate fails
If any Security or Payment gate fails, do not accept payments yet — the rest of the product can still be used for a free, unpaid trial with a small number of families while that gate is fixed.
