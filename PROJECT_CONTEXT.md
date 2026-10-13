# Sahayak — Project Context

_Last updated: 2026-10-12. Keep this file current — it's the first thing a new Claude session (or a new developer) should read._

## Purpose
Sahayak is an adaptive, 1-to-1 AI tutor for CBSE Class 10 students, currently covering Mathematics and Science (Social Science is paused). It diagnoses a student's level, then adapts the teaching path and difficulty per student rather than giving everyone the same fixed course.

## Target customer
Parents of CBSE Class 10 students who want extra Maths/Science practice for their child. Initial pilot: a small, controlled, paid early-access group ("founding families"), not a general public launch yet.

## Business objective
Validate, with real paying families, that:
1. Students can use the product reliably.
2. Students return to use it again.
3. Parents understand its value.
4. Some real families are willing to pay.
5. The founder can support early customers without spending money on extra tools.

Compliments and free sign-ups are not evidence of paying demand — only actual confirmed payments count.

## Current stack
- Next.js (App Router) — `apps/web`
- Supabase (Postgres database, authentication, storage) — RLS (row-level security) enforced in the database itself
- Vercel — hosting and deployment, connected to GitHub
- Gemini (primary) + Groq (fallback) — AI explanations and tutoring chat
- All free-tier; no paid infrastructure yet

## Existing verified features (confirmed by direct code reading, not assumption)
- Sign-in / sign-up, onboarding (subject goal selection)
- Diagnostic test (adaptive, ~8–15 questions, prerequisite-check insertion on a miss)
- Adaptive learning sessions with an AI tutor, plus a post-session 5-question quiz
- Progress and Dashboard pages (skill-by-skill mastery, recent sessions)
- Student profile page (school/family details, class 6–9 academic history) — for the team's own understanding of users, not fed into tutoring logic
- Previous-year question papers library (student-contributed, shared, public-read)
- In-app feedback widget

## Known bugs
- **Fixed, not yet deployed (migration `0008_explanation_update_policy.sql`):** `diagnostic_questions` / `questions` had a SELECT-only RLS policy, so the AI-explanation write-through cache has been silently failing since v26 (caught by try/catch, only server-logged). Fix: add an UPDATE policy on both tables.
- **Unconfirmed, under investigation:** the founder has reported "diagnostic results do not appear to save into progress correctly." A full code-level read of the save path (start → answer → finalize → `mastery_states` upsert) and the relevant RLS policies did not reveal an obvious bug — the policies look permissive enough for these writes to succeed. Not yet reproduced against live data. Needs either a precise repro description or a read-only check against the real database.

## Product constraints
- Non-programmer founder — every deployment step must be plain, numbered, non-technical English.
- Free-tier only: Claude, Vercel, Supabase, GitHub. Avoid paid services and unnecessary dependencies.
- Small, verifiable steps — no large rewrites, no new framework/database.

## Pricing hypothesis (not yet validated)
₹199 per family for a 30-day founding-family early-access pilot. No auto-renewal. No guaranteed exam results. Considering ₹299/month later only if real usage and willingness-to-pay justify it.

## Payment method
Offline/manual UPI or QR only for this MVP — no Razorpay, no automated gateway. The founder shares the UPI ID / QR code with parents directly (outside the app). The app's job: show the pilot offer, collect a payment-confirmation form, mark it "pending verification," and let the founder manually confirm it via a simple, secure, authenticated admin workflow. A payment can never be self-confirmed by the parent/student.

## Language requirements
English + Hindi for the full core journey (nav, dashboard, sign-in/up, diagnostic, learning nav, messages, progress, parent summary, pilot offer, payment, legal pages, footer). The question bank itself stays English-only for now, clearly labeled — translating 1000+ questions is explicitly out of scope for this 10-day MVP.

## Founder attribution status
Founder: Dr. Arvind Tiwari. Preferred provisional title: "Founder & Product Builder, Sahayak." Exact footer wording and any credentials/bio beyond name + title require the founder's explicit approval before publishing — his LinkedIn profile could not be independently verified from this environment, so nothing beyond what he states directly should be claimed.

## Security constraints
- RLS enforced on every student-owned table; verified via code read that policies trace ownership through `users.auth_user_id -> users.id -> students.user_id -> students.id`.
- Service-role (admin) key never used in browser-facing code.
- `feedback` and `previous_papers` intentionally allow anonymous/open inserts by design (not a bug) — documented in their migrations.
- No destructive production SQL without the founder's explicit approval and a stated rollback plan.
- Minimum necessary child data only.

## Current launch readiness
Pre-pilot. Core learning flow works; diagnostic-save symptom unconfirmed; Hindi, legal pages, payment flow, and founder-approved attribution are being built now (see `docs/RESUME_HERE.md` for exact status).
