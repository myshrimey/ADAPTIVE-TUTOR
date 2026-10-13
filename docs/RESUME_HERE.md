# Resume Here

_This file is the single source of truth for "what's the exact current status." Read it first every session, update it last every session._

## Exact current status (2026-10-12)
A combined build (not yet deployed) covering most of the 10-day MVP brief in one pass, per the founder's explicit instruction to build everything first and deploy once. All of it has passed `npx tsc --noEmit` and a full `npm run build` (40 routes, clean) in the build environment. **None of it has been deployed to the live site or run against the real production database yet.**

## Last completed task
A full build pass covering:
- The confirmed explanation-caching RLS bug fix (migration 0008)
- Persistent project-memory docs (this set of files)
- English/Hindi language toggle + dictionary, wired into nav, footer, sign-in/sign-up, onboarding, dashboard, progress, diagnostic (question-bank label only), pilot offer, payment, legal pages, and contact
- Offline UPI/QR pilot offer page (`/pilot`), payment-confirmation form, and an admin-only confirm/reject workflow (`/admin/payments`), backed by a new `pilot_payments` table (migration 0009) that an ordinary user can never update
- A parent-facing progress report (`/report`) built only from real diagnostic/mastery data, with an explicit "not enough data yet" fallback rather than an invented score, plus a manual (non-API) WhatsApp share link
- Five legal/policy pages (Terms, Privacy, Pilot Limitations, Payment Policy, Contact), in English and Hindi, as drafts pending founder review
- A single configurable founder-attribution source, in the footer, with draft (not yet approved) wording

## Last verified working state
Build environment only: `npx tsc --noEmit -p apps/web/tsconfig.json` clean; `npm run build` clean (40 routes including `/pilot`, `/report`, `/admin/payments`, 5 legal pages, `/contact`). Not yet verified against the real Supabase project or the live Vercel deployment.

## Current blockers
1. **Diagnostic-save symptom still unconfirmed.** Needs either a precise repro description from the founder, or a read-only check against the live database. No fix has been attempted because no specific cause has been found.
2. **Founder attribution wording not yet finalized/approved** — draft is "Sahayak | Built by Dr. Arvind Tiwari, Founder & Product Builder." The founder asked for a trustworthy/authoritative/academic tone; this draft is restrained but doesn't add any unverified credential. Needs an explicit yes/edit from the founder before being considered final (it's already live in this delta's footer as the current default — flag if that's not wanted yet).
3. **Legal pages are drafts**, not reviewed by a lawyer, with placeholder-free but unconfirmed specifics (no fabricated address/registration number was added — Terms/Privacy simply don't state one). Founder should read these before they're treated as binding.
4. **No live test of cross-user privacy (Day 4)** has been done against the real database — this build relies on the RLS policies read/audited in migrations 0002 and 0009, not a live two-account test.
5. **Excel tracker** (`Sahayak_MVP_Success_Dashboard.xlsx`) was reviewed and had Day 1's row filled in; it still needs the founder's own day-to-day numbers.

## Next three tasks, in order
1. Founder deploys this combined delta (see `docs/DEPLOYMENT_GUIDE.md`) and runs the smoke-test checklist.
2. Founder does a real two-account privacy test (sign in as Student A, confirm Student B's data is never visible) and reports pass/fail.
3. Founder provides either a precise repro of the diagnostic-save symptom, or runs one read-only query so it can be confirmed or ruled out for good.

## Action needed from the founder
- Approve or edit the founder-attribution wording.
- Review the five legal/policy page drafts.
- Decide what to do about the diagnostic-save symptom (describe it precisely, or allow a read-only check).
- Run the deploy steps and the smoke test.

## Precise instruction for the next Claude session
Read this file, `PROJECT_CONTEXT.md`, and `docs/DECISIONS.md` first. If the founder reports the deploy succeeded, move to Day 4 (live cross-user privacy testing) and Day 7 (testing with real families) from the brief's 10-day order. If the founder reports a build/deploy error, fix only that error — don't start new features. If the founder gives a diagnostic-save repro, investigate that first, before anything else.
