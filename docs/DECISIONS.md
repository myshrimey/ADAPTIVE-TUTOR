# Decisions

Key product/technical decisions, alternatives considered, and why. Decisions marked **NEEDS FOUNDER APPROVAL** must not be published/activated until the founder explicitly confirms.

---

### RLS fix for explanation caching (2026-10-12)
**Decision:** Add an explicit `for update ... using (true) with check (true)` policy, scoped to `authenticated` only, on `diagnostic_questions` and `questions`.
**Alternative considered:** Switch the write-through cache to use the service-role client instead of the session client.
**Why this way:** The explanation text is shared, non-private content (every student reads the same question bank) — it already has an open-to-all-authenticated SELECT policy, so an equally open UPDATE policy doesn't create a new privacy or security exposure, and it's a one-line, fully reversible change. Switching to a service-role client would also work but is a larger code change (new client wiring inside `packages/core`) for no extra safety benefit here.

### Payment: offline UPI/QR only, no embedded QR code (2026-10-12)
**Decision:** The app shows the pilot offer, price, and a "contact the founder for payment details" step; it does not display or generate any UPI ID or QR code itself.
**Why:** The founder stated he will share the UPI ID/QR directly with each parent himself. This also avoids ever needing to put real payment details into a file that gets committed to git or deployed to a public URL, which is safer by default.
**NEEDS FOUNDER APPROVAL:** none at this layer (no payment details are embedded) — but the admin "mark as confirmed" workflow and its exact wording should be reviewed once built.

### Payment confirmation: manual admin workflow, reusing `/admin/feedback`'s pattern (2026-10-12)
**Decision:** A new `/admin/payments` page, gated the same way `/admin/feedback` already is (an `ADMIN_EMAILS` environment variable, compared against the signed-in user's email) — not a new, separate auth system.
**Alternative considered:** A fully separate admin-role table/column.
**Why:** Smallest safe change; the existing pattern is already live and understood. A payment can only ever be marked "confirmed" by a signed-in user whose email is in `ADMIN_EMAILS` — an ordinary student/parent account can never do this, enforced both in the UI and by an RLS policy on the payments table itself (defense in depth).

### Language: dictionary + toggle, not routed locale paths (2026-10-12)
**Decision:** A single `packages/core/i18n/` dictionary (English + Hindi key-value pairs) plus a lightweight `LanguageProvider`/cookie, rather than Next.js's built-in i18n routing (`/en/...`, `/hi/...`).
**Why:** Routed locales would touch nearly every route and link in the app — a much larger change than the brief's "use the existing architecture and lightweight translation resources" asks for. A dictionary + cookie covers every required surface (nav, dashboard, diagnostic, messages, legal pages, footer) without restructuring routes.
**Explicit non-goal (per brief):** the question bank itself is not translated. Any question shown is labeled as English-only.

### Founder attribution wording — **NEEDS FOUNDER APPROVAL**
**Decision so far:** Use a configurable single source (`packages/core/branding/founder.ts`) for the footer line, so it's never hand-edited per page. Draft wording (not yet published anywhere): "Sahayak | Built by Dr. Arvind Tiwari, Founder & Product Builder." The founder asked that the surrounding tone read as trustworthy, authentic, authoritative, and academic — the exact draft is in `docs/RESUME_HERE.md` for his review. LinkedIn could not be independently accessed/verified from this environment, so no credential or institutional claim beyond what the founder states directly should be added.

### Legal pages are drafts, not final (ongoing) — **NEEDS FOUNDER APPROVAL**
Terms, Privacy, Pilot Limitations, and the Payment/Refund policy are being drafted as honest, practical starting points matching only what the product actually does today. They use placeholders for contact details/registered address and must be reviewed (ideally by a lawyer, at least by the founder) before being treated as final.

### Diagnostic-save symptom — still open
No schema/RLS/code change has been made for this because none of the confirmed evidence points to a specific bug yet. Changing something speculatively here risks masking the real cause or introducing a new one. See `PROJECT_CONTEXT.md` and `docs/RESUME_HERE.md`.
