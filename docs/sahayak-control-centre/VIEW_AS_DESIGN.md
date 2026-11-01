# View Account As Admin: design study and threat model (TASK-034)
Date: 2026-11-01. Status: DESIGN ONLY. Nothing in this file is built. Decision D2 (approach) was settled on the founder's instruction of 2026-11-01 ("complete all the D's"): build in steps, read-only, never a login session as another person. The founder can change it.

## 1. What the founder asked for (SAH-PROMPT-0009, part 5)
An admin should be able to see the app the way one account sees it, to find problems, without knowing the password, without a shared credential, and without being able to change anything by accident. Every use must be recorded.

## 2. Why the obvious way is rejected
The obvious way is to mint a login session for that person (a "magic link" or service-key session). Rejected, because:
- It makes the admin indistinguishable from the family in every log, payment and consent record.
- Any click then writes as the child (answers, marks, sharing codes, deletion requests, payments).
- A leaked or replayed link is a skeleton key to a child's account.
- It breaks the founder's own rule (no impersonation, no shared credentials).

## 3. Chosen approach (in three steps)
**Step 1 (built in v92):** read-only masked account snapshot. Gives plan, access, links, subjects, last activity, a timeline. No pages are rendered "as" the account.

**Step 2 (design here, NOT built): server-side "view context" for a short list of pages.** The admin keeps their OWN session. A signed, short-lived (15 minutes) "view ticket" names exactly one target account and one page group. A small set of read-only admin copies of the pages (for example student dashboard, progress, reports, subjects) load that account's data on the server with the service client, using the same query functions the real pages use, and render with a fixed banner ("Viewing account 1a2b3c4d as admin. Read only. Exit."). Nothing on those pages posts anything.

**Step 3 (only if step 2 proves useful):** per-page extension, still read only.
"Test mode" (writes allowed) is NOT part of this design. If ever wanted it uses dedicated test accounts only (TASK-037), never a real family.

## 4. Controls that step 2 must have (each becomes a test)
1. Super Admin only (ADMIN_EMAILS). No team permission opens it until the founder says so (D6).
2. Target is chosen from the account directory; the ticket stores admin email, target user id, page group, expiry and a random id; signed with a server secret; verified on every request; one target per ticket.
3. Read only by construction: the view pages call only `select` helpers; there are no forms, no `fetch`, no server actions. A static test scans the view folder for `.insert(`, `.update(`, `.delete(`, `.upsert(`, `method="post"` and `fetch(` (same technique as t92).
4. All write APIs stay as they are: they authenticate the real session. The admin's session is not the target's, so the target's write APIs refuse the admin automatically. A test calls each student write API with an admin session and a target id and expects refusal.
5. Banner and exit on every view page, not removable by the page content.
6. Expiry: 15 minutes, no refresh; a new view needs a new, audited ticket.
7. Audit: `account.view_as_start` (admin, target, page group, reason), `account.view_as_page` per page opened, `account.view_as_end`. Reason is required before a ticket is issued (a short text, kept in the audit trail).
8. Masking carries over: no password, token, key, IP address or browser string; contact details of the child are not shown on pages that do not need them.
9. A child's data about other children is never loaded: every query is scoped by the target student id, re-derived on the server from the target user id, never from the address.
10. Rate limit: at most 20 tickets per admin per hour.
11. The target is never notified by the product today. Whether families must be told that staff can view their account is a privacy-notice question for the professional review (D7).

## 5. Threats and how the design answers them
| Threat | Answer |
|---|---|
| Admin account stolen, attacker views children | Same as today for any admin page: ADMIN_EMAILS + sign-in. View As adds an audit line with a reason and short expiry, so misuse is visible. Leaked-password protection and a strong admin password stay the founder's job. |
| Ticket stolen or replayed | Signed, bound to the admin's session email, 15 minutes, single target; verified server side. |
| Page accidentally writes as the child | The admin session is not the child's, so real write APIs refuse; the view pages contain no write path (static test). |
| Admin sees more than needed | Page group list is short and fixed; contact details and other children are excluded. |
| Data leaks through logs or caches | View pages set `cache-control: no-store`; audit lines carry ids, never content. |
| Insider misuse unnoticed | Append-only audit trail (v91) with reason; Audit log page filters by target account. |
| Legal exposure | Children's data: viewing is processing. Needs the professional review (D7) before step 2 is built. |

## 6. What step 2 would cost
Size XL in the backlog (TASK-035). Roughly: ticket module and tests (S), read-only view layout and banner (S), four page groups (M each, because each real page mixes reading and writing code and would need a read-only copy), tests (M). Not started. It is deliberately NOT started in v94: it needs the founder's explicit go and, for children's data, the D7 review first.

## 7. Open questions for the founder or the professional
1. Must families be told that staff may view their account? (D7)
2. Which pages matter most? Recommendation: student dashboard, progress, reports. Everything else stays as the masked snapshot.
3. Should a team member (not the founder) ever use it? Recommendation: no.
